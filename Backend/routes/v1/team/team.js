const express = require("express");
const router = express.Router();

const { verifyToken } = require("../../../middleware/auth");
const { requireTeamAdmin } = require("../../../middleware/role");
const {
  createTeamController,
  joinTeamController,
  getMyTeamsController,
  leaveTeamController,
  getTeamMembersController,
  updateMemberRoleController,
  removeMemberController,
  deleteTeamController,
} = require("../../../controllers/v1/team");

// Public authenticated team routes
router.post("/create", verifyToken, createTeamController);
router.post("/join", verifyToken, joinTeamController);
router.get("/my-teams", verifyToken, getMyTeamsController);
router.get("/:teamId/members", verifyToken, getTeamMembersController);
router.delete("/:teamId/leave", verifyToken, leaveTeamController);

// Team-level admin routes (strictly require TEAM_ADMIN for the specific team)
router.patch("/:teamId/members/:userId", verifyToken, requireTeamAdmin, updateMemberRoleController);
router.delete("/:teamId/members/:userId", verifyToken, requireTeamAdmin, removeMemberController);
router.delete("/:teamId", verifyToken, requireTeamAdmin, deleteTeamController);

module.exports = router;
