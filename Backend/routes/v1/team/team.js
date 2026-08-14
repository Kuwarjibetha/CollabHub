const express = require("express");
const router = express.Router();

const { verifyToken } = require("../../../middleware/auth");
const {
  createTeamController,
  joinTeamController,
  getMyTeamsController,
  leaveTeamController,
} = require("../../../controllers/v1/team");

router.post("/create", verifyToken, createTeamController);
router.post("/join", verifyToken, joinTeamController);
router.get("/my-teams", verifyToken, getMyTeamsController);
router.delete("/:teamId/leave", verifyToken, leaveTeamController);

module.exports = router;
