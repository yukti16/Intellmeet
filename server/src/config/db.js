const mongoose = require('mongoose');

/**
 * Mask a MongoDB URI for safe logging (hide credentials).
 * e.g. "mongodb+srv://user:pass@cluster.mongodb.net/db" → "mongodb+srv://***:***@cluster.mongodb.net/db"
 */
const maskUri = (uri) => {
  if (!uri) return '(not set)';
  try {
    return uri.replace(
      /\/\/([^:]+):([^@]+)@/,
      '//***:***@'
    );
  } catch {
    return '(unable to parse URI)';
  }
};

const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/intellmeet';

  console.log(`[DB] Attempting MongoDB connection to: ${maskUri(uri)}`);

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`[DB] ✅ MongoDB Connected Successfully`);
    console.log(`[DB]    Host: ${conn.connection.host}`);
    console.log(`[DB]    Database: ${conn.connection.name}`);
    console.log(`[DB]    Port: ${conn.connection.port}`);

    // Listen for mid-session connection events
    mongoose.connection.on('disconnected', () => {
      console.warn('[DB] ⚠️  MongoDB connection lost. Mongoose will attempt to reconnect.');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('[DB] ✅ MongoDB reconnected successfully.');
    });

    mongoose.connection.on('error', (err) => {
      console.error(`[DB] ❌ MongoDB connection error: ${err.message}`);
    });

    return conn;
  } catch (error) {
    console.error(`[DB] ❌ Failed to connect to MongoDB: ${error.message}`);
    console.error(`[DB]    URI used: ${maskUri(uri)}`);
    console.error(`[DB]    Ensure MongoDB is running and the MONGO_URI env variable in server/.env is correct.`);
    // Re-throw so the caller (server.js) knows the connection failed
    throw error;
  }
};

module.exports = connectDB;
