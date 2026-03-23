import Resource from "../models/Resource.js";

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

    res.status(200).json({
      resources,
      pagination: {
        page: pageNumber,
        limit: pageLimit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch resources" });
  }
};

export const getResourceById = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({ message: "Resource not found" });
    }

    return res.status(200).json(resource);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch resource" });
  }
};

export const incrementResourceView = async (req, res) => {
  try {
    const resource = await Resource.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true },
    );

    if (!resource) {
      return res.status(404).json({ message: "Resource not found" });
    }

    return res.status(200).json(resource);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update view count" });
  }
};

export const createResource = async (req, res) => {
  try {
    const { title, description, link, type, category, tags } = req.body;

    // Validate required fields
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

    res.status(201).json(resource);
  } catch (error) {
    console.error("Create resource error:", error.message);
    res.status(400).json({
      message: error.message || "Failed to create resource",
    });
  }
};

export const updateResource = async (req, res) => {
  try {
    const { title, description, link, type, category, tags } = req.body;

    // Validate required fields
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
    const resource = await Resource.findByIdAndDelete(req.params.id);

    if (!resource) {
      return res.status(404).json({ message: "Resource not found" });
    }

    return res.status(200).json({ message: "Resource deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete resource" });
  }
};

export const getTrendingResources = async (_req, res) => {
  try {
    const resources = await Resource.find({})
      .sort({ views: -1, createdAt: -1 })
      .limit(5);
    res.status(200).json(resources);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch trending resources" });
  }
};
