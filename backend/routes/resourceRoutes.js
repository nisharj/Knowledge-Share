import express from "express";
import {
  createResource,
  deleteResource,
  getResourceById,
  getResources,
  getTrendingResources,
  incrementResourceView,
  optimizeResourceDescription,
  updateResource,
} from "../controllers/resourceController.js";
import { protectAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Specific routes BEFORE parameterized routes
router.get("/trending", getTrendingResources);
router.post("/:id/view", incrementResourceView);

// Generic routes
router.get("/", getResources);
router.get("/:id", getResourceById);

// Admin routes
router.post("/optimize-description", protectAdmin, optimizeResourceDescription);
router.post("/", protectAdmin, createResource);
router.put("/:id", protectAdmin, updateResource);
router.delete("/:id", protectAdmin, deleteResource);

export default router;
