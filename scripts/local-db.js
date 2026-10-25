#!/usr/bin/env node

/**
 * Local MongoDB Server Runner
 *
 * Runs a standalone, persistent local MongoDB server using mongodb-memory-server
 * with storage saved to ./data/db so your data persists across restarts.
 *
 * Usage:
 *   npm run db
 *   node scripts/local-db.js
 */

const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

const DB_PATH = path.resolve(process.env.LOCAL_DB_PATH || './data/db');
const PORT = parseInt(process.env.MONGODB_PORT || '27017', 10);

async function startLocalDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(DB_PATH, { recursive: true });
  }

  console.log('--------------------------------------------------');
  console.log('🍃 Starting Eco-Coin Local MongoDB Server...');
  console.log(`📁 Database directory: ${DB_PATH}`);
  console.log(`🔌 Target port: ${PORT}`);
  console.log('--------------------------------------------------');

  let server;
  try {
    server = await MongoMemoryServer.create({
      instance: {
        port: PORT,
        dbPath: DB_PATH,
        storageEngine: 'wiredTiger',
        dbName: 'ecocoin',
      },
    });
  } catch (err) {
    if (err.message && err.message.includes('EADDRINUSE')) {
      console.log(`⚠️ Port ${PORT} is already in use by another MongoDB instance.`);
      console.log('Using the existing running instance...');
      return;
    }
    console.error('Failed to start MongoDB server with custom storage:', err.message);
    console.log('Falling back to pure in-memory server...');
    server = await MongoMemoryServer.create({
      instance: {
        port: PORT,
        dbName: 'ecocoin',
      },
    });
  }

  const uri = server.getUri() + 'ecocoin';
  console.log(`\n✅ Local MongoDB server is UP and RUNNING!`);
  console.log(`📡 Connection URI: ${uri}`);
  console.log(`\nYou can now run:`);
  console.log(`   npm run seed   (seed demo user and device data)`);
  console.log(`   npm run dev    (start Next.js frontend and API)\n`);

  // Optional: Check if database has users, seed if empty
  try {
    await mongoose.connect(uri);
    const collections = await mongoose.connection.db.listCollections().toArray();
    const hasUsers = collections.some((c) => c.name === 'users');
    let userCount = 0;
    if (hasUsers) {
      userCount = await mongoose.connection.db.collection('users').countDocuments();
    }
    if (userCount === 0) {
      console.log('🌱 Database is empty. Running initial seed...');
      const seedScript = require('./seed-db-fn');
      if (typeof seedScript === 'function') {
        await seedScript(mongoose);
        console.log('✅ Demo data seeded successfully!');
      }
    } else {
      console.log(`📊 Existing database found (${userCount} user(s)).`);
    }
    await mongoose.disconnect();
  } catch (seedErr) {
    console.warn('Note: Auto-seed skipped:', seedErr.message);
  }

  const shutdown = async () => {
    console.log('\n🛑 Shutting down local MongoDB server...');
    try {
      await server.stop();
      console.log('✅ Local MongoDB server stopped cleanly.');
    } catch (e) {
      // ignore
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startLocalDB().catch((err) => {
  console.error('Fatal error starting local DB:', err);
  process.exit(1);
});
