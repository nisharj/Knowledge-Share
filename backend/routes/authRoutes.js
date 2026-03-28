import express from "express";
import {
  getCurrentUser,
  login,
  register,
  toggleBookmark,
} from "../controllers/authController.js";
import { protectUser } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", protectUser, getCurrentUser);
router.post("/bookmarks/:resourceId", protectUser, toggleBookmark);

export default router;
