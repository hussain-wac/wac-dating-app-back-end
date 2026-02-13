const User = require('../models/User');

// @desc    Get all swipeable users (exclude self, already swiped, filtered by preference)
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

    // Build gender filter based on current user's preference
    // Also ensure the other user is interested in current user's gender
    const genderFilter = [];

    if (currentUser.preference === 'boy' || currentUser.preference === 'both') {
      // Show boys who are looking for current user's gender or both
      genderFilter.push({
        gender: 'boy',
        $or: [
          { preference: currentUser.gender },
          { preference: 'both' }
        ]
      });
    }

    if (currentUser.preference === 'girl' || currentUser.preference === 'both') {
      // Show girls who are looking for current user's gender or both
      genderFilter.push({
        gender: 'girl',
        $or: [
          { preference: currentUser.gender },
          { preference: 'both' }
        ]
      });
    }

    // Find users not in exclude list and matching preference criteria
    const users = await User.find({
      _id: { $nin: excludeIds },
      $or: genderFilter
    }).select('_id name image gender');

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
      currentUser.swipedLeft.some(id => id.equals(targetUserId)) ||
      currentUser.swipedRight.some(id => id.equals(targetUserId));

    if (alreadySwiped) {
      return res.status(400).json({ message: 'Already swiped on this user' });
    }

    if (direction === 'left') {
      // Swipe left - not interested (use updateOne to avoid full validation)
      await User.updateOne(
        { _id: currentUser._id },
        { $push: { swipedLeft: targetUserId } }
      );

      return res.json({ matched: false });
    }

    // Swipe right - interested
    // Check if target user has already swiped right on current user
    const isMatch = targetUser.swipedRight.some(id => id.equals(currentUser._id));

    if (isMatch) {
      // It's a match! Add each other to matches array (use updateOne to avoid full validation)
      await User.updateOne(
        { _id: currentUser._id },
        { $push: { swipedRight: targetUserId, matches: targetUserId } }
      );
      await User.updateOne(
        { _id: targetUser._id },
        { $push: { matches: currentUser._id } }
      );
    } else {
      // Just add to swipedRight
      await User.updateOne(
        { _id: currentUser._id },
        { $push: { swipedRight: targetUserId } }
      );
    }

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
