const express = require('express');
const router = express.Router();



const authRoutes = require('./auth');
const userRoutes = require('./user');
const teamRoutes = require("./team"); 

router.use("/auth", authRoutes);
router.use("/user", userRoutes);   
router.use("/team", teamRoutes); 


module.exports = router;