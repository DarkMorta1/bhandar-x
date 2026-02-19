const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  reservedQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  availableQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  averageCost: {
    type: Number,
    default: 0,
    min: 0
  },
  lastPurchasePrice: {
    type: Number,
    default: 0,
    min: 0
  },
  lastPurchaseDate: {
    type: Date
  },
  lastSaleDate: {
    type: Date
  },
  batches: [{
    batchNumber: String,
    quantity: Number,
    expiryDate: Date,
    manufacturingDate: Date,
    costPrice: Number,
    receivedDate: { type: Date, default: Date.now }
  }],
  location: {
    aisle: String,
    rack: String,
    shelf: String,
    bin: String
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for unique stock record per product-warehouse combination
stockSchema.index({ product: 1, warehouse: 1 }, { unique: true });
stockSchema.index({ organization: 1 });
stockSchema.index({ branch: 1 });
stockSchema.index({ warehouse: 1 });
stockSchema.index({ product: 1 });
stockSchema.index({ 'batches.expiryDate': 1 });

// Pre-save middleware to calculate available quantity
stockSchema.pre('save', function(next) {
  this.availableQuantity = this.quantity - this.reservedQuantity;
  this.updatedAt = Date.now();
  next();
});

// Method to check if stock is low
stockSchema.methods.isLowStock = function(minStockLevel) {
  return this.availableQuantity <= minStockLevel;
};

// Method to get total value
stockSchema.methods.getStockValue = function() {
  return this.quantity * this.averageCost;
};

module.exports = mongoose.model('Stock', stockSchema);
