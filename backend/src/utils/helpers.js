const crypto = require('crypto');

// Generate unique SKU
const generateSKU = (prefix = 'PRD', organizationId) => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${organizationId.toString().slice(-4)}-${timestamp}-${random}`;
};

// Generate invoice number
const generateInvoiceNumber = (prefix = 'INV', organizationId) => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}-${year}${month}${day}-${organizationId.toString().slice(-4)}-${random}`;
};

// Generate purchase number
const generatePurchaseNumber = (organizationId) => {
  return generateInvoiceNumber('PUR', organizationId);
};

// Generate transfer number
const generateTransferNumber = (organizationId) => {
  return generateInvoiceNumber('TRF', organizationId);
};

// Format currency
const formatCurrency = (amount, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

// Format date
const formatDate = (date, format = 'DD/MM/YYYY') => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return format
    .replace('DD', day)
    .replace('MM', month)
    .replace('YYYY', year)
    .replace('YY', year.toString().slice(-2));
};

// Calculate tax
const calculateTax = (amount, taxRate, taxType = 'percentage') => {
  if (taxType === 'percentage') {
    return (amount * taxRate) / 100;
  }
  return taxRate;
};

// Calculate GST (India)
const calculateGST = (amount, gstRate, isInterState = false) => {
  const totalTax = (amount * gstRate) / 100;
  
  if (isInterState) {
    return {
      cgst: 0,
      sgst: 0,
      igst: totalTax,
      total: totalTax
    };
  }
  
  return {
    cgst: totalTax / 2,
    sgst: totalTax / 2,
    igst: 0,
    total: totalTax
  };
};

// Pagination helper
const paginate = (query, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  return query.skip(skip).limit(limit);
};

// Create pagination metadata
const createPaginationMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  };
};

// Generate slug
const generateSlug = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};

// Generate random code
const generateRandomCode = (length = 6) => {
  return crypto.randomBytes(length).toString('hex').toUpperCase().slice(0, length);
};

// Deep clone object
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

// Check if object is empty
const isEmpty = (obj) => {
  return Object.keys(obj).length === 0;
};

// Group array by key
const groupBy = (array, key) => {
  return array.reduce((result, item) => {
    const groupKey = item[key];
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {});
};

// Sum array by key
const sumBy = (array, key) => {
  return array.reduce((sum, item) => sum + (item[key] || 0), 0);
};

// Calculate percentage
const calculatePercentage = (value, total) => {
  if (total === 0) return 0;
  return ((value / total) * 100).toFixed(2);
};

// Round to decimal places
const round = (num, decimals = 2) => {
  return Math.round((num + Number.EPSILON) * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

// Get start of day
const startOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Get end of day
const endOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

// Get start of month
const startOfMonth = (date = new Date()) => {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Get end of month
const endOfMonth = (date = new Date()) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  d.setHours(23, 59, 59, 999);
  return d;
};

module.exports = {
  generateSKU,
  generateInvoiceNumber,
  generatePurchaseNumber,
  generateTransferNumber,
  formatCurrency,
  formatDate,
  calculateTax,
  calculateGST,
  paginate,
  createPaginationMeta,
  generateSlug,
  generateRandomCode,
  deepClone,
  isEmpty,
  groupBy,
  sumBy,
  calculatePercentage,
  round,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth
};
