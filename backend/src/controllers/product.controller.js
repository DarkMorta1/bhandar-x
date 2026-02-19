const { Product, Category, Stock } = require('../models');
const { generateSKU, paginate, createPaginationMeta } = require('../utils/helpers');

// Get all products
exports.getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      lowStock
    } = req.query;

    const query = { organization: req.user.organization._id };

    // Apply filters
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) {
      query.category = category;
    }

    if (status !== undefined) {
      query.isActive = status === 'active';
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const productsQuery = Product.find(query)
      .populate('category', 'name color')
      .sort(sort);

    const products = await paginate(productsQuery, parseInt(page), parseInt(limit));
    const total = await Product.countDocuments(query);

    // If lowStock filter is applied, filter products
    let filteredProducts = products;
    if (lowStock === 'true') {
      const stockData = await Stock.find({
        organization: req.user.organization._id,
        $expr: { $lte: ['$availableQuantity', '$product.minStockLevel'] }
      }).populate('product');
      
      const lowStockProductIds = stockData.map(s => s.product._id.toString());
      filteredProducts = products.filter(p => lowStockProductIds.includes(p._id.toString()));
    }

    res.json({
      success: true,
      data: {
        products: filteredProducts,
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

// Get single product
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      organization: req.user.organization._id
    }).populate('category', 'name color');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Get stock information
    const stock = await Stock.find({
      product: product._id,
      organization: req.user.organization._id
    }).populate('warehouse', 'name code');

    res.json({
      success: true,
      data: {
        product,
        stock
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create product
exports.createProduct = async (req, res) => {
  try {
    const productData = {
      ...req.body,
      organization: req.user.organization._id,
      sku: req.body.sku || generateSKU('PRD', req.user.organization._id)
    };

    // Check if SKU already exists
    if (productData.sku) {
      const existingProduct = await Product.findOne({
        sku: productData.sku,
        organization: req.user.organization._id
      });

      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: 'SKU already exists'
        });
      }
    }

    const product = await Product.create(productData);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { product }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update product
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      {
        _id: req.params.id,
        organization: req.user.organization._id
      },
      req.body,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: { product }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete product
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({
      _id: req.params.id,
      organization: req.user.organization._id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Delete associated stock records
    await Stock.deleteMany({ product: req.params.id });

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get product by barcode
exports.getProductByBarcode = async (req, res) => {
  try {
    const { barcode } = req.params;

    const product = await Product.findOne({
      barcode,
      organization: req.user.organization._id
    }).populate('category', 'name color');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: { product }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get product by SKU
exports.getProductBySKU = async (req, res) => {
  try {
    const { sku } = req.params;

    const product = await Product.findOne({
      sku: sku.toUpperCase(),
      organization: req.user.organization._id
    }).populate('category', 'name color');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: { product }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Bulk create products
exports.bulkCreate = async (req, res) => {
  try {
    const { products } = req.body;

    const productsWithOrg = products.map(p => ({
      ...p,
      organization: req.user.organization._id,
      sku: p.sku || generateSKU('PRD', req.user.organization._id)
    }));

    const createdProducts = await Product.insertMany(productsWithOrg);

    res.status(201).json({
      success: true,
      message: `${createdProducts.length} products created successfully`,
      data: { products: createdProducts }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get low stock products
exports.getLowStockProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const stocks = await Stock.find({
      organization: req.user.organization._id,
      $expr: { $lte: ['$availableQuantity', '$product.minStockLevel'] }
    })
      .populate({
        path: 'product',
        populate: { path: 'category', select: 'name color' }
      })
      .populate('warehouse', 'name code');

    const total = stocks.length;

    res.json({
      success: true,
      data: {
        stocks,
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

// Update product status
exports.updateStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    const product = await Product.findOneAndUpdate(
      {
        _id: req.params.id,
        organization: req.user.organization._id
      },
      { isActive },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: `Product ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: { product }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
