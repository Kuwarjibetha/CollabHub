const adminService = require("../../../service/v1/admin");

async function getAllUsersController(req, res) {
  try {
    const { search } = req.query;
    const users = await adminService.getAllUsers({ search });
    return res.status(200).json({ success: true, message: "Users fetched", data: users });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.message || "Something went wrong" });
  }
}

async function toggleUserBlockController(req, res) {
  try {
    const { userId } = req.params;
    const { isBlocked } = req.body;
    const user = await adminService.toggleUserBlock(userId, isBlocked);
    return res.status(200).json({ success: true, message: "User updated", data: user });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.message || "Something went wrong" });
  }
}

async function deleteUserController(req, res) {
  try {
    const { userId } = req.params;
    const result = await adminService.deleteUser(userId);
    return res.status(200).json({ success: true, message: result.message });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.message || "Something went wrong" });
  }
}

async function getAllTeamsController(req, res) {
  try {
    const teams = await adminService.getAllTeams();
    return res.status(200).json({ success: true, message: "Teams fetched", data: teams });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.message || "Something went wrong" });
  }
}

async function deleteTeamController(req, res) {
  try {
    const { teamId } = req.params;
    const result = await adminService.deleteTeam(teamId);
    return res.status(200).json({ success: true, message: result.message });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.message || "Something went wrong" });
  }
}

async function deleteAnyMessageController(req, res) {
  try {
    const { messageId } = req.params;
    const result = await adminService.deleteAnyMessage(messageId);
    return res.status(200).json({ success: true, message: result.message });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.message || "Something went wrong" });
  }
}

async function getAnalyticsController(req, res) {
  try {
    const analytics = await adminService.getAnalytics();
    return res.status(200).json({ success: true, message: "Analytics fetched", data: analytics });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, message: err.message || "Something went wrong" });
  }
}

module.exports = {
  getAllUsersController,
  toggleUserBlockController,
  deleteUserController,
  getAllTeamsController,
  deleteTeamController,
  deleteAnyMessageController,
  getAnalyticsController,
};