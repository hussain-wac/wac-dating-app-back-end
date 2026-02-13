const User = require('../models/User');

// @desc    Get current user's matches
// @route   GET /api/matches
// @access  Private
const getMatches = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('matches', '_id name image');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user.matches);
  } catch (error) {
    console.error('GetMatches error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getMatches };
