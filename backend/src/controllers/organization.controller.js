const { Organization, User, Branch, Warehouse } = require('../models');

// Get organization details
exports.getOrganization = async (req, res) => {
  try {
    const organization = await Organization.findById(req.user.organization._id);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    // Get counts
    const branchCount = await Branch.countDocuments({ organization: organization._id });
    const warehouseCount = await Warehouse.countDocuments({ organization: organization._id });
    const userCount = await User.countDocuments({ organization: organization._id, isActive: true });

    res.json({
      success: true,
      data: {
        organization,
        stats: {
          branchCount,
          warehouseCount,
          userCount
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

// Update organization
exports.updateOrganization = async (req, res) => {
  try {
    const organization = await Organization.findByIdAndUpdate(
      req.user.organization._id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    res.json({
      success: true,
      message: 'Organization updated successfully',
      data: { organization }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update organization settings
exports.updateSettings = async (req, res) => {
  try {
    const organization = await Organization.findByIdAndUpdate(
      req.user.organization._id,
      { $set: { settings: req.body } },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: { organization }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get organization users
exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const users = await User.find({
      organization: req.user.organization._id,
      isActive: true
    })
      .select('-password -refreshToken')
      .populate('branches', 'name code')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments({
      organization: req.user.organization._id,
      isActive: true
    });

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
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

// Add user to organization
exports.addUser = async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, role, branches } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      phone,
      role,
      branches,
      organization: req.user.organization._id
    });

    res.status(201).json({
      success: true,
      message: 'User added successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
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

// Update user
exports.updateUser = async (req, res) => {
  try {
    const { firstName, lastName, phone, role, branches, isActive } = req.body;

    const user = await User.findOneAndUpdate(
      {
        _id: req.params.userId,
        organization: req.user.organization._id
      },
      { firstName, lastName, phone, role, branches, isActive },
      { new: true, runValidators: true }
    ).select('-password -refreshToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Remove user
exports.removeUser = async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      {
        _id: req.params.userId,
        organization: req.user.organization._id
      },
      { isActive: false },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User removed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
