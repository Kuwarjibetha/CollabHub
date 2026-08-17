const { User, Team, TeamMember, Message, Notification, sequelize } = require("../../../models");
const { Op } = require("sequelize");

// user management
async function getAllUsers({ search }) {
  const where = search
    ? { [Op.or]: [{ name: { [Op.like]: `%${search}%` } }, { email: { [Op.like]: `%${search}%` } }] }
    : {};

  const users = await User.findAll({
    where,
    attributes: ["id", "name", "email", "role", "isBlocked", "createdAt", "updatedAt"],
  });
  return users;
}

async function toggleUserBlock(userId, isBlocked) {
  const user = await User.findByPk(userId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }
  user.isBlocked = typeof isBlocked === "boolean" ? isBlocked : !user.isBlocked;
  await user.save();
  return user;
}

async function deleteUser(userId) {
  const user = await User.findByPk(userId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }
  await user.destroy();
  return { message: "User deleted" };
}

// team manage
async function getAllTeams() {
  const teams = await Team.findAll({
    include: [{ model: TeamMember }],
  });
  return teams;
}

async function deleteTeam(teamId) {
  const team = await Team.findByPk(teamId);
  if (!team) {
    const error = new Error("Team not found");
    error.statusCode = 404;
    throw error;
  }
  await team.destroy();
  return { message: "Team deleted" };
}

// chat modaration
async function deleteAnyMessage(messageId) {
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
}

// analys
async function getAnalytics() {
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
}

async function getAllMessages({ limit = 100, offset = 0 } = {}) {
  return Message.findAll({
    include: [{ model: User, as: "sender", attributes: ["id", "name", "email"] }, { model: Team, attributes: ["id", "name"] }],
    order: [["createdAt", "DESC"]], limit: Math.min(Number(limit) || 100, 200), offset: Number(offset) || 0,
  });
}

async function broadcast({ title, content }) {
  if (!title?.trim() || !content?.trim()) { const error = new Error("Title and message are required"); error.statusCode = 400; throw error; }
  const users = await User.findAll({ where: { isBlocked: false }, attributes: ["id"] });
  return Notification.bulkCreate(users.map((user) => ({ userId: user.id, type: "message", title: title.trim(), content: content.trim() })));
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
