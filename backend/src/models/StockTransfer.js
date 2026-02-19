const mongoose = require('mongoose');

const transferItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  sku: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unit: {
    type: String,
    required: true
  },
  batchNumber: {
    type: String
  },
  expiryDate: {
    type: Date
  },
  notes: {
    type: String
  }
}, { _id: true });

const stockTransferSchema = new mongoose.Schema({
  transferNumber: {
    type: String,
    required: true,
    unique: true
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  sourceBranch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  sourceWarehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true
  },
  destinationBranch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  destinationWarehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true
  },
  items: [transferItemSchema],
  totalItems: {
    type: Number,
    required: true
  },
  totalQuantity: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'in_transit', 'received', 'cancelled'],
    default: 'draft'
  },
  transferDate: {
    type: Date,
    default: Date.now
  },
  receivedDate: {
    type: Date
  },
  notes: {
    type: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reference: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes
stockTransferSchema.index({ organization: 1, createdAt: -1 });
stockTransferSchema.index({ organization: 1, transferNumber: 1 });
stockTransferSchema.index({ sourceWarehouse: 1 });
stockTransferSchema.index({ destinationWarehouse: 1 });
stockTransferSchema.index({ status: 1 });

module.exports = mongoose.model('StockTransfer', stockTransferSchema);
