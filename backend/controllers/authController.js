import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { isDatabaseConnected } from "../config/db.js";
import Resource from "../models/Resource.js";
import User from "../models/User.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const serializeUser = (user) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  role: user.role,
  bookmarks: (user.bookmarks || []).map((bookmark) => String(bookmark)),
});

const signToken = (user) =>
  jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    {
      expiresIn: "1d",
    },
  );

const validateAuthFields = ({ name, email, password }, isRegister = false) => {
  if (!email || !password || (isRegister && !name)) {
    return isRegister
      ? "Name, email, and password are required"
      : "Email and password are required";
  }

  if (!EMAIL_REGEX.test(normalizeEmail(email))) {
    return "Enter a valid email address";
  }

  if (isRegister && String(name).trim().length < 2) {
    return "Name must be at least 2 characters long";
  }

  if (isRegister && !PASSWORD_REGEX.test(String(password))) {
    return "Password must be 8+ characters and include uppercase, lowercase, number, and symbol";
  }

  return "";
};

const buildAuthResponse = (user) => ({
  token: signToken(user),
  user: serializeUser(user),
});

const requireDatabase = (res) => {
  if (isDatabaseConnected()) {
    return true;
  }

  res.status(503).json({
    message:
      "Authentication is temporarily unavailable because the database is offline.",
  });
  return false;
};

export const register = async (req, res) => {
  try {
    if (!requireDatabase(res)) {
      return;
    }

    const { name, email, password } = req.body;
    const validationMessage = validateAuthFields(
      { name, email, password },
      true,
    );

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    const normalizedEmail = normalizeEmail(email);
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        message: "An account already exists for this email",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "user",
    });

    return res.status(201).json(buildAuthResponse(user));
  } catch (_error) {
    return res.status(500).json({ message: "Registration failed" });
  }
};

export const login = async (req, res) => {
  try {
    if (!requireDatabase(res)) {
      return;
    }

    const { email, password } = req.body;
    const validationMessage = validateAuthFields({ email, password });

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    const user = await User.findOne({ email: normalizeEmail(email) }).select(
      "+password",
    );

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    return res.status(200).json(buildAuthResponse(user));
  } catch (_error) {
    return res.status(500).json({ message: "Login failed" });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    if (!requireDatabase(res)) {
      return;
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ user: serializeUser(user) });
  } catch (_error) {
    return res.status(500).json({ message: "Failed to load account" });
  }
};

export const toggleBookmark = async (req, res) => {
  try {
    if (!requireDatabase(res)) {
      return;
    }

    const { resourceId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(resourceId)) {
      return res.status(400).json({ message: "Invalid resource id" });
    }

    const resourceExists = await Resource.exists({ _id: resourceId });

    if (!resourceExists) {
      return res.status(404).json({ message: "Resource not found" });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const bookmarkId = String(resourceId);
    const isBookmarked = user.bookmarks.some(
      (bookmark) => String(bookmark) === bookmarkId,
    );

    if (isBookmarked) {
      user.bookmarks = user.bookmarks.filter(
        (bookmark) => String(bookmark) !== bookmarkId,
      );
    } else {
      user.bookmarks.push(resourceId);
    }

    await user.save();

    return res.status(200).json({
      bookmarked: !isBookmarked,
      user: serializeUser(user),
    });
  } catch (_error) {
    return res.status(500).json({ message: "Failed to update bookmarks" });
  }
};

export const bootstrapAdmin = async () => {
  try {
    if (!isDatabaseConnected()) {
      return;
    }

    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      console.warn(
        "ADMIN_EMAIL or ADMIN_PASSWORD missing, skipping admin bootstrap",
      );
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    const existing = await User.findOne({ email: normalizedEmail });

    if (existing) {
      console.log("Admin account already exists");
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await User.create({
      name: "Admin",
      email: normalizedEmail,
      password: hashedPassword,
      role: "admin",
    });

    console.log("Default admin account created successfully");
  } catch (error) {
    console.error("Error bootstrapping admin account:", error.message);
  }
};
