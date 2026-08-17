const jwt = require("jsonwebtoken");
const { User } = require("../../models");

// verify the token
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "No token provided" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.userId || decoded.id, { attributes: ["id", "isBlocked", "role"] });
    if (!user || user.isBlocked) return res.status(403).json({ success: false, message: "This account is blocked or not found" });

    let userRole = user.role;
    if (userRole === "admin") userRole = "SUPER_ADMIN";
    if (userRole === "user") userRole = "MEMBER";

    req.user = {
      id: user.id,
      userId: user.id,
      role: userRole,
    };

    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}

module.exports = { verifyToken };
