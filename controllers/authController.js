const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { uploadToCloudinary } = require('../config/cloudinary');
const fs = require('fs');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '24h'
  });
};

// Verify Google ID token
const verifyGoogleToken = async (idToken) => {
  console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Set' : 'NOT SET');
  console.log('Token length:', idToken?.length);
  console.log('Token preview:', idToken?.substring(0, 50) + '...');

  const ticket = await client.verifyIdToken({
    idToken: idToken,
    audience: process.env.GOOGLE_CLIENT_ID
  });
  return ticket.getPayload();
};

// @desc    Register new user with Google auth
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { credential, name, gender, preference } = req.body;

    console.log('Register request:', { hasCredential: !!credential, name, gender, preference, hasFile: !!req.file });

    if (!credential) {
      return res.status(400).json({ message: 'Google credential is required' });
    }

    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    if (!gender || !['boy', 'girl'].includes(gender)) {
      return res.status(400).json({ message: 'Gender is required (boy or girl)' });
    }

    if (!preference || !['boy', 'girl', 'both'].includes(preference)) {
      return res.status(400).json({ message: 'Preference is required (boy, girl, or both)' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Profile image is required' });
    }

    // Verify Google token
    let googlePayload;
    try {
      googlePayload = await verifyGoogleToken(credential);
      console.log('Google token verified:', { sub: googlePayload.sub, email: googlePayload.email });
    } catch (error) {
      console.error('Google verification error:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(401).json({ message: 'Invalid Google credential: ' + error.message });
    }

    const { sub: googleId, email } = googlePayload;

    if (!googleId || !email) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(401).json({ message: 'Could not get Google account info' });
    }

    // Check if user already exists with this Google ID
    const existingUser = await User.findOne({ googleId });
    if (existingUser) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'User already registered. Please login instead.' });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Email already registered. Please login instead.' });
    }

    // Upload image to Cloudinary
    const imageUrl = await uploadToCloudinary(req.file.path);

    // Clean up local file after upload
    fs.unlinkSync(req.file.path);

    // Create user
    const user = await User.create({
      googleId,
      email,
      name: name.trim(),
      image: imageUrl,
      gender,
      preference
    });

    // Generate token and respond
    const token = generateToken(user._id);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      image: user.image,
      gender: user.gender,
      preference: user.preference,
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

// @desc    Login user with Google
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: 'Google credential is required' });
    }

    // Verify Google token
    let googlePayload;
    try {
      googlePayload = await verifyGoogleToken(credential);
      console.log('Login - Google token verified:', { sub: googlePayload.sub, email: googlePayload.email });
    } catch (error) {
      console.error('Login - Google verification error:', error.message);
      return res.status(401).json({ message: 'Invalid Google credential' });
    }

    const { sub: googleId } = googlePayload;

    if (!googleId) {
      return res.status(401).json({ message: 'Could not get Google account info' });
    }

    // Find user by Google ID
    const user = await User.findOne({ googleId });

    if (!user) {
      return res.status(401).json({ message: 'User not found. Please register first.' });
    }

    // Generate token and respond
    const token = generateToken(user._id);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      image: user.image,
      gender: user.gender,
      preference: user.preference,
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
    const user = await User.findById(req.user._id).select('-swipedLeft -swipedRight -googleId');
    res.json(user);
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { register, login, getMe };
