const express = require("express");
const router = express.Router();

const { verifyToken } = require("../../../middleware/auth");
const {
  getMyNotificationsController,
  markAsReadController,
  markAllAsReadController,
} = require("../../../controllers/v1/notification");

router.get("/", verifyToken, getMyNotificationsController);
router.patch("/:notificationId/read", verifyToken, markAsReadController);
router.patch("/read-all", verifyToken, markAllAsReadController);

module.exports = router;