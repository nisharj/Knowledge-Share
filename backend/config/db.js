import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error(
        "MONGO_URI not set in environment variables. Check your .env file.",
      );
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    console.log("✓ MongoDB connected successfully");
  } catch (error) {
    console.error(
      "✗ MongoDB connection failed:",
      error.message || error.toString(),
    );
    console.error("\nTroubleshooting tips:");
    console.error(
      "1. For MongoDB Atlas: Whitelist your IP address in Network Access",
    );
    console.error("2. Verify MONGO_URI in .env file");
    console.error("3. Check your internet connection");
    console.error(
      "4. For local testing, use: mongodb://localhost:27017/knowledge_hub",
    );
    process.exit(1);
  }
};
