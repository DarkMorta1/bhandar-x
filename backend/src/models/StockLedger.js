const mongoose = require('mongoose');

const stockLedgerSchema = new mongoose.Schema({
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
  quantityChange: {
    type: Number,
    required: true
  },
  previousQuantity: {
    type: Number,
    required: true
  },
  newQuantity: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['purchase', 'sale', 'sale_return', 'purchase_return', 'transfer_in', 'transfer_out', 'adjustment', 'opening', 'damage', 'expired', 'production'],
    required: true
  },
  referenceType: {
    type: String,
    enum: ['purchase', 'sale', 'transfer', 'adjustment', 'opening', 'production'],
    required: true
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  referenceNumber: {
    type: String
  },
  unitCost: {
    type: Number,
    default: 0
  },
  totalCost: {
    type: Number,
    default: 0
  },
  batchNumber: {
    type: String
  },
  expiryDate: {
    type: Date
  },
  notes: {
    type: String
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  performedAt: {
    type: Date,
    default: Date.now
  },
  sourceWarehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse'
  },
  destinationWarehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse'
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
stockLedgerSchema.index({ organization: 1, createdAt: -1 });
stockLedgerSchema.index({ product: 1, createdAt: -1 });
stockLedgerSchema.index({ warehouse: 1, createdAt: -1 });
stockLedgerSchema.index({ type: 1 });
stockLedgerSchema.index({ referenceId: 1 });
stockLedgerSchema.index({ performedBy: 1 });
stockLedgerSchema.index({ createdAt: -1 });

module.exports = mongoose.model('StockLedger', stockLedgerSchema);
