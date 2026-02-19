const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  barcode: {
    type: String,
    trim: true,
    sparse: true
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  subcategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  unit: {
    type: String,
    required: [true, 'Unit is required'],
    enum: ['pcs', 'kg', 'g', 'l', 'ml', 'm', 'cm', 'ft', 'in', 'box', 'pack', 'dozen', 'pair', 'set', 'bundle'],
    default: 'pcs'
  },
  costPrice: {
    type: Number,
    required: [true, 'Cost price is required'],
    min: 0
  },
  sellingPrice: {
    type: Number,
    required: [true, 'Selling price is required'],
    min: 0
  },
  mrp: {
    type: Number,
    min: 0
  },
  taxRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  taxType: {
    type: String,
    enum: ['none', 'gst', 'vat'],
    default: 'none'
  },
  hsnCode: {
    type: String
  },
  minStockLevel: {
    type: Number,
    default: 0,
    min: 0
  },
  maxStockLevel: {
    type: Number,
    default: 0,
    min: 0
  },
  reorderPoint: {
    type: Number,
    default: 0,
    min: 0
  },
  hasExpiry: {
    type: Boolean,
    default: false
  },
  shelfLife: {
    type: Number, // in days
    default: 0
  },
  weight: {
    value: Number,
    unit: { type: String, enum: ['kg', 'g', 'lb', 'oz'] }
  },
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    unit: { type: String, enum: ['cm', 'm', 'in', 'ft'] }
  },
  images: [{
    url: String,
    alt: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
  }],
  metaData: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

// Indexes
productSchema.index({ organization: 1 });
productSchema.index({ organization: 1, category: 1 });
// Removed duplicate indexes for sku and barcode (already unique in schema)
productSchema.index({ name: 'text', description: 'text' });

// Virtual for profit margin
productSchema.virtual('profitMargin').get(function() {
  if (this.costPrice === 0) return 0;
  return ((this.sellingPrice - this.costPrice) / this.costPrice * 100).toFixed(2);
});

// Method to check if stock is low
productSchema.methods.isLowStock = function(currentStock) {
  return currentStock <= this.minStockLevel;
};

module.exports = mongoose.model('Product', productSchema);
