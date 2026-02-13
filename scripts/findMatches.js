const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function findAllMatches() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Find all users who have at least one match
    const usersWithMatches = await User.find({
      matches: { $exists: true, $not: { $size: 0 } }
    }).populate('matches', 'name email');

    if (usersWithMatches.length === 0) {
      console.log('No matches found.');
      return;
    }

    // Track unique match pairs to avoid duplicates
    const seenPairs = new Set();
    const matchGroups = [];

    for (const user of usersWithMatches) {
      for (const match of user.matches) {
        // Create a consistent pair key (smaller ID first)
        const ids = [user._id.toString(), match._id.toString()].sort();
        const pairKey = ids.join('-');

        if (!seenPairs.has(pairKey)) {
          seenPairs.add(pairKey);
          matchGroups.push({
            person1: { name: user.name, email: user.email },
            person2: { name: match.name, email: match.email }
          });
        }
      }
    }

    console.log(`Found ${matchGroups.length} match(es):\n`);
    console.log('='.repeat(80));

    matchGroups.forEach((match, index) => {
      console.log(`\nMatch #${index + 1}`);
      console.log('-'.repeat(40));
      console.log(`  ${match.person1.name} (${match.person1.email})`);
      console.log(`  ❤️  matched with`);
      console.log(`  ${match.person2.name} (${match.person2.email})`);
    });

    console.log('\n' + '='.repeat(80));
    console.log(`\nTotal matches: ${matchGroups.length}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

findAllMatches();
