const { Sale, Purchase, Product, Stock, StockLedger, Customer, Supplier } = require('../models');
const { startOfDay, endOfDay, startOfMonth, endOfMonth } = require('../utils/helpers');

// Sales report
exports.getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    const organizationId = req.user.organization._id;

    const query = {
      organization: organizationId,
      status: { $ne: 'cancelled' }
    };

    if (startDate || endDate) {
      query.invoiceDate = {};
      if (startDate) query.invoiceDate.$gte = new Date(startDate);
      if (endDate) query.invoiceDate.$lte = new Date(endDate);
    }

    let groupConfig = {};
    switch (groupBy) {
      case 'day':
        groupConfig = {
          year: { $year: '$invoiceDate' },
          month: { $month: '$invoiceDate' },
          day: { $dayOfMonth: '$invoiceDate' }
        };
        break;
      case 'month':
        groupConfig = {
          year: { $year: '$invoiceDate' },
          month: { $month: '$invoiceDate' }
        };
        break;
      case 'product':
        groupConfig = '$items.product';
        break;
      case 'customer':
        groupConfig = '$customer';
        break;
      default:
        groupConfig = {
          year: { $year: '$invoiceDate' },
          month: { $month: '$invoiceDate' },
          day: { $dayOfMonth: '$invoiceDate' }
        };
    }

    let report;
    if (groupBy === 'product') {
      report = await Sale.aggregate([
        { $match: query },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            productName: { $first: '$items.productName' },
            sku: { $first: '$items.sku' },
            totalQuantity: { $sum: '$items.quantity' },
            totalRevenue: { $sum: '$items.totalAmount' },
            totalDiscount: { $sum: '$items.discountAmount' },
            totalTax: { $sum: '$items.taxAmount' },
            orderCount: { $sum: 1 }
          }
        },
        { $sort: { totalRevenue: -1 } }
      ]);
    } else if (groupBy === 'customer') {
      report = await Sale.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$customer',
            customerName: { $first: '$customerName' },
            totalSales: { $sum: '$totalAmount' },
            totalOrders: { $sum: 1 },
            totalPaid: { $sum: '$paidAmount' },
            totalBalance: { $sum: '$balanceAmount' }
          }
        },
        { $sort: { totalSales: -1 } }
      ]);
    } else {
      report = await Sale.aggregate([
        { $match: query },
        {
          $group: {
            _id: groupConfig,
            totalSales: { $sum: '$totalAmount' },
            totalOrders: { $sum: 1 },
            totalItems: { $sum: { $size: '$items' } },
            totalDiscount: { $sum: '$totalDiscount' },
            totalTax: { $sum: '$totalTax' },
            averageOrderValue: { $avg: '$totalAmount' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]);
    }

    // Calculate summary
    const summary = await Sale.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 },
          totalPaid: { $sum: '$paidAmount' },
          totalBalance: { $sum: '$balanceAmount' },
          totalDiscount: { $sum: '$totalDiscount' },
          totalTax: { $sum: '$totalTax' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        report,
        summary: summary[0] || {}
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Purchase report
exports.getPurchaseReport = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    const organizationId = req.user.organization._id;

    const query = {
      organization: organizationId,
      status: { $ne: 'cancelled' }
    };

    if (startDate || endDate) {
      query.purchaseDate = {};
      if (startDate) query.purchaseDate.$gte = new Date(startDate);
      if (endDate) query.purchaseDate.$lte = new Date(endDate);
    }

    let groupConfig = {};
    switch (groupBy) {
      case 'day':
        groupConfig = {
          year: { $year: '$purchaseDate' },
          month: { $month: '$purchaseDate' },
          day: { $dayOfMonth: '$purchaseDate' }
        };
        break;
      case 'month':
        groupConfig = {
          year: { $year: '$purchaseDate' },
          month: { $month: '$purchaseDate' }
        };
        break;
      case 'supplier':
        groupConfig = '$supplier';
        break;
      default:
        groupConfig = {
          year: { $year: '$purchaseDate' },
          month: { $month: '$purchaseDate' },
          day: { $dayOfMonth: '$purchaseDate' }
        };
    }

    let report;
    if (groupBy === 'supplier') {
      report = await Purchase.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$supplier',
            supplierName: { $first: '$supplierName' },
            totalPurchases: { $sum: '$totalAmount' },
            totalOrders: { $sum: 1 },
            totalPaid: { $sum: '$paidAmount' },
            totalBalance: { $sum: '$balanceAmount' }
          }
        },
        { $sort: { totalPurchases: -1 } }
      ]);
    } else {
      report = await Purchase.aggregate([
        { $match: query },
        {
          $group: {
            _id: groupConfig,
            totalPurchases: { $sum: '$totalAmount' },
            totalOrders: { $sum: 1 },
            totalItems: { $sum: { $size: '$items' } },
            totalDiscount: { $sum: '$totalDiscount' },
            totalTax: { $sum: '$totalTax' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]);
    }

    // Calculate summary
    const summary = await Purchase.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalPurchases: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 },
          totalPaid: { $sum: '$paidAmount' },
          totalBalance: { $sum: '$balanceAmount' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        report,
        summary: summary[0] || {}
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Stock report
exports.getStockReport = async (req, res) => {
  try {
    const { warehouse, lowStock, category } = req.query;
    const organizationId = req.user.organization._id;

    const query = { organization: organizationId };
    if (warehouse) query.warehouse = warehouse;

    let stockQuery = Stock.find(query)
      .populate({
        path: 'product',
        populate: { path: 'category', select: 'name' }
      })
      .populate('warehouse', 'name code');

    let stock = await stockQuery;

    // Filter by category
    if (category) {
      stock = stock.filter(s => s.product && s.product.category && s.product.category._id.toString() === category);
    }

    // Filter low stock
    if (lowStock === 'true') {
      stock = stock.filter(s => s.product && s.availableQuantity <= s.product.minStockLevel);
    }

    // Calculate totals
    const totalValue = stock.reduce((sum, s) => sum + (s.quantity * s.averageCost), 0);
    const totalQuantity = stock.reduce((sum, s) => sum + s.quantity, 0);

    res.json({
      success: true,
      data: {
        stock,
        summary: {
          totalProducts: stock.length,
          totalQuantity,
          totalValue
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Profit/Loss report
exports.getProfitLossReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const organizationId = req.user.organization._id;

    const query = {
      organization: organizationId,
      status: { $ne: 'cancelled' }
    };

    if (startDate || endDate) {
      query.invoiceDate = {};
      if (startDate) query.invoiceDate.$gte = new Date(startDate);
      if (endDate) query.invoiceDate.$lte = new Date(endDate);
    }

    const sales = await Sale.find(query);

    let totalRevenue = 0;
    let totalCost = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    sales.forEach(sale => {
      totalRevenue += sale.totalAmount;
      totalDiscount += sale.totalDiscount;
      totalTax += sale.totalTax;
      
      sale.items.forEach(item => {
        totalCost += (item.costPrice || 0) * item.quantity;
      });
    });

    const grossProfit = totalRevenue - totalCost;
    const netProfit = grossProfit - totalDiscount;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue * 100).toFixed(2) : 0;

    res.json({
      success: true,
      data: {
        totalRevenue,
        totalCost,
        grossProfit,
        totalDiscount,
        totalTax,
        netProfit,
        profitMargin
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Tax report
exports.getTaxReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const organizationId = req.user.organization._id;

    const query = {
      organization: organizationId,
      status: { $ne: 'cancelled' }
    };

    if (startDate || endDate) {
      query.invoiceDate = {};
      if (startDate) query.invoiceDate.$gte = new Date(startDate);
      if (endDate) query.invoiceDate.$lte = new Date(endDate);
    }

    const sales = await Sale.find(query);

    let totalTaxableAmount = 0;
    let totalTax = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    sales.forEach(sale => {
      totalTaxableAmount += sale.subtotal - sale.totalDiscount;
      totalTax += sale.totalTax;
      
      if (sale.isGstInvoice && sale.gstDetails) {
        totalCgst += sale.gstDetails.cgst || 0;
        totalSgst += sale.gstDetails.sgst || 0;
        totalIgst += sale.gstDetails.igst || 0;
      }
    });

    res.json({
      success: true,
      data: {
        totalTaxableAmount,
        totalTax,
        totalCgst,
        totalSgst,
        totalIgst,
        totalInvoices: sales.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Expiry report
exports.getExpiryReport = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const organizationId = req.user.organization._id;

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + parseInt(days));

    const stock = await Stock.find({
      organization: organizationId,
      'batches.expiryDate': { $lte: expiryDate, $gte: new Date() }
    })
      .populate('product', 'name sku hasExpiry')
      .populate('warehouse', 'name code');

    // Flatten batches
    const expiringItems = [];
    stock.forEach(s => {
      s.batches.forEach(batch => {
        if (batch.expiryDate && batch.expiryDate <= expiryDate && batch.expiryDate >= new Date()) {
          expiringItems.push({
            product: s.product,
            warehouse: s.warehouse,
            batchNumber: batch.batchNumber,
            quantity: batch.quantity,
            expiryDate: batch.expiryDate,
            daysUntilExpiry: Math.ceil((batch.expiryDate - new Date()) / (1000 * 60 * 60 * 24))
          });
        }
      });
    });

    expiringItems.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

    res.json({
      success: true,
      data: {
        expiringItems,
        totalItems: expiringItems.length,
        totalQuantity: expiringItems.reduce((sum, item) => sum + item.quantity, 0)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Stock movement report
exports.getStockMovementReport = async (req, res) => {
  try {
    const { startDate, endDate, product, warehouse } = req.query;
    const organizationId = req.user.organization._id;

    const query = { organization: organizationId };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (product) query.product = product;
    if (warehouse) query.warehouse = warehouse;

    const movements = await StockLedger.find(query)
      .populate('product', 'name sku')
      .populate('warehouse', 'name code')
      .populate('performedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    // Group by type
    const summary = movements.reduce((acc, m) => {
      const type = m.type;
      if (!acc[type]) {
        acc[type] = { count: 0, quantity: 0 };
      }
      acc[type].count++;
      acc[type].quantity += Math.abs(m.quantityChange);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        movements,
        summary
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
