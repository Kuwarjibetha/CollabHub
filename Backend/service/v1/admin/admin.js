const { User, Team, TeamMember, Message, Notification, MessageReaction, sequelize } = require("../../../models");
const { Op } = require("sequelize");

// User management
async function getAllUsers({ search } = {}) {
  try {
    const where = search
      ? { [Op.or]: [{ name: { [Op.like]: `%${search}%` } }, { email: { [Op.like]: `%${search}%` } }] }
      : {};

    const users = await User.findAll({
      where,
      attributes: ["id", "name", "email", "role", "isBlocked", "createdAt", "updatedAt"],
    });
    return users;
  } catch (error) {
    throw error;
  }
}

async function toggleUserBlock(userId, isBlocked) {
  try {
    const user = await User.findByPk(userId);
    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }
    user.isBlocked = typeof isBlocked === "boolean" ? isBlocked : !user.isBlocked;
    await user.save();
    return user;
  } catch (error) {
    throw error;
  }
}

// delete user
async function deleteUser(userId) {
  const user = await User.findByPk(userId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const t = await sequelize.transaction();

  try {
    // 1. Clean up user's notifications
    await Notification.destroy({ where: { userId }, transaction: t });

    // 2. Clean up user's team memberships
    await TeamMember.destroy({ where: { userId }, transaction: t });

    // 3. Clean up user's reactions
    await MessageReaction.destroy({ where: { userId }, transaction: t });

    // 4. Destroy user account
    await user.destroy({ transaction: t });

    await t.commit();
    return { message: "User deleted successfully" };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

// Team management
async function getAllTeams() {
  try {
    const teams = await Team.findAll({
      include: [{ model: TeamMember }],
    });
    return teams;
  } catch (error) {
    throw error;
  }
}

//delete team
async function deleteTeam(teamId) {
  const team = await Team.findByPk(teamId);
  if (!team) {
    const error = new Error("Team not found");
    error.statusCode = 404;
    throw error;
  }

  const t = await sequelize.transaction();

  try {
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

    await Message.destroy({ where: { teamId }, transaction: t });
    await TeamMember.destroy({ where: { teamId }, transaction: t });
    await team.destroy({ transaction: t });

    await t.commit();
    return { message: "Team deleted" };
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

// Chat moderation
async function deleteAnyMessage(messageId) {
  try {
    const message = await Message.findByPk(messageId);
    if (!message) {
      const error = new Error("Message not found");
      error.statusCode = 404;
      throw error;
    }
    message.isDeleted = true;
    message.content = "This message was removed by admin";
    await message.save();
    return { message: "Message removed" };
  } catch (error) {
    throw error;
  }
}

// Platform Analytics
async function getAnalytics() {
  try {
    const totalUsers = await User.count();
    const totalTeams = await Team.count();
    const totalMessages = await Message.count();

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeUsersToday = await Message.count({
      distinct: true,
      col: "senderId",
      where: { createdAt: { [Op.gte]: oneDayAgo } },
    });

    return {
      totalUsers,
      totalTeams,
      totalMessages,
      activeUsersToday,
      activeUsers: activeUsersToday,
    };
  } catch (error) {
    throw error;
  }
}

async function getAllMessages({ limit = 100, offset = 0 } = {}) {
  try {
    return await Message.findAll({
      include: [
        { model: User, as: "sender", attributes: ["id", "name", "email"] },
        { model: Team, attributes: ["id", "name"] },
      ],
      order: [["createdAt", "DESC"]],
      limit: Math.min(Number(limit) || 100, 200),
      offset: Number(offset) || 0,
    });
  } catch (error) {
    throw error;
  }
}

// Broadcast notifications to all active users
async function broadcast({ title, content }) {
  if (!title?.trim() || !content?.trim()) {
    const error = new Error("Title and message are required");
    error.statusCode = 400;
    throw error;
  }

  const t = await sequelize.transaction();

  try {
    const users = await User.findAll({
      where: { isBlocked: false },
      attributes: ["id"],
      transaction: t,
    });

    const notifications = await Notification.bulkCreate(
      users.map((user) => ({
        userId: user.id,
        type: "message",
        title: title.trim(),
        content: content.trim(),
      })),
      { transaction: t }
    );

    await t.commit();
    return notifications;
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

module.exports = {
  getAllUsers,
  toggleUserBlock,
  deleteUser,
  getAllTeams,
  deleteTeam,
  deleteAnyMessage,
  getAnalytics,
  getAllMessages,
  broadcast,
};
