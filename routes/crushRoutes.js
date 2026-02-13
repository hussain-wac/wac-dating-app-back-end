const express = require('express');
const { getSwipeableUsers, swipe } = require('../controllers/crushController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Routes
router.get('/users', protect, getSwipeableUsers);
router.post('/swipe', protect, swipe);

module.exports = router;
