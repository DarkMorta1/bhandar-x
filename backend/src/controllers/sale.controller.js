const { Sale, Product, Stock, Customer, StockLedger } = require('../models');
const { generateInvoiceNumber, paginate, createPaginationMeta, calculateGST } = require('../utils/helpers');

// Get all sales
exports.getSales = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      paymentStatus,
      customer,
      startDate,
      endDate
    } = req.query;

    const query = { organization: req.user.organization._id };

    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (customer) query.customer = customer;
    if (startDate || endDate) {
      query.invoiceDate = {};
      if (startDate) query.invoiceDate.$gte = new Date(startDate);
      if (endDate) query.invoiceDate.$lte = new Date(endDate);
    }

    const salesQuery = Sale.find(query)
      .populate('customer', 'name phone')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    const sales = await paginate(salesQuery, parseInt(page), parseInt(limit));
    const total = await Sale.countDocuments(query);

    res.json({
      success: true,
      data: {
        sales,
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

// Get single sale
exports.getSale = async (req, res) => {
  try {
    const sale = await Sale.findOne({
      _id: req.params.id,
      organization: req.user.organization._id
    })
      .populate('customer', 'name phone email address gstNumber')
      .populate('items.product', 'name sku unit')
      .populate('createdBy', 'firstName lastName')
      .populate('salesPerson', 'firstName lastName')
      .populate('warehouse', 'name code');

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    res.json({
      success: true,
      data: { sale }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create sale
exports.createSale = async (req, res) => {
  const session = await require('mongoose').startSession();
  session.startTransaction();

  try {
    const {
      customer,
      customerName,
      customerPhone,
      customerEmail,
      warehouseId,
      items,
      paymentMethod,
      notes,
      discountAmount = 0
    } = req.body;

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

      // Check stock availability
      const stock = await Stock.findOne({
        product: item.product,
        warehouse: warehouseId
      });

      if (!stock || stock.availableQuantity < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }

      const unitPrice = item.unitPrice || product.sellingPrice;
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
        costPrice: product.costPrice
      });

      subtotal += itemSubtotal;
      totalTax += itemTax;

      // Deduct stock
      const previousQuantity = stock.quantity;
      stock.quantity -= item.quantity;
      await stock.save({ session });

      // Create stock ledger
      await StockLedger.create([{
        product: item.product,
        warehouse: warehouseId,
        branch: warehouse.branch,
        organization: req.user.organization._id,
        quantityChange: -item.quantity,
        previousQuantity,
        newQuantity: stock.quantity,
        type: 'sale',
        referenceType: 'sale',
        referenceId: null, // Will update after sale is created
        performedBy: req.user._id
      }], { session });
    }

    const totalAmount = subtotal + totalTax - discountAmount;

    // Create sale record
    const sale = await Sale.create([{
      invoiceNumber: generateInvoiceNumber('INV', req.user.organization._id),
      organization: req.user.organization._id,
      branch: warehouse.branch,
      warehouse: warehouseId,
      customer,
      customerName: customerName || 'Walk-in Customer',
      customerPhone,
      customerEmail,
      items: processedItems,
      subtotal,
      totalDiscount: discountAmount,
      totalTax,
      totalAmount,
      paymentStatus: paymentMethod === 'credit' ? 'unpaid' : 'paid',
      paymentMethod,
      paidAmount: paymentMethod === 'credit' ? 0 : totalAmount,
      balanceAmount: paymentMethod === 'credit' ? totalAmount : 0,
      status: 'confirmed',
      notes,
      createdBy: req.user._id,
      salesPerson: req.user._id,
      invoiceDate: new Date()
    }], { session });

    // Update stock ledger with sale reference
    await StockLedger.updateMany(
      {
        organization: req.user.organization._id,
        referenceId: null,
        type: 'sale'
      },
      { referenceId: sale[0]._id },
      { session }
    );

    // Update customer outstanding if credit sale
    if (customer && paymentMethod === 'credit') {
      await Customer.findByIdAndUpdate(
        customer,
        { $inc: { outstandingBalance: totalAmount, totalSales: totalAmount } },
        { session }
      );
    } else if (customer) {
      await Customer.findByIdAndUpdate(
        customer,
        { $inc: { totalSales: totalAmount, totalPayments: totalAmount } },
        { session }
      );
    }

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: 'Sale created successfully',
      data: { sale: sale[0] }
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

// Update sale status
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const sale = await Sale.findOneAndUpdate(
      {
        _id: req.params.id,
        organization: req.user.organization._id
      },
      { status },
      { new: true }
    );

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    res.json({
      success: true,
      message: 'Sale status updated successfully',
      data: { sale }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Add payment to sale
exports.addPayment = async (req, res) => {
  try {
    const { amount, method, reference } = req.body;

    const sale = await Sale.findOne({
      _id: req.params.id,
      organization: req.user.organization._id
    });

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    if (sale.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Sale is already fully paid'
      });
    }

    sale.payments.push({
      amount,
      method,
      reference,
      receivedBy: req.user._id
    });

    sale.paidAmount += amount;
    sale.balanceAmount = sale.totalAmount - sale.paidAmount;

    if (sale.paidAmount >= sale.totalAmount) {
      sale.paymentStatus = 'paid';
    } else if (sale.paidAmount > 0) {
      sale.paymentStatus = 'partial';
    }

    await sale.save();

    // Update customer
    if (sale.customer) {
      await Customer.findByIdAndUpdate(sale.customer, {
        $inc: { outstandingBalance: -amount, totalPayments: amount }
      });
    }

    res.json({
      success: true,
      message: 'Payment added successfully',
      data: { sale }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Cancel sale
exports.cancelSale = async (req, res) => {
  const session = await require('mongoose').startSession();
  session.startTransaction();

  try {
    const sale = await Sale.findOne({
      _id: req.params.id,
      organization: req.user.organization._id
    });

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    if (sale.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Sale is already cancelled'
      });
    }

    // Restore stock
    for (const item of sale.items) {
      const stock = await Stock.findOne({
        product: item.product,
        warehouse: sale.warehouse
      });

      if (stock) {
        const previousQuantity = stock.quantity;
        stock.quantity += item.quantity;
        await stock.save({ session });

        // Create stock ledger for return
        await StockLedger.create([{
          product: item.product,
          warehouse: sale.warehouse,
          branch: sale.branch,
          organization: req.user.organization._id,
          quantityChange: item.quantity,
          previousQuantity,
          newQuantity: stock.quantity,
          type: 'sale_return',
          referenceType: 'sale',
          referenceId: sale._id,
          notes: 'Sale cancelled - stock returned',
          performedBy: req.user._id
        }], { session });
      }
    }

    // Update customer balance if credit sale
    if (sale.customer && sale.paymentStatus !== 'paid') {
      await Customer.findByIdAndUpdate(sale.customer, {
        $inc: { outstandingBalance: -sale.balanceAmount }
      }, { session });
    }

    sale.status = 'cancelled';
    await sale.save({ session });

    await session.commitTransaction();

    res.json({
      success: true,
      message: 'Sale cancelled successfully',
      data: { sale }
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

// Get today's sales
exports.getTodaySales = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const sales = await Sale.find({
      organization: req.user.organization._id,
      invoiceDate: { $gte: today, $lt: tomorrow },
      status: { $ne: 'cancelled' }
    });

    const summary = {
      totalSales: sales.length,
      totalAmount: sales.reduce((sum, sale) => sum + sale.totalAmount, 0),
      paidAmount: sales.reduce((sum, sale) => sum + sale.paidAmount, 0),
      unpaidAmount: sales.reduce((sum, sale) => sum + sale.balanceAmount, 0)
    };

    res.json({
      success: true,
      data: { summary, sales }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
