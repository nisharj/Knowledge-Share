import { isDatabaseConnected } from "../config/db.js";
import Resource from "../models/Resource.js";
import User from "../models/User.js";
import { sendBatchResourceNotifications } from "../services/emailService.js";

const parseCsvTags = (rawTags) => {
  if (!rawTags) return [];

  if (Array.isArray(rawTags)) {
    return rawTags
      .map((tag) => String(tag).trim().toLowerCase())
      .filter(Boolean);
  }

  return String(rawTags)
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
};

export const getResources = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(200).json({
        resources: [],
        pagination: {
          page: 1,
          limit: 0,
          total: 0,
          totalPages: 0,
        },
        degraded: true,
        message:
          "Resources are temporarily unavailable because the database is offline.",
      });
    }

    const { q, type, category, tags, page = 1, limit = 9 } = req.query;

    const query = {};

    if (q) {
      query.$or = [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { tags: { $elemMatch: { $regex: q, $options: "i" } } },
      ];
    }

    if (type) query.type = type;
    if (category) query.category = category;

    const parsedTags = parseCsvTags(tags);
    if (parsedTags.length > 0) {
      query.tags = { $all: parsedTags };
    }

    const pageNumber = Math.max(Number(page), 1);
    const pageLimit = Math.min(Math.max(Number(limit), 1), 500);
    const skip = (pageNumber - 1) * pageLimit;

    const [resources, total] = await Promise.all([
      Resource.find(query).sort({ createdAt: -1 }).skip(skip).limit(pageLimit),
      Resource.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / pageLimit);

    return res.status(200).json({
      resources,
      pagination: {
        page: pageNumber,
        limit: pageLimit,
        total,
        totalPages,
      },
    });
  } catch (_error) {
    return res.status(500).json({ message: "Failed to fetch resources" });
  }
};

export const getResourceById = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        message:
          "Resources are temporarily unavailable because the database is offline.",
      });
    }

    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({ message: "Resource not found" });
    }

    return res.status(200).json(resource);
  } catch (_error) {
    return res.status(500).json({ message: "Failed to fetch resource" });
  }
};

export const incrementResourceView = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(202).json({
        message: "View tracking skipped because the database is offline.",
      });
    }

    const resource = await Resource.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true },
    );

    if (!resource) {
      return res.status(404).json({ message: "Resource not found" });
    }

    return res.status(200).json(resource);
  } catch (_error) {
    return res.status(500).json({ message: "Failed to update view count" });
  }
};

export const createResource = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        message: "Cannot create resources while the database is offline.",
      });
    }

    const { title, description, link, type, category, tags } = req.body;

    if (!title || !description || !link || !type) {
      return res.status(400).json({
        message: "Missing required fields: title, description, link, type",
      });
    }

    const resource = await Resource.create({
      title: title.trim(),
      description: description.trim(),
      link: link.trim(),
      type,
      category: category || "general",
      tags: parseCsvTags(tags),
    });

    // Send email notifications to all registered users
    try {
      const allUsers = await User.find({ role: "user" }).select("name email");

      if (allUsers.length > 0) {
        const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

        // Send notifications asynchronously without blocking the response
        sendBatchResourceNotifications(allUsers, resource, clientUrl).catch(
          (error) => {
            console.error("Error sending batch notifications:", error.message);
          },
        );

        console.log(`Queued email notifications for ${allUsers.length} users`);
      }
    } catch (emailError) {
      console.error(
        "Error fetching users for notifications:",
        emailError.message,
      );
      // Don't fail the resource creation if email notification fails
    }

    return res.status(201).json(resource);
  } catch (error) {
    console.error("Create resource error:", error.message);
    return res.status(400).json({
      message: error.message || "Failed to create resource",
    });
  }
};

export const updateResource = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        message: "Cannot update resources while the database is offline.",
      });
    }

    const { title, description, link, type, category, tags } = req.body;

    if (!title || !description || !link || !type) {
      return res.status(400).json({
        message: "Missing required fields: title, description, link, type",
      });
    }

    const resource = await Resource.findByIdAndUpdate(
      req.params.id,
      {
        title: title.trim(),
        description: description.trim(),
        link: link.trim(),
        type,
        category: category || "general",
        tags: parseCsvTags(tags),
      },
      { new: true, runValidators: true },
    );

    if (!resource) {
      return res.status(404).json({ message: "Resource not found" });
    }

    return res.status(200).json(resource);
  } catch (error) {
    console.error("Update resource error:", error.message);
    return res.status(400).json({
      message: error.message || "Failed to update resource",
    });
  }
};

export const deleteResource = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        message: "Cannot delete resources while the database is offline.",
      });
    }

    const resource = await Resource.findByIdAndDelete(req.params.id);

    if (!resource) {
      return res.status(404).json({ message: "Resource not found" });
    }

    return res.status(200).json({ message: "Resource deleted" });
  } catch (_error) {
    return res.status(500).json({ message: "Failed to delete resource" });
  }
};

export const getTrendingResources = async (_req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(200).json([]);
    }

    const resources = await Resource.find({})
      .sort({ views: -1, createdAt: -1 })
      .limit(5);
    return res.status(200).json(resources);
  } catch (_error) {
    return res
      .status(500)
      .json({ message: "Failed to fetch trending resources" });
  }
};
