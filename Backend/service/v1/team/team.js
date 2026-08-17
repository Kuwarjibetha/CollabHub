const {nanoid} = require("nanoid");
const {Team, TeamMember, User} = require("../../../models");

// Create a team
async function createTeam(userId, {name}){
    const inviteCode = nanoid(8);
    const team = await Team.create({  
        name,
        inviteCode,
        createdBy:userId
    });

    await TeamMember.create({
        userId,
        teamId: team.id,
        role: "TEAM_ADMIN"
    });

    return team;
}

// Join 
async function joinTeam(userId,{inviteCode}){
    const team = await Team.findOne({ where:{inviteCode}});

    if (!team){
        const error = new Error("Invalid invite code");
        error.statusCode = 404;
        throw error;
    }

    const existingMember = await TeamMember.findOne({
        where:{userId, teamId: team.id},
    });

    if(existingMember){
        const error = new Error("You are already a member of this team");
        error.statusCode = 400;
        throw error;
    }

    await TeamMember.create({
        userId, teamId: team.id,
        role: "MEMBER",
    });
    return team;
}

// Get my team
async function getMyTeams(userId){
    const memberships = await TeamMember.findAll({
        where:{userId},
        include:[{ model:Team }],
    });

    return memberships
        .filter((m) => m && m.Team)
        .map((m)=> {
            const isOwner = String(m.Team.createdBy) === String(userId);
            const isTeamAdmin = isOwner || m.role === "TEAM_ADMIN" || m.role === "admin";
            return {
                ...m.Team.toJSON(),
                myRole: isTeamAdmin ? "TEAM_ADMIN" : "MEMBER",
            };
        });
}

// Leave team
async function leaveTeam(userId, teamId){
    const membership = await TeamMember.findOne({ where: { userId, teamId }});

    if(!membership){
        const error = new Error("You are not a member of this team");
        error.statusCode = 404;
        throw error;
    }

    const team = await Team.findByPk(teamId);
    const memberCount = await TeamMember.count({ where: { teamId } });

    // If only 1 member left in the team, delete the team completely
    if (memberCount <= 1 && team) {
        return await deleteTeamByOwner(userId, teamId);
    }

    // If owner/creator is leaving and other members exist, reassign createdBy and admin role to next member
    if (team && String(team.createdBy) === String(userId)) {
        const { Op } = require("sequelize");
        const nextMember = await TeamMember.findOne({
            where: { teamId, userId: { [Op.ne]: userId } }
        });
        if (nextMember) {
            team.createdBy = nextMember.userId;
            await team.save();
            nextMember.role = "TEAM_ADMIN";
            await nextMember.save();
        }
    }

    await membership.destroy();
    return { message: "Left the team successfully" };
}

async function requireTeamAdmin(userId, teamId) {
  const membership = await TeamMember.findOne({ where: { userId, teamId } });
  if (!membership) {
    const error = new Error("Team member permission required"); error.statusCode = 403; throw error;
  }
  return membership;
}

async function updateMemberRole(requesterId, teamId, memberId, role) {
  if (!["admin", "member", "TEAM_ADMIN", "MEMBER"].includes(role)) { const error = new Error("Role must be valid"); error.statusCode = 400; throw error; }
  await requireTeamAdmin(requesterId, teamId);
  const member = await TeamMember.findOne({ where: { teamId, userId: memberId } });
  if (!member) { const error = new Error("Member not found"); error.statusCode = 404; throw error; }
  member.role = role; await member.save(); return member;
}

async function removeMember(requesterId, teamId, memberId) {
  await requireTeamAdmin(requesterId, teamId);
  if (requesterId === memberId) { const error = new Error("Use leave team to remove yourself"); error.statusCode = 400; throw error; }
  const member = await TeamMember.findOne({ where: { teamId, userId: memberId } });
  if (!member) { const error = new Error("Member not found"); error.statusCode = 404; throw error; }
  await member.destroy(); return { message: "Member removed" };
}

async function deleteTeamByOwner(userId, teamId) {
  const team = await Team.findByPk(teamId);
  if (!team) { const error = new Error("Team not found"); error.statusCode = 404; throw error; }

  try {
    const { Message, MessageReaction } = require("../../../models");
    if (Message) {
      const messages = await Message.findAll({ where: { teamId }, attributes: ["id"] });
      const messageIds = messages.map(m => m.id);
      if (messageIds.length > 0 && MessageReaction) {
        await MessageReaction.destroy({ where: { messageId: messageIds } });
      }
      await Message.destroy({ where: { teamId } });
    }
  } catch (e) {
    console.warn("Message cleanup notice during delete:", e.message);
  }

  await TeamMember.destroy({ where: { teamId } });
  await team.destroy();
  return { message: "Team deleted" };
}

// Get team members
async function getTeamMembers(userId, teamId) {
    const membership = await TeamMember.findOne({ where: { userId, teamId } });
    if (!membership) {
        const error = new Error("You are not a member of this team");
        error.statusCode = 403;
        throw error;
    }

    const members = await TeamMember.findAll({
        where: { teamId },
        include: [{ model: User, attributes: ["id", "name", "email"] }],
    });

    return members;
}

module.exports = { createTeam, joinTeam, getMyTeams, leaveTeam, getTeamMembers, updateMemberRole, removeMember, deleteTeamByOwner };
