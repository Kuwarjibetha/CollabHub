const express = require("express");
const router = express.Router();

const { verifyToken } = require("../../../middleware/auth");
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

router.post("/create", verifyToken, createTeamController);
router.post("/join", verifyToken, joinTeamController);
router.get("/my-teams", verifyToken, getMyTeamsController);
router.get("/:teamId/members", verifyToken, getTeamMembersController);
router.patch("/:teamId/members/:userId", verifyToken, updateMemberRoleController);
router.delete("/:teamId/members/:userId", verifyToken, removeMemberController);
router.delete("/:teamId/leave", verifyToken, leaveTeamController);
router.delete("/:teamId", verifyToken, deleteTeamController);

module.exports = router;
