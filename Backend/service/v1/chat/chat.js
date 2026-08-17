const { Message, User, TeamMember } = require("../../../models");

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
    include: [{ model: User, as: "sender", attributes: ["id", "name", "profilePic"] },
  ],
  });

  return fullMessage;
}






// get chat history
async function getChatHistory(userId, teamId, { limit = 50, offset = 0 }) {
  await verifyTeamMembership(userId, teamId);

  const messages = await Message.findAll({
    where: { teamId },
    include: [
      { model: User, as: "sender", attributes: ["id", "name", "profilePic"] },
    ],
    order: [["createdAt", "DESC"]],
    limit,
    offset,
  });

  return messages.reverse();
}

// edit mess
async function editMessage(userId, messageId, { content }) {
  const message = await Message.findByPk(messageId);

  if (!message) {
    const error = new Error("Message not found");
    error.statusCode = 404;
    throw error;
  }

  if (message.senderId !== userId) {
    // Sirf apna hi message edit kar sakte ho, doosre ka nahi
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
  message.content = "This message was deleted"; // original content hata diya
  await message.save();

  return { message: "Message deleted" };
}

module.exports = { sendMessage, getChatHistory, editMessage, deleteMessage };
