const { Branch, Warehouse } = require('../models');
const { paginate, createPaginationMeta } = require('../utils/helpers');

// Get all branches
exports.getBranches = async (req, res) => {
  try {
    const { page = 1, limit = 20, includeInactive } = req.query;

    const query = { organization: req.user.organization._id };
    if (!includeInactive) {
      query.isActive = true;
    }

    const branchesQuery = Branch.find(query)
      .populate('manager', 'firstName lastName')
      .sort({ createdAt: -1 });

    const branches = await paginate(branchesQuery, parseInt(page), parseInt(limit));
    const total = await Branch.countDocuments(query);

    res.json({
      success: true,
      data: {
        branches,
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

// Get single branch
exports.getBranch = async (req, res) => {
  try {
    const branch = await Branch.findOne({
      _id: req.params.id,
      organization: req.user.organization._id
    }).populate('manager', 'firstName lastName email phone');

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found'
      });
    }

    // Get warehouses in this branch
    const warehouses = await Warehouse.find({ branch: branch._id })
      .select('name code type isActive');

    res.json({
      success: true,
      data: { branch, warehouses }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create branch
exports.createBranch = async (req, res) => {
  try {
    const branch = await Branch.create({
      ...req.body,
      organization: req.user.organization._id
    });

    res.status(201).json({
      success: true,
      message: 'Branch created successfully',
      data: { branch }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update branch
exports.updateBranch = async (req, res) => {
  try {
    const branch = await Branch.findOneAndUpdate(
      {
        _id: req.params.id,
        organization: req.user.organization._id
      },
      req.body,
      { new: true, runValidators: true }
    );

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found'
      });
    }

    res.json({
      success: true,
      message: 'Branch updated successfully',
      data: { branch }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete branch (soft delete)
exports.deleteBranch = async (req, res) => {
  try {
    // Check if branch has warehouses
    const warehouseCount = await Warehouse.countDocuments({
      branch: req.params.id,
      isActive: true
    });

    if (warehouseCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete branch with active warehouses'
      });
    }

    const branch = await Branch.findOneAndUpdate(
      {
        _id: req.params.id,
        organization: req.user.organization._id
      },
      { isActive: false },
      { new: true }
    );

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found'
      });
    }

    res.json({
      success: true,
      message: 'Branch deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
