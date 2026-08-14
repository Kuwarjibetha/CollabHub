const express = require("express");
const router = express.Router();

const {signupController, loginController} = require("../../../controllers/v1/auth");


router.post("/signup", signupController);
router.post("/login", loginController);

module.exports = router;