import mongoose from 'mongoose';
import { autoSeedIfEmpty } from './seed';

const DEFAULT_LOCAL_URI = 'mongodb://127.0.0.1:27017/ecocoin';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  serverInstance?: any;
  serverUri?: string;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache || {
  conn: null,
  promise: null,
  serverInstance: undefined,
  serverUri: undefined,
};

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

async function startMemoryServer(): Promise<{ uri: string; server: any }> {
  if (cached.serverInstance && cached.serverUri) {
    return { uri: cached.serverUri, server: cached.serverInstance };
  }

  const { MongoMemoryServer } = await import('mongodb-memory-server');
  const server = await MongoMemoryServer.create({
    instance: {
      dbName: 'ecocoin',
    },
  });

  const uri = server.getUri();
  cached.serverInstance = server;
  cached.serverUri = uri;
  return { uri, server };
}

async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn && cached.conn.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = (async () => {
      const targetUri = process.env.MONGODB_URI || DEFAULT_LOCAL_URI;

      // If user configured MONGODB_URI explicitly as "memory" or "embedded"
      if (targetUri === 'memory' || targetUri === 'embedded') {
        const { uri } = await startMemoryServer();
        const conn = await mongoose.connect(uri, { bufferCommands: false, dbName: 'ecocoin' });
        console.log(`✅ Embedded MongoMemoryServer connected at: ${uri}`);
        await autoSeedIfEmpty();
        return conn;
      }

      // If we already spun up an in-memory server in this runtime
      if (cached.serverUri) {
        const conn = await mongoose.connect(cached.serverUri, { bufferCommands: false, dbName: 'ecocoin' });
        return conn;
      }

      // Try connecting to target URI first (with a short timeout to prevent blocking if offline)
      try {
        const conn = await mongoose.connect(targetUri, {
          bufferCommands: false,
          serverSelectionTimeoutMS: 2000,
          connectTimeoutMS: 3000,
          dbName: 'ecocoin',
        });
        console.log(`✅ MongoDB connected successfully to ${targetUri}`);
        await autoSeedIfEmpty();
        return conn;
      } catch (err: any) {
        console.warn(
          `⚠️ Could not connect to MongoDB at ${targetUri} (${err.message || 'connection failed'}). Falling back to embedded local MongoMemoryServer...`
        );

        const { uri } = await startMemoryServer();
        const conn = await mongoose.connect(uri, { bufferCommands: false, dbName: 'ecocoin' });
        console.log(`✅ Embedded local MongoMemoryServer started and connected at: ${uri}`);
        await autoSeedIfEmpty();
        return conn;
      }
    })();
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export async function disconnectDB(): Promise<void> {
  if (cached.conn) {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
  }
  if (cached.serverInstance) {
    await cached.serverInstance.stop();
    cached.serverInstance = undefined;
    cached.serverUri = undefined;
  }
}

export default connectDB;
