const Joi = require('joi');

// Validation middleware factory
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }
    
    next();
  };
};

// Common validation schemas
const schemas = {
  // Auth schemas
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    firstName: Joi.string().min(2).required(),
    lastName: Joi.string().min(2).required(),
    phone: Joi.string().optional(),
    organizationName: Joi.string().min(2).required()
  }),
  
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),
  
  refreshToken: Joi.object({
    refreshToken: Joi.string().required()
  }),
  
  // Product schemas
  product: Joi.object({
    name: Joi.string().min(2).required(),
    description: Joi.string().optional(),
    sku: Joi.string().optional(),
    barcode: Joi.string().optional(),
    category: Joi.string().optional(),
    unit: Joi.string().valid('pcs', 'kg', 'g', 'l', 'ml', 'm', 'cm', 'ft', 'in', 'box', 'pack', 'dozen', 'pair', 'set', 'bundle').required(),
    costPrice: Joi.number().min(0).required(),
    sellingPrice: Joi.number().min(0).required(),
    mrp: Joi.number().min(0).optional(),
    taxRate: Joi.number().min(0).max(100).optional(),
    taxType: Joi.string().valid('none', 'gst', 'vat').optional(),
    hsnCode: Joi.string().optional(),
    minStockLevel: Joi.number().min(0).optional(),
    maxStockLevel: Joi.number().min(0).optional(),
    reorderPoint: Joi.number().min(0).optional(),
    hasExpiry: Joi.boolean().optional(),
    shelfLife: Joi.number().min(0).optional(),
    isActive: Joi.boolean().optional()
  }),
  
  // Sale schemas
  sale: Joi.object({
    customer: Joi.string().optional(),
    customerName: Joi.string().required(),
    customerPhone: Joi.string().optional(),
    customerEmail: Joi.string().email().optional(),
    items: Joi.array().items(
      Joi.object({
        product: Joi.string().required(),
        quantity: Joi.number().min(1).required(),
        unitPrice: Joi.number().min(0).required(),
        discountPercent: Joi.number().min(0).max(100).optional(),
        taxPercent: Joi.number().min(0).optional()
      })
    ).min(1).required(),
    paymentMethod: Joi.string().valid('cash', 'card', 'upi', 'bank_transfer', 'cheque', 'credit', 'wallet', 'other').optional(),
    notes: Joi.string().optional(),
    discountAmount: Joi.number().min(0).optional()
  }),
  
  // Purchase schemas
  purchase: Joi.object({
    supplier: Joi.string().required(),
    supplierInvoiceNumber: Joi.string().optional(),
    items: Joi.array().items(
      Joi.object({
        product: Joi.string().required(),
        quantity: Joi.number().min(1).required(),
        unitPrice: Joi.number().min(0).required(),
        discountPercent: Joi.number().min(0).max(100).optional(),
        taxPercent: Joi.number().min(0).optional(),
        batchNumber: Joi.string().optional(),
        expiryDate: Joi.date().optional()
      })
    ).min(1).required(),
    paymentMethod: Joi.string().valid('cash', 'card', 'upi', 'bank_transfer', 'cheque', 'credit', 'other').optional(),
    notes: Joi.string().optional(),
    dueDate: Joi.date().optional()
  }),
  
  // Stock transfer schemas
  stockTransfer: Joi.object({
    sourceWarehouse: Joi.string().required(),
    destinationWarehouse: Joi.string().required(),
    items: Joi.array().items(
      Joi.object({
        product: Joi.string().required(),
        quantity: Joi.number().min(1).required(),
        batchNumber: Joi.string().optional(),
        notes: Joi.string().optional()
      })
    ).min(1).required(),
    notes: Joi.string().optional()
  }),
  
  // Customer schemas
  customer: Joi.object({
    name: Joi.string().min(2).required(),
    type: Joi.string().valid('individual', 'business').optional(),
    phone: Joi.string().optional(),
    email: Joi.string().email().optional(),
    address: Joi.object({
      street: Joi.string().optional(),
      city: Joi.string().optional(),
      state: Joi.string().optional(),
      zipCode: Joi.string().optional()
    }).optional(),
    gstNumber: Joi.string().optional(),
    creditLimit: Joi.number().min(0).optional(),
    notes: Joi.string().optional()
  }),
  
  // Supplier schemas
  supplier: Joi.object({
    name: Joi.string().min(2).required(),
    contactPerson: Joi.string().optional(),
    phone: Joi.string().optional(),
    email: Joi.string().email().optional(),
    address: Joi.object({
      street: Joi.string().optional(),
      city: Joi.string().optional(),
      state: Joi.string().optional(),
      zipCode: Joi.string().optional()
    }).optional(),
    gstNumber: Joi.string().optional(),
    creditLimit: Joi.number().min(0).optional(),
    creditPeriod: Joi.number().min(0).optional(),
    notes: Joi.string().optional()
  }),
  
  // Organization schemas
  organization: Joi.object({
    name: Joi.string().min(2).required(),
    description: Joi.string().optional(),
    address: Joi.object({
      street: Joi.string().optional(),
      city: Joi.string().optional(),
      state: Joi.string().optional(),
      country: Joi.string().optional(),
      zipCode: Joi.string().optional()
    }).optional(),
    contact: Joi.object({
      phone: Joi.string().optional(),
      email: Joi.string().email().optional(),
      website: Joi.string().optional()
    }).optional(),
    taxInfo: Joi.object({
      gstNumber: Joi.string().optional(),
      vatNumber: Joi.string().optional()
    }).optional()
  }),
  
  // Branch schemas
  branch: Joi.object({
    name: Joi.string().min(2).required(),
    code: Joi.string().min(2).max(10).required(),
    address: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      zipCode: Joi.string().required()
    }).required(),
    contact: Joi.object({
      phone: Joi.string().optional(),
      email: Joi.string().email().optional()
    }).optional()
  }),
  
  // Warehouse schemas
  warehouse: Joi.object({
    name: Joi.string().min(2).required(),
    code: Joi.string().min(2).max(10).required(),
    type: Joi.string().valid('main', 'retail', 'storage', 'cold_storage').optional(),
    address: Joi.object({
      street: Joi.string().optional(),
      city: Joi.string().optional(),
      state: Joi.string().optional(),
      zipCode: Joi.string().optional()
    }).optional(),
    capacity: Joi.number().min(0).optional(),
    description: Joi.string().optional()
  })
};

module.exports = {
  validate,
  schemas
};
