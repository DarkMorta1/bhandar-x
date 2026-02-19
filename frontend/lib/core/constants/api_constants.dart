class ApiConstants {
  // Base URL - Change this to your server URL
  static const String baseUrl = 'http://localhost:5000/api';
  
  // Auth Endpoints
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String refreshToken = '/auth/refresh';
  static const String logout = '/auth/logout';
  static const String me = '/auth/me';
  static const String changePassword = '/auth/change-password';
  static const String updateProfile = '/auth/profile';
  
  // Product Endpoints
  static const String products = '/products';
  static const String lowStockProducts = '/products/low-stock';
  static const String productByBarcode = '/products/barcode';
  static const String productBySku = '/products/sku';
  
  // Stock Endpoints
  static const String stock = '/stock';
  static const String stockIn = '/stock/in';
  static const String stockOut = '/stock/out';
  static const String stockAdjust = '/stock/adjust';
  static const String stockLedger = '/stock/ledger';
  static const String stockTransfers = '/stock/transfers';
  
  // Sales Endpoints
  static const String sales = '/sales';
  static const String todaySales = '/sales/today';
  static const String cancelSale = '/sales';
  static const String addPayment = '/sales';
  
  // Purchase Endpoints
  static const String purchases = '/purchases';
  static const String receivePurchase = '/purchases';
  
  // Customer Endpoints
  static const String customers = '/customers';
  static const String customerStatement = '/customers';
  
  // Supplier Endpoints
  static const String suppliers = '/suppliers';
  static const String supplierStatement = '/suppliers';
  
  // Organization Endpoints
  static const String organization = '/organizations';
  static const String organizationUsers = '/organizations/users';
  static const String organizationSettings = '/organizations/settings';
  
  // Branch Endpoints
  static const String branches = '/branches';
  
  // Warehouse Endpoints
  static const String warehouses = '/warehouses';
  
  // Dashboard Endpoints
  static const String dashboardSummary = '/dashboard/summary';
  static const String salesChart = '/dashboard/sales-chart';
  static const String categoryDistribution = '/dashboard/category-distribution';
  static const String stockOverview = '/dashboard/stock-overview';
  static const String lowStockAlerts = '/dashboard/low-stock-alerts';
  static const String expiringProducts = '/dashboard/expiring-products';
  
  // Report Endpoints
  static const String salesReport = '/reports/sales';
  static const String purchaseReport = '/reports/purchases';
  static const String stockReport = '/reports/stock';
  static const String profitLossReport = '/reports/profit-loss';
  static const String taxReport = '/reports/tax';
  static const String expiryReport = '/reports/expiry';
  static const String stockMovementReport = '/reports/stock-movement';
}

class AppConstants {
  // App Info
  static const String appName = 'Bhandar X';
  static const String appVersion = '1.0.0';
  static const String appTagline = 'Smart Inventory Management';
  
  // Storage Keys
  static const String tokenKey = 'auth_token';
  static const String refreshTokenKey = 'refresh_token';
  static const String userKey = 'user_data';
  static const String organizationKey = 'organization_data';
  static const String settingsKey = 'app_settings';
  static const String themeKey = 'theme_mode';
  
  // Pagination
  static const int defaultPageSize = 20;
  static const int maxPageSize = 100;
  
  // Date Formats
  static const String dateFormat = 'dd/MM/yyyy';
  static const String dateTimeFormat = 'dd/MM/yyyy HH:mm';
  static const String timeFormat = 'HH:mm';
  
  // Currency
  static const String defaultCurrency = 'INR';
  static const String currencySymbol = '₹';
}

class ErrorMessages {
  static const String genericError = 'Something went wrong. Please try again.';
  static const String networkError = 'Network error. Please check your connection.';
  static const String unauthorized = 'Session expired. Please login again.';
  static const String notFound = 'Resource not found.';
  static const String validationError = 'Please check your input and try again.';
  static const String serverError = 'Server error. Please try again later.';
  static const String timeoutError = 'Request timed out. Please try again.';
}
