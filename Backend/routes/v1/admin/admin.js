const express = require("express");
const router = express.Router();

const { verifyToken } = require("../../../middleware/auth");
const { requireSuperAdmin } = require("../../../middleware/role");
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

// All /admin routes strictly require authentication and SUPER_ADMIN global role
router.get("/users", verifyToken, requireSuperAdmin, getAllUsersController);
router.patch("/users/:userId/block", verifyToken, requireSuperAdmin, toggleUserBlockController);
router.delete("/users/:userId", verifyToken, requireSuperAdmin, deleteUserController);

router.get("/teams", verifyToken, requireSuperAdmin, getAllTeamsController);
router.delete("/teams/:teamId", verifyToken, requireSuperAdmin, deleteTeamController);

router.delete("/messages/:messageId", verifyToken, requireSuperAdmin, deleteAnyMessageController);
router.get("/messages", verifyToken, requireSuperAdmin, getAllMessagesController);
router.get("/analytics", verifyToken, requireSuperAdmin, getAnalyticsController);
router.post("/broadcast", verifyToken, requireSuperAdmin, broadcastController);

module.exports = router;
