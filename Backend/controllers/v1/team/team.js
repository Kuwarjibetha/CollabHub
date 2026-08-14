const teamService = require("../../../service/v1/team");

async function createTeamController(req, res) {

    try {

        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: "Team name is required" });
        }

        const team = await teamService.createTeam(req.user.userId, { name });
        return res.status(201).json({
            success: true,
            message: "Team created",
            data: team
        })
    } catch (err) {
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Something went wrong",
        });
    }
}

async function joinTeamController(req, res) {
    try {
        const { inviteCode } = req.body;

        if (!inviteCode) {
            return res.status(400).json({ success: false, message: "Invite code is required" });
        }

        const team = await teamService.joinTeam(req.user.userId, { inviteCode });

        return res.status(200).json({
            success: true,
            message: "Joined team successfully",
            data: team,
        });
    } catch (err) {
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Something went wrong",
        });
    }
}

async function getMyTeamsController(req, res) {
    try {
        const teams = await teamService.getMyTeams(req.user.userId);

        return res.status(200).json({
            success: true,
            message: "Teams fetched",
            data: teams,   
        });
    } catch (err) {
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Something went wrong",
        });
    }
}

async function leaveTeamController(req, res) {
    try {
        
        const { teamId } = req.params;

        const result = await teamService.leaveTeam(req.user.userId, teamId);

        return res.status(200).json({
            success: true,
            message: result.message,
        });
    } catch (err) {
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Something went wrong",
        });
    }
}

module.exports = {
    createTeamController,
    joinTeamController,
    getMyTeamsController,
    leaveTeamController,
};