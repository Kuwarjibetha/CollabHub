const express = require("express");
const router = express.Router();

const authRoutes = require("./auth");
const userRoutes = require("./user");
const teamRoutes = require("./team");
const chatRoutes = require("./chat");   
const adminRoutes = require("./admin");
const notificationRoutes = require("./notification");

router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/user", userRoutes);
router.use("/team", teamRoutes);
router.use("/chat", chatRoutes); 
router.use("/notification", notificationRoutes);

module.exports = router;