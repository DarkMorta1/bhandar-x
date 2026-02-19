const mongoose = require('mongoose');

const warehouseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Warehouse name is required'],
    trim: true
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
  code: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['main', 'retail', 'storage', 'cold_storage'],
    default: 'main'
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: { type: String, default: 'India' },
    zipCode: String
  },
  capacity: {
    type: Number, // in cubic meters or units
    default: 0
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  description: {
    type: String
  }
}, {
  timestamps: true
});

// Compound index for unique warehouse code per branch
warehouseSchema.index({ branch: 1, code: 1 }, { unique: true });
warehouseSchema.index({ organization: 1 });
warehouseSchema.index({ branch: 1 });

module.exports = mongoose.model('Warehouse', warehouseSchema);
