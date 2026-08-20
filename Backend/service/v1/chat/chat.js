const { sequelize, Message, User, TeamMember, MessageReaction, Notification } = require("../../../models");
const { enqueueNotificationJob } = require("../../../workflow");
const { Op } = require("sequelize");

// Verify user is member of the team
async function verifyTeamMembership(userId, teamId) {
  const membership = await TeamMember.findOne({ where: { userId, teamId } });
  if (!membership) {
    const error = new Error("You are not a member of this team");
    error.statusCode = 403;
    throw error;
  }
  return membership;
}

/**
 * Send message with Database Transaction
 * Atomically saves the Message and creates any @Mention Notifications in DB.
 */
async function sendMessage(
  userId,
  { teamId, content, replyToId, fileUrl, fileType, fileName }
) {
  await verifyTeamMembership(userId, teamId);

  if (!content && !fileUrl) {
    const error = new Error("Message must have text or a file");
    error.statusCode = 400;
    throw error;
  }

  const t = await sequelize.transaction();

  try {
    // 1. Create message record
    const message = await Message.create(
      {
        senderId: userId,
        teamId,
        content: content || null,
        replyToId: replyToId || null,
        fileUrl: fileUrl || null,
        fileType: fileType || null,
        fileName: fileName || null,
      },
      { transaction: t }
    );

    // 2. Fetch full message with sender profile
    const fullMessage = await Message.findByPk(message.id, {
      include: [{ model: User, as: "sender", attributes: ["id", "name", "profilePic"] }],
      transaction: t,
    });

    // 3. Mention notifications handling within transaction
    if (content) {
      const members = await TeamMember.findAll({
        where: { teamId },
        include: [{ model: User, attributes: ["id", "name"] }],
        transaction: t,
      });

      const mentioned = members.filter(
        (member) =>
          member.userId !== userId &&
          member.User?.name &&
          content.toLowerCase().includes(`@${member.User.name.toLowerCase()}`)
      );

      if (mentioned.length > 0) {
        await Notification.bulkCreate(
          mentioned.map((member) => ({
            userId: member.userId,
            type: "mention",
            title: `${fullMessage.sender.name} mentioned you`,
            content: content.substring(0, 120),
            relatedId: teamId,
          })),
          { transaction: t }
        );
      }
    }

    // 4. Commit transaction (Message + Mention Notifications)
    await t.commit();

    // 5. Enqueue background asynchronous worker notification job
    enqueueNotificationJob({
      teamId,
      excludeUserId: userId,
      type: "message",
      title: `New message from ${fullMessage.sender.name}`,
      content: content ? content.substring(0, 50) : "Sent a file",
      relatedId: teamId,
    });

    return fullMessage;
  } catch (error) {
    await t.rollback();
    throw error;
  }
}

// Get chat history
async function getChatHistory(userId, teamId, { limit = 50, offset = 0 } = {}) {
  try {
    await verifyTeamMembership(userId, teamId);

    const messages = await Message.findAll({
      where: { teamId },
      include: [
        { model: User, as: "sender", attributes: ["id", "name", "profilePic"] },
        { model: MessageReaction, as: "reactions", attributes: ["id", "userId", "emoji"] },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    return messages.reverse();
  } catch (error) {
    throw error;
  }
}

// Toggle emoji reaction
async function toggleReaction(userId, messageId, emoji) {
  try {
    const message = await Message.findByPk(messageId);
    if (!message) {
      const error = new Error("Message not found");
      error.statusCode = 404;
      throw error;
    }

    await verifyTeamMembership(userId, message.teamId);

    const existing = await MessageReaction.findOne({
      where: { messageId, userId, emoji },
    });

    if (existing) {
      await existing.destroy();
    } else {
      await MessageReaction.create({ messageId, userId, emoji });
    }

    const reactions = await MessageReaction.findAll({
      where: { messageId },
      attributes: ["id", "userId", "emoji"],
    });

    return { messageId, teamId: message.teamId, reactions };
  } catch (error) {
    throw error;
  }
}

// Mark team messages as read
async function markTeamRead(userId, teamId) {
  try {
    const membership = await TeamMember.findOne({ where: { userId, teamId } });
    if (!membership) {
      const error = new Error("You are not a member of this team");
      error.statusCode = 403;
      throw error;
    }

    membership.lastReadAt = new Date();
    await membership.save();
    return membership;
  } catch (error) {
    throw error;
  }
}

// Get unread counts per team
async function getUnreadCounts(userId) {
  try {
    const memberships = await TeamMember.findAll({ where: { userId } });
    const result = await Promise.all(
      memberships.map(async (membership) => ({
        teamId: membership.teamId,
        count: await Message.count({
          where: {
            teamId: membership.teamId,
            senderId: { [Op.ne]: userId },
            createdAt: { [Op.gt]: membership.lastReadAt || new Date(0) },
          },
        }),
      }))
    );
    return result;
  } catch (error) {
    throw error;
  }
}

// Edit message
async function editMessage(userId, messageId, { content }) {
  try {
    const message = await Message.findByPk(messageId);

    if (!message) {
      const error = new Error("Message not found");
      error.statusCode = 404;
      throw error;
    }

    if (message.senderId !== userId) {
      const error = new Error("You can only edit your own messages");
      error.statusCode = 403;
      throw error;
    }

    message.content = content;
    message.isEdited = true;
    await message.save();

    return message;
  } catch (error) {
    throw error;
  }
}

// Soft delete message
async function deleteMessage(userId, messageId) {
  try {
    const message = await Message.findByPk(messageId);

    if (!message) {
      const error = new Error("Message not found");
      error.statusCode = 404;
      throw error;
    }

    if (message.senderId !== userId) {
      const error = new Error("You can only delete your own messages");
      error.statusCode = 403;
      throw error;
    }

    message.isDeleted = true;
    message.content = "This message was deleted";
    await message.save();

    return { message: "Message deleted" };
  } catch (error) {
    throw error;
  }
}

module.exports = {
  sendMessage,
  getChatHistory,
  editMessage,
  deleteMessage,
  toggleReaction,
  markTeamRead,
  getUnreadCounts,
};
