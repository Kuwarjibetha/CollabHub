const express = require("express");
const router = express.Router();

const { verifyToken } = require("../../../middleware/auth");
const { requireAdmin } = require("../../../middleware/role");
const {
  getAllUsersController,
  toggleUserBlockController,
  deleteUserController,
  getAllTeamsController,
  deleteTeamController,
  deleteAnyMessageController,
  getAnalyticsController,
  getAllMessagesController,
  broadcastController,
} = require("../../../controllers/v1/admin");


router.get("/users", verifyToken, requireAdmin, getAllUsersController);
router.patch("/users/:userId/block", verifyToken, requireAdmin, toggleUserBlockController);
router.delete("/users/:userId", verifyToken, requireAdmin, deleteUserController);

router.get("/teams", verifyToken, requireAdmin, getAllTeamsController);
router.delete("/teams/:teamId", verifyToken, requireAdmin, deleteTeamController);

router.delete("/messages/:messageId", verifyToken, requireAdmin, deleteAnyMessageController);
router.get("/messages", verifyToken, requireAdmin, getAllMessagesController);
router.get("/analytics", verifyToken, requireAdmin, getAnalyticsController);
router.post("/broadcast", verifyToken, requireAdmin, broadcastController);

module.exports = router;
