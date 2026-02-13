const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    required: [true, 'Google ID is required'],
    unique: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  image: {
    type: String,
    required: [true, 'Profile image is required']
  },
  gender: {
    type: String,
    required: [true, 'Gender is required'],
    enum: ['boy', 'girl']
  },
  preference: {
    type: String,
    required: [true, 'Preference is required'],
    enum: ['boy', 'girl', 'both']
  },
  swipedLeft: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  swipedRight: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  matches: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    index: { expires: 0 }
  }
});

// Index for faster lookups
userSchema.index({ googleId: 1 });
userSchema.index({ swipedLeft: 1 });
userSchema.index({ swipedRight: 1 });
userSchema.index({ gender: 1, preference: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
