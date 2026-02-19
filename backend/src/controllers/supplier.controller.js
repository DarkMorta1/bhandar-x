const { Supplier, Purchase } = require('../models');
const { paginate, createPaginationMeta } = require('../utils/helpers');

// Get all suppliers
exports.getSuppliers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, sortBy = 'name' } = req.query;

    const query = { organization: req.user.organization._id };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const suppliersQuery = Supplier.find(query).sort({ [sortBy]: 1 });

    const suppliers = await paginate(suppliersQuery, parseInt(page), parseInt(limit));
    const total = await Supplier.countDocuments(query);

    res.json({
      success: true,
      data: {
        suppliers,
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

// Get single supplier
exports.getSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findOne({
      _id: req.params.id,
      organization: req.user.organization._id
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    // Get recent purchases
    const recentPurchases = await Purchase.find({ supplier: supplier._id })
      .select('purchaseNumber totalAmount paymentStatus purchaseDate')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: { supplier, recentPurchases }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create supplier
exports.createSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.create({
      ...req.body,
      organization: req.user.organization._id,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Supplier created successfully',
      data: { supplier }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update supplier
exports.updateSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findOneAndUpdate(
      {
        _id: req.params.id,
        organization: req.user.organization._id
      },
      req.body,
      { new: true, runValidators: true }
    );

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    res.json({
      success: true,
      message: 'Supplier updated successfully',
      data: { supplier }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete supplier
exports.deleteSupplier = async (req, res) => {
  try {
    // Check if supplier has purchases
    const purchasesCount = await Purchase.countDocuments({ supplier: req.params.id });

    if (purchasesCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete supplier with existing purchase records'
      });
    }

    const supplier = await Supplier.findOneAndDelete({
      _id: req.params.id,
      organization: req.user.organization._id
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    res.json({
      success: true,
      message: 'Supplier deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get supplier statement
exports.getStatement = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const query = {
      supplier: req.params.id,
      organization: req.user.organization._id,
      status: { $ne: 'cancelled' }
    };

    if (startDate || endDate) {
      query.purchaseDate = {};
      if (startDate) query.purchaseDate.$gte = new Date(startDate);
      if (endDate) query.purchaseDate.$lte = new Date(endDate);
    }

    const purchases = await Purchase.find(query)
      .select('purchaseNumber purchaseDate totalAmount paidAmount balanceAmount paymentStatus')
      .sort({ purchaseDate: -1 });

    const summary = {
      totalPurchases: purchases.reduce((sum, purchase) => sum + purchase.totalAmount, 0),
      totalPaid: purchases.reduce((sum, purchase) => sum + purchase.paidAmount, 0),
      totalBalance: purchases.reduce((sum, purchase) => sum + purchase.balanceAmount, 0)
    };

    res.json({
      success: true,
      data: { purchases, summary }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
