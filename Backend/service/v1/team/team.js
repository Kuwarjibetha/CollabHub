const { nanoid } = require("nanoid");
const { sequelize, Team, TeamMember, User, Message, MessageReaction } = require("../../../models");
const { Op } = require("sequelize");

/**
 * Create a team with Database Transaction
 * Wraps Team creation and TeamMember (Admin) assignment in an atomic transaction.
 */
async function createTeam(userId, { name }) {
  const t = await sequelize.transaction();

  try {
    const inviteCode = nanoid(8);

    const team = await Team.create(
      {
        name,
        inviteCode,
        createdBy: userId,
      },
      { transaction: t }
    );

    await TeamMember.create(
      {
        userId,
        teamId: team.id,
        role: "TEAM_ADMIN",
      },
      { transaction: t }
    );

    await t.commit();
    return team;
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

// Join team using invite code (Resilient case-insensitive & character-flexible match)
async function joinTeam(userId, { inviteCode }) {
  try {
    const rawCode = (inviteCode || "").trim();

    if (!rawCode) {
      const error = new Error("Invite code is required");
      error.statusCode = 400;
      throw error;
    }

    // Flexible match: exact, with/without hyphen/underscore, and case-insensitive
    const team = await Team.findOne({
      where: {
        [Op.or]: [
          { inviteCode: rawCode },
          { inviteCode: `-${rawCode}` },
          { inviteCode: `_${rawCode}` },
          sequelize.where(sequelize.fn("UPPER", sequelize.col("inviteCode")), rawCode.toUpperCase()),
          sequelize.where(sequelize.fn("UPPER", sequelize.col("inviteCode")), `-${rawCode.toUpperCase()}`),
          sequelize.where(sequelize.fn("UPPER", sequelize.col("inviteCode")), `_${rawCode.toUpperCase()}`),
        ],
      },
    });

    if (!team) {
      const error = new Error("Invalid invite code");
      error.statusCode = 404;
      throw error;
    }

    const existingMember = await TeamMember.findOne({
      where: { userId, teamId: team.id },
    });

    if (existingMember) {
      const error = new Error("You are already a member of this team");
      error.statusCode = 400;
      throw error;
    }

    await TeamMember.create({
      userId,
      teamId: team.id,
      role: "MEMBER",
    });

    return team;
  } catch (error) {
    throw error;
  }
}

// Get my teams
async function getMyTeams(userId) {
  try {
    const memberships = await TeamMember.findAll({
      where: { userId },
      include: [{ model: Team }],
    });

    return memberships
      .filter((m) => m && m.Team)
      .map((m) => {
        const isOwner = String(m.Team.createdBy) === String(userId);
        const isTeamAdmin = isOwner || m.role === "TEAM_ADMIN" || m.role === "admin";
        return {
          ...m.Team.toJSON(),
          myRole: isTeamAdmin ? "TEAM_ADMIN" : "MEMBER",
        };
      });
  } catch (error) {
    throw error;
  }
}

/**
 * Leave team with Database Transaction
 * Atomically reassigns ownership if creator leaves and destroys membership.
 */
async function leaveTeam(userId, teamId) {
  const membership = await TeamMember.findOne({ where: { userId, teamId } });

  if (!membership) {
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

  const t = await sequelize.transaction();

  try {
    // If owner/creator is leaving and other members exist, reassign createdBy and admin role to next member
    if (team && String(team.createdBy) === String(userId)) {
      const nextMember = await TeamMember.findOne({
        where: { teamId, userId: { [Op.ne]: userId } },
        transaction: t,
      });

      if (nextMember) {
        team.createdBy = nextMember.userId;
        await team.save({ transaction: t });

        nextMember.role = "TEAM_ADMIN";
        await nextMember.save({ transaction: t });
      }
    }

    await membership.destroy({ transaction: t });
    await t.commit();

    return { message: "Left the team successfully" };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

async function requireTeamAdmin(userId, teamId) {
  const membership = await TeamMember.findOne({ where: { userId, teamId } });
  if (!membership) {
    const error = new Error("Team member permission required");
    error.statusCode = 403;
    throw error;
  }
  return membership;
}

async function updateMemberRole(requesterId, teamId, memberId, role) {
  try {
    if (!["admin", "member", "TEAM_ADMIN", "MEMBER"].includes(role)) {
      const error = new Error("Role must be valid");
      error.statusCode = 400;
      throw error;
    }

    await requireTeamAdmin(requesterId, teamId);

    const member = await TeamMember.findOne({ where: { teamId, userId: memberId } });
    if (!member) {
      const error = new Error("Member not found");
      error.statusCode = 404;
      throw error;
    }

    member.role = role;
    await member.save();
    return member;
  } catch (error) {
    throw error;
  }
}

async function removeMember(requesterId, teamId, memberId) {
  try {
    await requireTeamAdmin(requesterId, teamId);
    if (requesterId === memberId) {
      const error = new Error("Use leave team to remove yourself");
      error.statusCode = 400;
      throw error;
    }

    const member = await TeamMember.findOne({ where: { teamId, userId: memberId } });
    if (!member) {
      const error = new Error("Member not found");
      error.statusCode = 404;
      throw error;
    }

    await member.destroy();
    return { message: "Member removed" };
  } catch (error) {
    throw error;
  }
}

/**
 * Delete team by owner with Database Transaction
 * Atomically cascades deletions of reactions, messages, team members, and the team.
 */
async function deleteTeamByOwner(userId, teamId) {
  const team = await Team.findByPk(teamId);
  if (!team) {
    const error = new Error("Team not found");
    error.statusCode = 404;
    throw error;
  }

  const t = await sequelize.transaction();

  try {
    // 1. Delete message reactions and messages
    const messages = await Message.findAll({
      where: { teamId },
      attributes: ["id"],
      transaction: t,
    });
    const messageIds = messages.map((m) => m.id);

    if (messageIds.length > 0) {
      await MessageReaction.destroy({
        where: { messageId: messageIds },
        transaction: t,
      });
    }

    await Message.destroy({
      where: { teamId },
      transaction: t,
    });

    // 2. Delete team members
    await TeamMember.destroy({
      where: { teamId },
      transaction: t,
    });

    // 3. Delete the team itself
    await team.destroy({ transaction: t });

    await t.commit();
    return { message: "Team deleted" };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

// Get team members
async function getTeamMembers(userId, teamId) {
  try {
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
  } catch (error) {
    throw error;
  }
}

module.exports = {
  createTeam,
  joinTeam,
  getMyTeams,
  leaveTeam,
  getTeamMembers,
  updateMemberRole,
  removeMember,
  deleteTeamByOwner,
};
