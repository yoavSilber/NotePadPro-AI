import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export const connectDB = async () => {
  const MONGO_URI = process.env.MONGODB_URI;
  if (!MONGO_URI) {
    console.error("FATAL: MONGODB_URI environment variable is not set.");
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected!");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
};
