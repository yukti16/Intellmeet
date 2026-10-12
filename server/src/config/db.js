const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/intellmeet', {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[DB] MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[DB Error] Failed to connect to MongoDB: ${error.message}`);
    console.warn('[DB Warning] Please ensure MongoDB is running locally on mongodb://127.0.0.1:27017/intellmeet or update MONGO_URI in server/.env');
    // We don't hard exit so dev/test setups can output diagnostic logs clearly
  }
};

module.exports = connectDB;
