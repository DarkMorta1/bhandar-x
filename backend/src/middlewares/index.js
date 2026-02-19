module.exports = {
  auth: require('./auth.middleware'),
  validation: require('./validation.middleware'),
  errorHandler: require('./error.middleware')
};
