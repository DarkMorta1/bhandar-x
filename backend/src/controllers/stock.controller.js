const { Stock, StockLedger, Product, Warehouse, StockTransfer } = require('../models');
const { generateTransferNumber, paginate, createPaginationMeta } = require('../utils/helpers');

// Get stock by warehouse
exports.getStockByWarehouse = async (req, res) => {
  try {
    const { warehouseId } = req.params;
    const { page = 1, limit = 20, search, lowStock } = req.query;

    const query = {
      organization: req.user.organization._id,
      warehouse: warehouseId
    };

    if (lowStock === 'true') {
      query.$expr = { $lte: ['$availableQuantity', 0] };
    }

    let stockQuery = Stock.find(query)
      .populate({
        path: 'product',
        match: search ? { name: { $regex: search, $options: 'i' } } : {},
        populate: { path: 'category', select: 'name' }
      })
      .populate('warehouse', 'name code');

    const stock = await paginate(stockQuery, parseInt(page), parseInt(limit));
    const total = await Stock.countDocuments(query);

    // Filter out stock where product is null (due to search match)
    const filteredStock = stock.filter(s => s.product);

    res.json({
      success: true,
      data: {
        stock: filteredStock,
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

// Get stock ledger
exports.getStockLedger = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      product,
      warehouse,
      type,
      startDate,
      endDate
    } = req.query;

    const query = { organization: req.user.organization._id };

    if (product) query.product = product;
    if (warehouse) query.warehouse = warehouse;
    if (type) query.type = type;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const ledgerQuery = StockLedger.find(query)
      .populate('product', 'name sku unit')
      .populate('warehouse', 'name code')
      .populate('performedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    const ledger = await paginate(ledgerQuery, parseInt(page), parseInt(limit));
    const total = await StockLedger.countDocuments(query);

    res.json({
      success: true,
      data: {
        ledger,
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

// Stock In (Purchase receipt)
exports.stockIn = async (req, res) => {
  try {
    const { productId, warehouseId, quantity, unitCost, batchNumber, expiryDate, referenceId, notes } = req.body;

    const product = await Product.findOne({
      _id: productId,
      organization: req.user.organization._id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const warehouse = await Warehouse.findOne({
      _id: warehouseId,
      organization: req.user.organization._id
    });

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found'
      });
    }

    // Find or create stock record
    let stock = await Stock.findOne({
      product: productId,
      warehouse: warehouseId
    });

    const previousQuantity = stock ? stock.quantity : 0;
    const newQuantity = previousQuantity + quantity;

    if (stock) {
      // Update existing stock
      stock.quantity = newQuantity;
      stock.lastPurchasePrice = unitCost || product.costPrice;
      stock.lastPurchaseDate = new Date();
      
      // Add batch if expiry tracking is enabled
      if (product.hasExpiry && batchNumber) {
        stock.batches.push({
          batchNumber,
          quantity,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          costPrice: unitCost || product.costPrice
        });
      }
      
      await stock.save();
    } else {
      // Create new stock record
      stock = await Stock.create({
        product: productId,
        warehouse: warehouseId,
        branch: warehouse.branch,
        organization: req.user.organization._id,
        quantity: newQuantity,
        availableQuantity: newQuantity,
        averageCost: unitCost || product.costPrice,
        lastPurchasePrice: unitCost || product.costPrice,
        lastPurchaseDate: new Date(),
        batches: product.hasExpiry && batchNumber ? [{
          batchNumber,
          quantity,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          costPrice: unitCost || product.costPrice
        }] : []
      });
    }

    // Create stock ledger entry
    await StockLedger.create({
      product: productId,
      warehouse: warehouseId,
      branch: warehouse.branch,
      organization: req.user.organization._id,
      quantityChange: quantity,
      previousQuantity,
      newQuantity,
      type: 'purchase',
      referenceType: 'purchase',
      referenceId: referenceId || stock._id,
      unitCost: unitCost || product.costPrice,
      totalCost: (unitCost || product.costPrice) * quantity,
      batchNumber,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      notes,
      performedBy: req.user._id
    });

    res.json({
      success: true,
      message: 'Stock added successfully',
      data: { stock }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Stock Out (Sale)
exports.stockOut = async (req, res) => {
  try {
    const { productId, warehouseId, quantity, referenceId, notes } = req.body;

    const stock = await Stock.findOne({
      product: productId,
      warehouse: warehouseId,
      organization: req.user.organization._id
    });

    if (!stock) {
      return res.status(404).json({
        success: false,
        message: 'Stock not found'
      });
    }

    if (stock.availableQuantity < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock available'
      });
    }

    const previousQuantity = stock.quantity;
    const newQuantity = previousQuantity - quantity;

    // Update stock
    stock.quantity = newQuantity;
    stock.lastSaleDate = new Date();
    await stock.save();

    // Create stock ledger entry
    await StockLedger.create({
      product: productId,
      warehouse: warehouseId,
      branch: stock.branch,
      organization: req.user.organization._id,
      quantityChange: -quantity,
      previousQuantity,
      newQuantity,
      type: 'sale',
      referenceType: 'sale',
      referenceId: referenceId || stock._id,
      notes,
      performedBy: req.user._id
    });

    res.json({
      success: true,
      message: 'Stock deducted successfully',
      data: { stock }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Stock Adjustment
exports.adjustStock = async (req, res) => {
  try {
    const { productId, warehouseId, quantity, reason, notes } = req.body;

    const stock = await Stock.findOne({
      product: productId,
      warehouse: warehouseId,
      organization: req.user.organization._id
    });

    if (!stock) {
      return res.status(404).json({
        success: false,
        message: 'Stock not found'
      });
    }

    const previousQuantity = stock.quantity;
    const newQuantity = quantity;
    const quantityChange = newQuantity - previousQuantity;

    // Update stock
    stock.quantity = newQuantity;
    await stock.save();

    // Create stock ledger entry
    await StockLedger.create({
      product: productId,
      warehouse: warehouseId,
      branch: stock.branch,
      organization: req.user.organization._id,
      quantityChange,
      previousQuantity,
      newQuantity,
      type: 'adjustment',
      referenceType: 'adjustment',
      referenceId: stock._id,
      notes: `${reason}${notes ? ': ' + notes : ''}`,
      performedBy: req.user._id
    });

    res.json({
      success: true,
      message: 'Stock adjusted successfully',
      data: { stock }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create stock transfer
exports.createTransfer = async (req, res) => {
  try {
    const { sourceWarehouse, destinationWarehouse, items, notes } = req.body;

    // Validate warehouses
    const source = await Warehouse.findOne({
      _id: sourceWarehouse,
      organization: req.user.organization._id
    });

    const destination = await Warehouse.findOne({
      _id: destinationWarehouse,
      organization: req.user.organization._id
    });

    if (!source || !destination) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found'
      });
    }

    // Validate stock availability
    for (const item of items) {
      const stock = await Stock.findOne({
        product: item.product,
        warehouse: sourceWarehouse,
        organization: req.user.organization._id
      });

      if (!stock || stock.availableQuantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for product ${item.productName || item.product}`
        });
      }
    }

    // Create transfer record
    const transfer = await StockTransfer.create({
      transferNumber: generateTransferNumber(req.user.organization._id),
      organization: req.user.organization._id,
      sourceBranch: source.branch,
      sourceWarehouse,
      destinationBranch: destination.branch,
      destinationWarehouse,
      items: items.map(item => ({
        product: item.product,
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        unit: item.unit,
        batchNumber: item.batchNumber,
        notes: item.notes
      })),
      totalItems: items.length,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
      status: 'pending',
      notes,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Stock transfer created successfully',
      data: { transfer }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Process stock transfer (receive)
exports.processTransfer = async (req, res) => {
  try {
    const { transferId, action } = req.params; // action: 'ship' or 'receive' or 'cancel'

    const transfer = await StockTransfer.findOne({
      _id: transferId,
      organization: req.user.organization._id
    });

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: 'Transfer not found'
      });
    }

    if (action === 'ship' && transfer.status === 'pending') {
      // Deduct from source warehouse
      for (const item of transfer.items) {
        const stock = await Stock.findOne({
          product: item.product,
          warehouse: transfer.sourceWarehouse
        });

        const previousQuantity = stock.quantity;
        stock.quantity -= item.quantity;
        await stock.save();

        // Create ledger entry
        await StockLedger.create({
          product: item.product,
          warehouse: transfer.sourceWarehouse,
          branch: transfer.sourceBranch,
          organization: req.user.organization._id,
          quantityChange: -item.quantity,
          previousQuantity,
          newQuantity: stock.quantity,
          type: 'transfer_out',
          referenceType: 'transfer',
          referenceId: transfer._id,
          destinationWarehouse: transfer.destinationWarehouse,
          performedBy: req.user._id
        });
      }

      transfer.status = 'in_transit';
      await transfer.save();

    } else if (action === 'receive' && transfer.status === 'in_transit') {
      // Add to destination warehouse
      for (const item of transfer.items) {
        let stock = await Stock.findOne({
          product: item.product,
          warehouse: transfer.destinationWarehouse
        });

        const previousQuantity = stock ? stock.quantity : 0;

        if (stock) {
          stock.quantity += item.quantity;
          await stock.save();
        } else {
          const warehouse = await Warehouse.findById(transfer.destinationWarehouse);
          stock = await Stock.create({
            product: item.product,
            warehouse: transfer.destinationWarehouse,
            branch: warehouse.branch,
            organization: req.user.organization._id,
            quantity: item.quantity,
            availableQuantity: item.quantity
          });
        }

        // Create ledger entry
        await StockLedger.create({
          product: item.product,
          warehouse: transfer.destinationWarehouse,
          branch: transfer.destinationBranch,
          organization: req.user.organization._id,
          quantityChange: item.quantity,
          previousQuantity,
          newQuantity: stock.quantity,
          type: 'transfer_in',
          referenceType: 'transfer',
          referenceId: transfer._id,
          sourceWarehouse: transfer.sourceWarehouse,
          performedBy: req.user._id
        });
      }

      transfer.status = 'received';
      transfer.receivedDate = new Date();
      transfer.receivedBy = req.user._id;
      await transfer.save();

    } else if (action === 'cancel') {
      transfer.status = 'cancelled';
      await transfer.save();
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid action for current transfer status'
      });
    }

    res.json({
      success: true,
      message: `Transfer ${action}ed successfully`,
      data: { transfer }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all transfers
exports.getTransfers = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, warehouse } = req.query;

    const query = { organization: req.user.organization._id };
    if (status) query.status = status;
    if (warehouse) {
      query.$or = [
        { sourceWarehouse: warehouse },
        { destinationWarehouse: warehouse }
      ];
    }

    const transfersQuery = StockTransfer.find(query)
      .populate('sourceWarehouse', 'name code')
      .populate('destinationWarehouse', 'name code')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    const transfers = await paginate(transfersQuery, parseInt(page), parseInt(limit));
    const total = await StockTransfer.countDocuments(query);

    res.json({
      success: true,
      data: {
        transfers,
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

// Get single transfer
exports.getTransfer = async (req, res) => {
  try {
    const transfer = await StockTransfer.findOne({
      _id: req.params.id,
      organization: req.user.organization._id
    })
      .populate('sourceWarehouse', 'name code')
      .populate('destinationWarehouse', 'name code')
      .populate('items.product', 'name sku unit')
      .populate('createdBy', 'firstName lastName')
      .populate('receivedBy', 'firstName lastName');

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: 'Transfer not found'
      });
    }

    res.json({
      success: true,
      data: { transfer }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
