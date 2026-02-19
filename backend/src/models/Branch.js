const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Branch name is required'],
    trim: true
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
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, default: 'India' },
    zipCode: { type: String, required: true }
  },
  contact: {
    phone: String,
    email: String
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  operatingHours: {
    open: { type: String, default: '09:00' },
    close: { type: String, default: '18:00' }
  }
}, {
  timestamps: true
});

// Compound index to ensure unique branch code per organization
branchSchema.index({ organization: 1, code: 1 }, { unique: true });
branchSchema.index({ organization: 1 });

module.exports = mongoose.model('Branch', branchSchema);
