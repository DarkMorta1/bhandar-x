const { Purchase, Product, Stock, Supplier, StockLedger } = require('../models');
const { generatePurchaseNumber, paginate, createPaginationMeta } = require('../utils/helpers');

// Get all purchases
exports.getPurchases = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      paymentStatus,
      supplier,
      startDate,
      endDate
    } = req.query;

    const query = { organization: req.user.organization._id };

    if (search) {
      query.$or = [
        { purchaseNumber: { $regex: search, $options: 'i' } },
        { supplierName: { $regex: search, $options: 'i' } },
        { supplierInvoiceNumber: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (supplier) query.supplier = supplier;
    if (startDate || endDate) {
      query.purchaseDate = {};
      if (startDate) query.purchaseDate.$gte = new Date(startDate);
      if (endDate) query.purchaseDate.$lte = new Date(endDate);
    }

    const purchasesQuery = Purchase.find(query)
      .populate('supplier', 'name phone')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    const purchases = await paginate(purchasesQuery, parseInt(page), parseInt(limit));
    const total = await Purchase.countDocuments(query);

    res.json({
      success: true,
      data: {
        purchases,
        pagination: createPaginationMeta(total, parseInt(page), parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get single purchase
exports.getPurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findOne({
      _id: req.params.id,
      organization: req.user.organization._id
    })
      .populate('supplier', 'name phone email address gstNumber')
      .populate('items.product', 'name sku unit')
      .populate('createdBy', 'firstName lastName')
      .populate('receivedBy', 'firstName lastName')
      .populate('warehouse', 'name code');

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }

    res.json({
      success: true,
      data: { purchase }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create purchase
exports.createPurchase = async (req, res) => {
  const session = await require('mongoose').startSession();
  session.startTransaction();

  try {
    const {
      supplier,
      supplierInvoiceNumber,
      warehouseId,
      items,
      paymentMethod,
      notes,
      dueDate,
      shippingCharges = 0,
      otherCharges = 0
    } = req.body;

    // Validate supplier
    const supplierDoc = await Supplier.findOne({
      _id: supplier,
      organization: req.user.organization._id
    });

    if (!supplierDoc) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    // Validate warehouse
    const warehouse = await require('../models/Warehouse').findOne({
      _id: warehouseId,
      organization: req.user.organization._id
    });

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found'
      });
    }

    // Process items and calculate totals
    let subtotal = 0;
    let totalTax = 0;
    const processedItems = [];

    for (const item of items) {
      const product = await Product.findOne({
        _id: item.product,
        organization: req.user.organization._id
      });

      if (!product) {
        throw new Error(`Product not found: ${item.product}`);
      }

      const unitPrice = item.unitPrice || product.costPrice;
      const itemDiscount = (unitPrice * item.quantity * (item.discountPercent || 0)) / 100;
      const itemSubtotal = (unitPrice * item.quantity) - itemDiscount;
      const itemTax = (itemSubtotal * (item.taxPercent || product.taxRate || 0)) / 100;

      processedItems.push({
        product: item.product,
        productName: product.name,
        sku: product.sku,
        quantity: item.quantity,
        unit: product.unit,
        unitPrice,
        discountPercent: item.discountPercent || 0,
        discountAmount: itemDiscount,
        taxPercent: item.taxPercent || product.taxRate || 0,
        taxAmount: itemTax,
        totalAmount: itemSubtotal + itemTax,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
        manufacturingDate: item.manufacturingDate ? new Date(item.manufacturingDate) : null
      });

      subtotal += itemSubtotal;
      totalTax += itemTax;
    }

    const totalAmount = subtotal + totalTax + shippingCharges + otherCharges;

    // Create purchase record
    const purchase = await Purchase.create([{
      purchaseNumber: generatePurchaseNumber(req.user.organization._id),
      organization: req.user.organization._id,
      branch: warehouse.branch,
      warehouse: warehouseId,
      supplier,
      supplierName: supplierDoc.name,
      supplierInvoiceNumber,
      items: processedItems,
      subtotal,
      totalDiscount: 0,
      totalTax,
      shippingCharges,
      otherCharges,
      totalAmount,
      paymentStatus: paymentMethod === 'credit' ? 'unpaid' : 'paid',
      paymentMethod,
      paidAmount: paymentMethod === 'credit' ? 0 : totalAmount,
      balanceAmount: paymentMethod === 'credit' ? totalAmount : 0,
      dueDate: dueDate ? new Date(dueDate) : null,
      status: 'ordered',
      notes,
      createdBy: req.user._id,
      purchaseDate: new Date()
    }], { session });

    // Update supplier totals
    await Supplier.findByIdAndUpdate(supplier, {
      $inc: { totalPurchases: totalAmount }
    }, { session });

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: 'Purchase created successfully',
      data: { purchase: purchase[0] }
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    session.endSession();
  }
};

// Receive purchase (update stock)
exports.receivePurchase = async (req, res) => {
  const session = await require('mongoose').startSession();
  session.startTransaction();

  try {
    const purchase = await Purchase.findOne({
      _id: req.params.id,
      organization: req.user.organization._id
    });

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }

    if (purchase.status === 'received') {
      return res.status(400).json({
        success: false,
        message: 'Purchase is already received'
      });
    }

    // Update stock for each item
    for (const item of purchase.items) {
      let stock = await Stock.findOne({
        product: item.product,
        warehouse: purchase.warehouse
      });

      const previousQuantity = stock ? stock.quantity : 0;
      const newQuantity = previousQuantity + item.quantity;

      if (stock) {
        stock.quantity = newQuantity;
        stock.averageCost = ((stock.averageCost * previousQuantity) + (item.unitPrice * item.quantity)) / newQuantity;
        stock.lastPurchasePrice = item.unitPrice;
        stock.lastPurchaseDate = new Date();
        
        // Add batch if expiry date exists
        if (item.expiryDate) {
          stock.batches.push({
            batchNumber: item.batchNumber || `BATCH-${Date.now()}`,
            quantity: item.quantity,
            expiryDate: item.expiryDate,
            manufacturingDate: item.manufacturingDate,
            costPrice: item.unitPrice
          });
        }
        
        await stock.save({ session });
      } else {
        const warehouse = await require('../models/Warehouse').findById(purchase.warehouse);
        stock = await Stock.create([{
          product: item.product,
          warehouse: purchase.warehouse,
          branch: warehouse.branch,
          organization: req.user.organization._id,
          quantity: newQuantity,
          availableQuantity: newQuantity,
          averageCost: item.unitPrice,
          lastPurchasePrice: item.unitPrice,
          lastPurchaseDate: new Date(),
          batches: item.expiryDate ? [{
            batchNumber: item.batchNumber || `BATCH-${Date.now()}`,
            quantity: item.quantity,
            expiryDate: item.expiryDate,
            manufacturingDate: item.manufacturingDate,
            costPrice: item.unitPrice
          }] : []
        }], { session });
      }

      // Create stock ledger
      await StockLedger.create([{
        product: item.product,
        warehouse: purchase.warehouse,
        branch: purchase.branch,
        organization: req.user.organization._id,
        quantityChange: item.quantity,
        previousQuantity,
        newQuantity,
        type: 'purchase',
        referenceType: 'purchase',
        referenceId: purchase._id,
        unitCost: item.unitPrice,
        totalCost: item.unitPrice * item.quantity,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
        performedBy: req.user._id
      }], { session });

      // Update product cost price if needed
      await Product.findByIdAndUpdate(item.product, {
        costPrice: item.unitPrice
      }, { session });
    }

    purchase.status = 'received';
    purchase.receivedAt = new Date();
    purchase.receivedBy = req.user._id;
    await purchase.save({ session });

    await session.commitTransaction();

    res.json({
      success: true,
      message: 'Purchase received successfully',
      data: { purchase }
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    session.endSession();
  }
};

// Add payment to purchase
exports.addPayment = async (req, res) => {
  try {
    const { amount, method, reference } = req.body;

    const purchase = await Purchase.findOne({
      _id: req.params.id,
      organization: req.user.organization._id
    });

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }

    if (purchase.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Purchase is already fully paid'
      });
    }

    purchase.payments.push({
      amount,
      method,
      reference,
      paidBy: req.user._id
    });

    purchase.paidAmount += amount;
    purchase.balanceAmount = purchase.totalAmount - purchase.paidAmount;

    if (purchase.paidAmount >= purchase.totalAmount) {
      purchase.paymentStatus = 'paid';
    } else if (purchase.paidAmount > 0) {
      purchase.paymentStatus = 'partial';
    }

    await purchase.save();

    // Update supplier
    await Supplier.findByIdAndUpdate(purchase.supplier, {
      $inc: { outstandingBalance: -amount, totalPayments: amount }
    });

    res.json({
      success: true,
      message: 'Payment added successfully',
      data: { purchase }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Cancel purchase
exports.cancelPurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findOne({
      _id: req.params.id,
      organization: req.user.organization._id
    });

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }

    if (purchase.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Purchase is already cancelled'
      });
    }

    // If already received, we need to reverse stock (optional based on business logic)
    // For now, just mark as cancelled

    purchase.status = 'cancelled';
    await purchase.save();

    res.json({
      success: true,
      message: 'Purchase cancelled successfully',
      data: { purchase }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
