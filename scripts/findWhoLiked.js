const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function findWhoLikedProfile(email) {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the target user by email
    const targetUser = await User.findOne({ email: email.toLowerCase().trim() });

    if (!targetUser) {
      console.log(`No user found with email: ${email}`);
      return;
    }

    console.log(`\nFound user: ${targetUser.name} (${targetUser.email})`);
    console.log(`User ID: ${targetUser._id}\n`);

    // Find all users who have this user in their swipedRight array
    const usersWhoLiked = await User.find({
      swipedRight: targetUser._id
    }).select('email name createdAt');

    if (usersWhoLiked.length === 0) {
      console.log('No one has liked this profile yet.');
    } else {
      console.log(`${usersWhoLiked.length} user(s) liked this profile:\n`);
      console.log('Email                                    | Name                | Joined');
      console.log('-'.repeat(80));

      usersWhoLiked.forEach(user => {
        const email = user.email.padEnd(40);
        const name = user.name.padEnd(20);
        const date = user.createdAt.toISOString().split('T')[0];
        console.log(`${email}| ${name}| ${date}`);
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.log('Usage: node scripts/findWhoLiked.js <email>');
  console.log('Example: node scripts/findWhoLiked.js user@example.com');
  process.exit(1);
}

findWhoLikedProfile(email);
