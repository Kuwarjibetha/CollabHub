const chatService = require("../../../service/v1/chat");
const { Message } = require("../../../models");

// Maps full MIME type string → DB fileType ENUM ("image" | "video" | "document")
function getFileType(mimetype) {
  if (!mimetype) return "document";
  if (mimetype.startsWith("image/")) return "image";
  if (mimetype.startsWith("video/")) return "video";
  return "document"; // pdf, docx, xlsx, zip, etc.
}

async function sendMessageController(req, res) {
  try {
    const { teamId, content, replyToId } = req.body;
    const message = await chatService.sendMessage(req.user.userId, {
      teamId,
      content,
      replyToId,
    });

    const io = req.app.get("io");
    if (io) {
      io.to(String(teamId)).emit("newMessage", message);
      io.to(teamId).emit("newMessage", message);
    }

    return res.status(201).json({
      success: true,
      message: "Message sent",
      data: message,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed to send message",
    });
  }
}

async function sendFileMessageController(req, res) {
  try {
    const { teamId, replyToId, content } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file provided",
      });
    }

    const fileUrl = req.file.path;
    const fileType = getFileType(req.file.mimetype); // maps "image/jpeg" → "image" etc.
    const fileName = req.file.originalname;

    const message = await chatService.sendMessage(req.user.userId, {
      teamId,
      content,
      replyToId,
      fileUrl,
      fileType,
      fileName,
    });

    const io = req.app.get("io");
    if (io) {
      io.to(String(teamId)).emit("newMessage", message);
      io.to(teamId).emit("newMessage", message);
    }

    return res.status(201).json({
      success: true,
      message: "File sent",
      data: message,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed to send file",
    });
  }
}

async function getChatHistoryController(req, res) {
  try {
    const { teamId } = req.params;
    const { limit, offset } = req.query;

    const messages = await chatService.getChatHistory(req.user.userId, teamId, {
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });

    return res.status(200).json({
      success: true,
      message: "Chat history fetched",
      data: messages,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed to fetch chat history",
    });
  }
}

async function getUnreadCountsController(req, res) {
  try {
    const counts = await chatService.getUnreadCounts(req.user.userId);
    return res.status(200).json({
      success: true,
      message: "Unread counts fetched",
      data: counts,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed to fetch unread counts",
    });
  }
}

async function markReadController(req, res) {
  try {
    const { teamId } = req.params;
    const result = await chatService.markTeamRead(req.user.userId, teamId);
    return res.status(200).json({
      success: true,
      message: "Team marked as read",
      data: result,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed to mark team as read",
    });
  }
}

async function editMessageController(req, res) {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    const message = await chatService.editMessage(req.user.userId, messageId, { content });

    const io = req.app.get("io");
    if (io) {
      io.to(message.teamId).emit("message-edited", message);
    }

    return res.status(200).json({
      success: true,
      message: "Message edited",
      data: message,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed to edit message",
    });
  }
}

async function deleteMessageController(req, res) {
  try {
    const { messageId } = req.params;

    const message = await Message.findByPk(messageId);
    const teamId = message?.teamId;

    const result = await chatService.deleteMessage(req.user.userId, messageId);

    const io = req.app.get("io");
    if (io && teamId) {
      io.to(teamId).emit("message-deleted", { id: messageId });
    }

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed to delete message",
    });
  }
}

async function toggleReactionController(req, res) {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    const result = await chatService.toggleReaction(req.user.userId, messageId, emoji);

    const io = req.app.get("io");
    if (io) {
      io.to(result.teamId).emit("message-reactions", {
        messageId: result.messageId,
        reactions: result.reactions,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Reaction updated",
      data: result,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed to update reaction",
    });
  }
}

module.exports = {
  sendMessageController,
  sendFileMessageController,
  getChatHistoryController,
  getUnreadCountsController,
  markReadController,
  editMessageController,
  deleteMessageController,
  toggleReactionController,
};
