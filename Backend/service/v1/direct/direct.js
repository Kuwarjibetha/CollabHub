const { DirectMessage, User } = require("../../../models");
const { Op } = require("sequelize");

async function sendDirectMessage(senderId, recipientId, content) {
  try {
    if (!content?.trim()) {
      const error = new Error("Message content is required");
      error.statusCode = 400;
      throw error;
    }

    const recipient = await User.findByPk(recipientId);
    if (!recipient) {
      const error = new Error("Recipient not found");
      error.statusCode = 404;
      throw error;
    }

    const message = await DirectMessage.create({
      senderId,
      recipientId,
      content: content.trim(),
    });

    return await DirectMessage.findByPk(message.id, {
      include: [{ model: User, as: "sender", attributes: ["id", "name", "profilePic"] }],
    });
  } catch (error) {
    throw error;
  }
}

async function getConversation(userId, otherUserId, { limit = 50, offset = 0 } = {}) {
  try {
    const messages = await DirectMessage.findAll({
      where: {
        [Op.or]: [
          { senderId: userId, recipientId: otherUserId },
          { senderId: otherUserId, recipientId: userId },
        ],
      },
      include: [{ model: User, as: "sender", attributes: ["id", "name", "profilePic"] }],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    await DirectMessage.update(
      { isRead: true },
      { where: { senderId: otherUserId, recipientId: userId, isRead: false } }
    );

    return messages.reverse();
  } catch (error) {
    throw error;
  }
}

async function getContacts(userId) {
  try {
    const messages = await DirectMessage.findAll({
      where: {
        [Op.or]: [{ senderId: userId }, { recipientId: userId }],
      },
      attributes: ["senderId", "recipientId", "createdAt"],
      order: [["createdAt", "DESC"]],
    });

    const ids = [
      ...new Set(
        messages.map((message) =>
          message.senderId === userId ? message.recipientId : message.senderId
        )
      ),
    ];

    const users = await User.findAll({
      where: { id: ids },
      attributes: ["id", "name", "email", "profilePic"],
    });

    return users;
  } catch (error) {
    throw error;
  }
}

module.exports = { sendDirectMessage, getConversation, getContacts };
