import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";

import { connectDB, isDatabaseConnected } from "./config/db.js";
import { bootstrapAdmin } from "./controllers/authController.js";
import authRoutes from "./routes/authRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import resourceRoutes from "./routes/resourceRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  ...String(process.env.CLIENT_URL || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean),
];

// Security middleware
app.use(helmet());

// CORS (restricted)
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalizedOrigin = origin.replace(/\/$/, "");

      if (allowedOrigins.includes(normalizedOrigin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    database: isDatabaseConnected() ? "connected" : "disconnected",
  });
});

// Routes
app.use("/api/resources", resourceRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Server error" });
});

const startServer = async () => {
  try {
    const databaseConnected = await connectDB();

    if (databaseConnected) {
      await bootstrapAdmin();
    } else {
      console.warn(
        "Starting API in degraded mode because MongoDB is currently unavailable.",
      );
    }

    app.listen(PORT, () => {
      console.log(
        `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`,
      );
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
