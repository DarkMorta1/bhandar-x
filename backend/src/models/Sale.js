const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
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
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  discountPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  taxPercent: {
    type: Number,
    default: 0,
    min: 0
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  batchNumber: {
    type: String
  },
  costPrice: {
    type: Number,
    default: 0
  }
}, { _id: true });

const saleSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  customerName: {
    type: String,
    required: true
  },
  customerPhone: {
    type: String
  },
  customerEmail: {
    type: String
  },
  customerAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String
  },
  items: [saleItemSchema],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  totalDiscount: {
    type: Number,
    default: 0,
    min: 0
  },
  totalTax: {
    type: Number,
    default: 0,
    min: 0
  },
  shippingCharges: {
    type: Number,
    default: 0,
    min: 0
  },
  roundOff: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentStatus: {
    type: String,
    enum: ['paid', 'partial', 'unpaid', 'refunded'],
    default: 'unpaid'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'upi', 'bank_transfer', 'cheque', 'credit', 'wallet', 'other'],
    default: 'cash'
  },
  payments: [{
    amount: { type: Number, required: true },
    method: { type: String, required: true },
    reference: String,
    paidAt: { type: Date, default: Date.now },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  paidAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  balanceAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  dueDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['draft', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned'],
    default: 'draft'
  },
  notes: {
    type: String
  },
  terms: {
    type: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  salesPerson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  invoiceDate: {
    type: Date,
    default: Date.now
  },
  deliveredAt: {
    type: Date
  },
  isGstInvoice: {
    type: Boolean,
    default: false
  },
  gstDetails: {
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Indexes
saleSchema.index({ organization: 1, createdAt: -1 });
saleSchema.index({ organization: 1, invoiceNumber: 1 });
saleSchema.index({ customer: 1 });
saleSchema.index({ paymentStatus: 1 });
saleSchema.index({ status: 1 });
saleSchema.index({ invoiceDate: -1 });
saleSchema.index({ createdBy: 1 });

// Pre-save middleware to calculate balance
saleSchema.pre('save', function(next) {
  this.balanceAmount = this.totalAmount - this.paidAmount;
  
  // Update payment status based on paid amount
  if (this.paidAmount >= this.totalAmount) {
    this.paymentStatus = 'paid';
  } else if (this.paidAmount > 0) {
    this.paymentStatus = 'partial';
  } else {
    this.paymentStatus = 'unpaid';
  }
  
  next();
});

// Virtual for profit calculation
saleSchema.virtual('profit').get(function() {
  const totalCost = this.items.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);
  return this.totalAmount - totalCost;
});

module.exports = mongoose.model('Sale', saleSchema);
