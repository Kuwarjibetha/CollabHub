const { Message, User, TeamMember, MessageReaction, Notification } = require("../../../models");
const { enqueueNotificationJob } = require("../../../workflow");

// check user
async function verifyTeamMembership(userId, teamId) {
  const membership = await TeamMember.findOne({ where: { userId, teamId } });
  if (!membership) {
    const error = new Error("You are not a member of this team");
    error.statusCode = 403;
    throw error;
  }
}

// message send
async function sendMessage(
  userId,
  { teamId, content, replyToId, fileUrl, fileType, fileName },
) {
  await verifyTeamMembership(userId, teamId);

  if (!content && !fileUrl) {
    const error = new Error("Message must have text or a file");
    error.statusCode = 400;
    throw error;
  }

  const message = await Message.create({
    senderId: userId,
    teamId,
    content: content || null,
    replyToId: replyToId || null,
    fileUrl: fileUrl || null,
    fileType: fileType || null,
    fileName: fileName || null,
  });

  const fullMessage = await Message.findByPk(message.id, {
    include: [{ model: User, as: "sender", attributes: ["id", "name", "profilePic"] }],
  });

  enqueueNotificationJob({
    teamId,
    excludeUserId: userId,
    type: "message",
    title: `New message from ${fullMessage.sender.name}`,
    content: content ? content.substring(0, 50) : "Sent a file",
    relatedId: teamId,
  });

  // Mentions get a dedicated notification in addition to the regular team alert.
  // A mention is intentionally matched by display name, so clients can send "@Jane Doe".
  if (content) {
    const members = await TeamMember.findAll({ where: { teamId }, include: [{ model: User, attributes: ["id", "name"] }] });
    const mentioned = members.filter((member) => member.userId !== userId && member.User?.name && content.toLowerCase().includes(`@${member.User.name.toLowerCase()}`));
    if (mentioned.length) {
      await Notification.bulkCreate(mentioned.map((member) => ({
        userId: member.userId,
        type: "mention",
        title: `${fullMessage.sender.name} mentioned you`,
        content: content.substring(0, 120),
        relatedId: teamId,
      })));
    }
  }

  return fullMessage;
}

// get chat history
async function getChatHistory(userId, teamId, { limit = 50, offset = 0 }) {
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
}

async function toggleReaction(userId, messageId, emoji) {
  const message = await Message.findByPk(messageId);
  if (!message) {
    const error = new Error("Message not found"); error.statusCode = 404; throw error;
  }
  await verifyTeamMembership(userId, message.teamId);
  const existing = await MessageReaction.findOne({ where: { messageId, userId, emoji } });
  if (existing) await existing.destroy();
  else await MessageReaction.create({ messageId, userId, emoji });
  const reactions = await MessageReaction.findAll({ where: { messageId }, attributes: ["id", "userId", "emoji"] });
  return { messageId, teamId: message.teamId, reactions };
}

async function markTeamRead(userId, teamId) {
  const membership = await TeamMember.findOne({ where: { userId, teamId } });
  if (!membership) { const error = new Error("You are not a member of this team"); error.statusCode = 403; throw error; }
  membership.lastReadAt = new Date();
  await membership.save();
  return membership;
}

async function getUnreadCounts(userId) {
  const memberships = await TeamMember.findAll({ where: { userId } });
  const result = await Promise.all(memberships.map(async (membership) => ({
    teamId: membership.teamId,
    count: await Message.count({ where: { teamId: membership.teamId, senderId: { [require("sequelize").Op.ne]: userId }, createdAt: { [require("sequelize").Op.gt]: membership.lastReadAt || new Date(0) } } }),
  })));
  return result;
}

// edit message
async function editMessage(userId, messageId, { content }) {
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
}

// delete message
async function deleteMessage(userId, messageId) {
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
}

module.exports = { sendMessage, getChatHistory, editMessage, deleteMessage, toggleReaction, markTeamRead, getUnreadCounts };
