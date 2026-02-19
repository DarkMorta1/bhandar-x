const { Sale, Purchase, Product, Stock, Customer, Supplier, StockLedger } = require('../models');
const { startOfDay, endOfDay, startOfMonth, endOfMonth } = require('../utils/helpers');

// Get dashboard summary
exports.getDashboardSummary = async (req, res) => {
  try {
    const organizationId = req.user.organization._id;
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    // Today's sales
    const todaySales = await Sale.aggregate([
      {
        $match: {
          organization: organizationId,
          invoiceDate: { $gte: todayStart, $lte: todayEnd },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          amount: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Monthly sales
    const monthlySales = await Sale.aggregate([
      {
        $match: {
          organization: organizationId,
          invoiceDate: { $gte: monthStart, $lte: monthEnd },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          amount: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Total products
    const totalProducts = await Product.countDocuments({
      organization: organizationId,
      isActive: true
    });

    // Low stock count
    const lowStockCount = await Stock.countDocuments({
      organization: organizationId,
      $expr: { $lte: ['$availableQuantity', 10] }
    });

    // Outstanding payments (from customers)
    const outstandingReceivables = await Customer.aggregate([
      {
        $match: { organization: organizationId }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$outstandingBalance' }
        }
      }
    ]);

    // Outstanding payables (to suppliers)
    const outstandingPayables = await Supplier.aggregate([
      {
        $match: { organization: organizationId }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$outstandingBalance' }
        }
      }
    ]);

    // Total stock value
    const stockValue = await Stock.aggregate([
      {
        $match: { organization: organizationId }
      },
      {
        $group: {
          _id: null,
          value: { $sum: { $multiply: ['$quantity', '$averageCost'] } }
        }
      }
    ]);

    // Recent sales
    const recentSales = await Sale.find({
      organization: organizationId,
      status: { $ne: 'cancelled' }
    })
      .select('invoiceNumber customerName totalAmount paymentStatus invoiceDate')
      .sort({ createdAt: -1 })
      .limit(5);

    // Top selling products
    const topProducts = await Sale.aggregate([
      {
        $match: {
          organization: organizationId,
          status: { $ne: 'cancelled' },
          invoiceDate: { $gte: monthStart }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          productName: { $first: '$items.productName' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.totalAmount' }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      success: true,
      data: {
        todaySales: todaySales[0] || { count: 0, amount: 0 },
        monthlySales: monthlySales[0] || { count: 0, amount: 0 },
        totalProducts,
        lowStockCount,
        outstandingReceivables: outstandingReceivables[0]?.total || 0,
        outstandingPayables: outstandingPayables[0]?.total || 0,
        stockValue: stockValue[0]?.value || 0,
        recentSales,
        topProducts
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get sales chart data
exports.getSalesChart = async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    const organizationId = req.user.organization._id;

    let startDate = new Date();
    let groupBy = {};

    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        groupBy = {
          year: { $year: '$invoiceDate' },
          month: { $month: '$invoiceDate' },
          day: { $dayOfMonth: '$invoiceDate' }
        };
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        groupBy = {
          year: { $year: '$invoiceDate' },
          month: { $month: '$invoiceDate' },
          day: { $dayOfMonth: '$invoiceDate' }
        };
        break;
      case '6m':
        startDate.setMonth(startDate.getMonth() - 6);
        groupBy = {
          year: { $year: '$invoiceDate' },
          month: { $month: '$invoiceDate' }
        };
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        groupBy = {
          year: { $year: '$invoiceDate' },
          month: { $month: '$invoiceDate' }
        };
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    const salesData = await Sale.aggregate([
      {
        $match: {
          organization: organizationId,
          invoiceDate: { $gte: startDate },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: groupBy,
          amount: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    res.json({
      success: true,
      data: { salesData }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get category distribution
exports.getCategoryDistribution = async (req, res) => {
  try {
    const organizationId = req.user.organization._id;

    const categoryData = await Sale.aggregate([
      {
        $match: {
          organization: organizationId,
          status: { $ne: 'cancelled' }
        }
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $lookup: {
          from: 'categories',
          localField: 'product.category',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$category._id',
          categoryName: { $first: { $ifNull: ['$category.name', 'Uncategorized'] } },
          color: { $first: { $ifNull: ['$category.color', '#999999'] } },
          totalSales: { $sum: '$items.totalAmount' },
          quantity: { $sum: '$items.quantity' }
        }
      },
      { $sort: { totalSales: -1 } }
    ]);

    res.json({
      success: true,
      data: { categories: categoryData }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get stock overview
exports.getStockOverview = async (req, res) => {
  try {
    const organizationId = req.user.organization._id;

    // Stock by warehouse
    const stockByWarehouse = await Stock.aggregate([
      {
        $match: { organization: organizationId }
      },
      {
        $lookup: {
          from: 'warehouses',
          localField: 'warehouse',
          foreignField: '_id',
          as: 'warehouse'
        }
      },
      { $unwind: '$warehouse' },
      {
        $group: {
          _id: '$warehouse._id',
          warehouseName: { $first: '$warehouse.name' },
          totalProducts: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          stockValue: { $sum: { $multiply: ['$quantity', '$averageCost'] } }
        }
      }
    ]);

    // Stock movement (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const stockMovement = await StockLedger.aggregate([
      {
        $match: {
          organization: organizationId,
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: '$type',
          totalQuantity: { $sum: '$quantityChange' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        stockByWarehouse,
        stockMovement
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get low stock alerts
exports.getLowStockAlerts = async (req, res) => {
  try {
    const organizationId = req.user.organization._id;
    const { limit = 10 } = req.query;

    const lowStockItems = await Stock.find({
      organization: organizationId,
      $expr: { $lte: ['$availableQuantity', '$product.minStockLevel'] }
    })
      .populate({
        path: 'product',
        select: 'name sku minStockLevel unit'
      })
      .populate('warehouse', 'name code')
      .sort({ availableQuantity: 1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: { lowStockItems }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get expiring products
exports.getExpiringProducts = async (req, res) => {
  try {
    const organizationId = req.user.organization._id;
    const { days = 30 } = req.query;

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + parseInt(days));

    const expiringProducts = await Stock.find({
      organization: organizationId,
      'batches.expiryDate': { $lte: expiryDate, $gte: new Date() }
    })
      .populate('product', 'name sku hasExpiry')
      .populate('warehouse', 'name code');

    // Flatten batches
    const alerts = [];
    expiringProducts.forEach(stock => {
      stock.batches.forEach(batch => {
        if (batch.expiryDate && batch.expiryDate <= expiryDate && batch.expiryDate >= new Date()) {
          alerts.push({
            product: stock.product,
            warehouse: stock.warehouse,
            batchNumber: batch.batchNumber,
            quantity: batch.quantity,
            expiryDate: batch.expiryDate,
            daysUntilExpiry: Math.ceil((batch.expiryDate - new Date()) / (1000 * 60 * 60 * 24))
          });
        }
      });
    });

    alerts.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

    res.json({
      success: true,
      data: { expiringProducts: alerts }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
