import jwt from "jsonwebtoken";

const getTokenFromHeader = (req) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.split(" ")[1];
};

export const protectUser = (req, res, next) => {
  const token = getTokenFromHeader(req);

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (_error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const protectAdmin = (req, res, next) => {
  protectUser(req, res, () => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  });
};
