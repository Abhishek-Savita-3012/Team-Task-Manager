const User = require('../models/User');
const generateToken = require('../utils/generateToken');

const serializeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role
});

const signup = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      res.status(409);
      throw new Error('Email is already registered');
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'Member'
    });

    res.status(201).json({
      user: serializeUser(user),
      token: generateToken(user)
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      res.status(401);
      throw new Error('Invalid email or password');
    }

    res.json({
      user: serializeUser(user),
      token: generateToken(user)
    });
  } catch (error) {
    next(error);
  }
};

const me = async (req, res) => {
  res.json({ user: serializeUser(req.user) });
};

const listUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('name email role').sort({ name: 1 });
    res.json(users);
  } catch (error) {
    next(error);
  }
};

module.exports = { signup, login, me, listUsers };
