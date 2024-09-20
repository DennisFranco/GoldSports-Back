const { MongoClient } = require("mongodb");

let client;
let db;

const connectDB = async () => {
  if (client && client.isConnected()) {
    console.log("MongoDB already connected");
    return db;
  }

  try {
    client = await MongoClient.connect(process.env.MONGODB_URI);
    db = client.db(process.env.MONGODB_DB_NAME);
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message);
    process.exit(1); // Exit process with failure
  }
};

const getDB = () => {
  if (!db) {
    throw new Error("Database not connected");
  }
  return db;
};

module.exports = { connectDB, getDB };
