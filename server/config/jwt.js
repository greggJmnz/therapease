const jwt = require('jsonwebtoken');
const { getRequiredEnv, getEnv } = require('./env');

const getJwtSecret = () => getRequiredEnv('JWT_SECRET');

const getJwtSignOptions = () => ({
  expiresIn: getEnv('JWT_EXPIRES_IN', '24h')
});

const signToken = (payload, options = {}) => {
  return jwt.sign(payload, getJwtSecret(), {
    ...getJwtSignOptions(),
    ...options
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, getJwtSecret());
};

module.exports = {
  getJwtSecret,
  getJwtSignOptions,
  signToken,
  verifyToken
};