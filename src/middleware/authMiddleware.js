const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401);
    return next(new Error('Authentication required'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'development-secret');
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      res.status(401);
      return next(new Error('User no longer exists'));
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401);
    next(new Error('Invalid or expired token'));
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'Admin') {
    res.status(403);
    return next(new Error('Admin access required'));
  }
  next();
};

module.exports = { protect, adminOnly };
