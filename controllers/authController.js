const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { uploadToCloudinary } = require('../config/cloudinary');
const fs = require('fs');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '24h'
  });
};

// @desc    Register new user with name and image
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Profile image is required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ name: name.trim() });
    if (existingUser) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'A user with this name already exists' });
    }

    // Upload image to Cloudinary
    const imageUrl = await uploadToCloudinary(req.file.path);

    // Clean up local file after upload
    fs.unlinkSync(req.file.path);

    // Create user
    const user = await User.create({
      name: name.trim(),
      image: imageUrl
    });

    // Generate token and respond
    const token = generateToken(user._id);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      image: user.image,
      token
    });
  } catch (error) {
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Register error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// @desc    Login user by name
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    // Find user by name
    const user = await User.findOne({ name: name.trim() });

    if (!user) {
      return res.status(401).json({ message: 'User not found. Please register first.' });
    }

    // Generate token and respond
    const token = generateToken(user._id);

    res.json({
      _id: user._id,
      name: user.name,
      image: user.image,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-swipedLeft -swipedRight');
    res.json(user);
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { register, login, getMe };
