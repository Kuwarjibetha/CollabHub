const express = require("express");
const router = express.Router();


const {verifyToken} = require("../../../middleware/auth");    // middleware
const upload = require("../../../middleware/upload"); 

const {getProfileController, updateProfileController, changePasswordController,uploadProfilePicController } = require("../../../controllers/v1/user");


router.get("/me", verifyToken, getProfileController);
router.patch("/me", verifyToken, updateProfileController);
router.patch("/change-password", verifyToken, changePasswordController);




router.post("/profile-pic", verifyToken, upload.single("profilePic"), uploadProfilePicController);

module.exports = router;