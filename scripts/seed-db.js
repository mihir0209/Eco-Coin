// Script to seed the database with initial data
// Run with: npm run seed

const fs = require('fs');
const path = require('path');
const envPath = fs.existsSync(path.resolve('.env.local')) ? '.env.local' : '.env';
require('dotenv').config({ path: envPath });

const mongoose = require('mongoose');
const seedData = require('./seed-db-fn');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ecocoin';

async function seedDatabase() {
  let tempServer = null;
  try {
    console.log(`Connecting to MongoDB at: ${MONGODB_URI}...`);
    try {
      await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 2000 });
      console.log('✅ Connected to MongoDB');
    } catch (connErr) {
      console.warn(`Could not connect to ${MONGODB_URI} (${connErr.message}). Starting temporary local MongoMemoryServer...`);
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const dbPath = path.resolve('./data/db');
      if (!fs.existsSync(dbPath)) {
        fs.mkdirSync(dbPath, { recursive: true });
      }
      try {
        tempServer = await MongoMemoryServer.create({
          instance: {
            port: 27017,
            dbPath: dbPath,
            storageEngine: 'wiredTiger',
            dbName: 'ecocoin',
          },
        });
      } catch (e) {
        tempServer = await MongoMemoryServer.create({ instance: { dbName: 'ecocoin' } });
      }
      await mongoose.connect(tempServer.getUri() + 'ecocoin');
      console.log('✅ Connected to temporary local Mongo server');
    }

    const { user, devices, notifications, rewards, transactions, deviceCodes } = await seedData(mongoose);

    console.log('Cleared existing data');
    console.log('Created user:', user.email);
    console.log('Created', devices.length, 'devices');
    console.log('Created', notifications.length, 'notifications');
    console.log('Created', rewards.length, 'rewards');
    console.log('Created', transactions.length, 'transactions');
    console.log('Created', deviceCodes.length, 'manufacturer device codes');
    console.log('🎉 Database seeded successfully!');

    await mongoose.connection.close();
    if (tempServer) await tempServer.stop();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    try { await mongoose.connection.close(); } catch (e) {}
    if (tempServer) try { await tempServer.stop(); } catch (e) {}
    process.exit(1);
  }
}

seedDatabase();
