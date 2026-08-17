const express = require("express");
const router = express.Router();

const authRoutes = require("./auth");
const userRoutes = require("./user");
const teamRoutes = require("./team");
const chatRoutes = require("./chat");   

router.use("/auth", authRoutes);
router.use("/user", userRoutes);
router.use("/team", teamRoutes);
router.use("/chat", chatRoutes); 


module.exports = router;