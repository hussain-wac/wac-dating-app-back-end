const User = require('../models/User');

// @desc    Get all swipeable users (exclude self, already swiped)
// @route   GET /api/users
// @access  Private
const getSwipeableUsers = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);

    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get IDs to exclude: self + already swiped (left or right)
    const excludeIds = [
      currentUser._id,
      ...currentUser.swipedLeft,
      ...currentUser.swipedRight
    ];

    // Find users not in exclude list
    const users = await User.find({
      _id: { $nin: excludeIds }
    }).select('_id name image');

    res.json(users);
  } catch (error) {
    console.error('GetSwipeableUsers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Swipe on a user
// @route   POST /api/crush/swipe
// @access  Private
const swipe = async (req, res) => {
  try {
    const { targetUserId, direction } = req.body;

    if (!targetUserId || !direction) {
      return res.status(400).json({ message: 'targetUserId and direction are required' });
    }

    if (!['left', 'right'].includes(direction)) {
      return res.status(400).json({ message: 'Direction must be "left" or "right"' });
    }

    const currentUser = await User.findById(req.user._id);
    const targetUser = await User.findById(targetUserId);

    if (!currentUser || !targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent swiping on self
    if (currentUser._id.equals(targetUser._id)) {
      return res.status(400).json({ message: 'Cannot swipe on yourself' });
    }

    // Check if already swiped
    const alreadySwiped =
      currentUser.swipedLeft.includes(targetUserId) ||
      currentUser.swipedRight.includes(targetUserId);

    if (alreadySwiped) {
      return res.status(400).json({ message: 'Already swiped on this user' });
    }

    if (direction === 'left') {
      // Swipe left - not interested
      currentUser.swipedLeft.push(targetUserId);
      await currentUser.save();

      return res.json({ matched: false });
    }

    // Swipe right - interested
    currentUser.swipedRight.push(targetUserId);

    // Check if target user has already swiped right on current user
    const isMatch = targetUser.swipedRight.includes(currentUser._id);

    if (isMatch) {
      // It's a match! Add each other to matches array
      currentUser.matches.push(targetUserId);
      targetUser.matches.push(currentUser._id);
      await targetUser.save();
    }

    await currentUser.save();

    res.json({
      matched: isMatch,
      matchedUser: isMatch ? {
        _id: targetUser._id,
        name: targetUser.name,
        image: targetUser.image
      } : null
    });
  } catch (error) {
    console.error('Swipe error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getSwipeableUsers, swipe };
