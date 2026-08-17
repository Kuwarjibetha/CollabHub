const { TeamMember } = require("../../models");

/**
 * Super Admin Middleware:
 * Verifies global application administrator role (req.user.role === "SUPER_ADMIN").
 * Non-SUPER_ADMIN users (including MEMBER and TEAM_ADMIN) calling /admin/* receive 403 Forbidden.
 */
function requireSuperAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const role = req.user.role;
  const isSuperAdmin = role === "SUPER_ADMIN" || role === "admin";

  if (!isSuperAdmin) {
    return res.status(403).json({
      success: false,
      message: "Forbidden: Super Admin access required",
    });
  }

  next();
}

/**
 * Team Admin Middleware:
 * Verifies that the current user is a TEAM_ADMIN of the specific requested team (teamId).
 * Checks: Current user ID + Requested team ID + team_members.role === "TEAM_ADMIN".
 * TEAM_ADMIN of Team A attempting to manage Team B receives 403 Forbidden.
 */
async function requireTeamAdmin(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const isSuperAdmin = req.user.role === "SUPER_ADMIN" || req.user.role === "admin";
    if (isSuperAdmin) {
      return next();
    }

    const teamId = req.params.teamId || req.body.teamId || req.query.teamId;
    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: "Team ID is required for team authorization",
      });
    }

    const userId = req.user.id || req.user.userId;

    const { Team } = require("../../models");
    const team = await Team.findByPk(teamId);
    if (team && String(team.createdBy) === String(userId)) {
      return next();
    }

    const membership = await TeamMember.findOne({
      where: { userId, teamId },
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You are not a member of this team",
      });
    }

    const role = membership.role;
    const isTeamAdmin = role === "TEAM_ADMIN" || role === "admin";

    if (!isTeamAdmin) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Team Admin access required for this team",
      });
    }

    req.teamMember = membership;
    next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Team authorization check failed",
    });
  }
}

module.exports = {
  requireSuperAdmin,
  requireTeamAdmin,
  requireAdmin: requireSuperAdmin, // Legacy alias
};