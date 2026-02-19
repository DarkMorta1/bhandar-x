const { Customer, Sale } = require('../models');
const { paginate, createPaginationMeta } = require('../utils/helpers');

// Get all customers
exports.getCustomers = async (req, res) => {
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

    const customersQuery = Customer.find(query).sort({ [sortBy]: 1 });

    const customers = await paginate(customersQuery, parseInt(page), parseInt(limit));
    const total = await Customer.countDocuments(query);

    res.json({
      success: true,
      data: {
        customers,
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

// Get single customer
exports.getCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      organization: req.user.organization._id
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Get recent sales
    const recentSales = await Sale.find({ customer: customer._id })
      .select('invoiceNumber totalAmount paymentStatus invoiceDate')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: { customer, recentSales }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create customer
exports.createCustomer = async (req, res) => {
  try {
    const customer = await Customer.create({
      ...req.body,
      organization: req.user.organization._id,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: { customer }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update customer
exports.updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      {
        _id: req.params.id,
        organization: req.user.organization._id
      },
      req.body,
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      message: 'Customer updated successfully',
      data: { customer }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete customer
exports.deleteCustomer = async (req, res) => {
  try {
    // Check if customer has sales
    const salesCount = await Sale.countDocuments({ customer: req.params.id });

    if (salesCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete customer with existing sales records'
      });
    }

    const customer = await Customer.findOneAndDelete({
      _id: req.params.id,
      organization: req.user.organization._id
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get customer statement
exports.getStatement = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const query = {
      customer: req.params.id,
      organization: req.user.organization._id,
      status: { $ne: 'cancelled' }
    };

    if (startDate || endDate) {
      query.invoiceDate = {};
      if (startDate) query.invoiceDate.$gte = new Date(startDate);
      if (endDate) query.invoiceDate.$lte = new Date(endDate);
    }

    const sales = await Sale.find(query)
      .select('invoiceNumber invoiceDate totalAmount paidAmount balanceAmount paymentStatus')
      .sort({ invoiceDate: -1 });

    const summary = {
      totalSales: sales.reduce((sum, sale) => sum + sale.totalAmount, 0),
      totalPaid: sales.reduce((sum, sale) => sum + sale.paidAmount, 0),
      totalBalance: sales.reduce((sum, sale) => sum + sale.balanceAmount, 0)
    };

    res.json({
      success: true,
      data: { sales, summary }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
