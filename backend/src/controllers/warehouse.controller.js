const { Warehouse, Stock, Branch } = require('../models');
const { paginate, createPaginationMeta } = require('../utils/helpers');

// Get all warehouses
exports.getWarehouses = async (req, res) => {
  try {
    const { page = 1, limit = 20, branch, includeInactive } = req.query;

    const query = { organization: req.user.organization._id };
    if (!includeInactive) {
      query.isActive = true;
    }
    if (branch) {
      query.branch = branch;
    }

    const warehousesQuery = Warehouse.find(query)
      .populate('branch', 'name code')
      .populate('manager', 'firstName lastName')
      .sort({ createdAt: -1 });

    const warehouses = await paginate(warehousesQuery, parseInt(page), parseInt(limit));
    const total = await Warehouse.countDocuments(query);

    res.json({
      success: true,
      data: {
        warehouses,
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

// Get single warehouse
exports.getWarehouse = async (req, res) => {
  try {
    const warehouse = await Warehouse.findOne({
      _id: req.params.id,
      organization: req.user.organization._id
    })
      .populate('branch', 'name code')
      .populate('manager', 'firstName lastName email phone');

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found'
      });
    }

    // Get stock summary
    const stockSummary = await Stock.aggregate([
      {
        $match: { warehouse: warehouse._id }
      },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: { $multiply: ['$quantity', '$averageCost'] } }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        warehouse,
        stockSummary: stockSummary[0] || { totalProducts: 0, totalQuantity: 0, totalValue: 0 }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create warehouse
exports.createWarehouse = async (req, res) => {
  try {
    const { branch: branchId } = req.body;

    // Verify branch exists and belongs to organization
    const branch = await Branch.findOne({
      _id: branchId,
      organization: req.user.organization._id
    });

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found'
      });
    }

    const warehouse = await Warehouse.create({
      ...req.body,
      organization: req.user.organization._id,
      branch: branchId
    });

    res.status(201).json({
      success: true,
      message: 'Warehouse created successfully',
      data: { warehouse }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update warehouse
exports.updateWarehouse = async (req, res) => {
  try {
    const warehouse = await Warehouse.findOneAndUpdate(
      {
        _id: req.params.id,
        organization: req.user.organization._id
      },
      req.body,
      { new: true, runValidators: true }
    );

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found'
      });
    }

    res.json({
      success: true,
      message: 'Warehouse updated successfully',
      data: { warehouse }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete warehouse (soft delete)
exports.deleteWarehouse = async (req, res) => {
  try {
    // Check if warehouse has stock
    const stockCount = await Stock.countDocuments({
      warehouse: req.params.id,
      quantity: { $gt: 0 }
    });

    if (stockCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete warehouse with existing stock'
      });
    }

    const warehouse = await Warehouse.findOneAndUpdate(
      {
        _id: req.params.id,
        organization: req.user.organization._id
      },
      { isActive: false },
      { new: true }
    );

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found'
      });
    }

    res.json({
      success: true,
      message: 'Warehouse deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
