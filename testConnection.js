// testConnection.js
const { connectDB, getDB } = require('./config/db');
require("dotenv").config();

console.log("MongoDB URI:", process.env.MONGODB_URI);

const testConnection = async () => {
  await connectDB();
  const db = getDB();
  console.log('Database name:', db.databaseName);
};

testConnection();
