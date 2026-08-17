const chatService = require("../../../service/v1/chat");




async function sendMessageController(req, res) {
  try {
    const { teamId, content, replyToId } = req.body;

    if (!teamId || !content) {
      return res.status(400).json({ success: false, message: "teamId and content are required" });
    }

    const message = await chatService.sendMessage(req.user.userId, { teamId, content, replyToId });

    // Emit real-time Socket.io event to all members in team room
    const io = req.app.get("io");
    if (io) {
      io.to(teamId).emit("newMessage", message);
      io.to(teamId).emit("new-message", message);
    }

    return res.status(201).json({
      success: true,
      message: "Message sent",
      data: message,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Something went wrong",
    });
  }
}

async function toggleReactionController(req, res) {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ success: false, message: "Emoji is required" });
    const result = await chatService.toggleReaction(req.user.userId, messageId, emoji);
    const io = req.app.get("io");
    if (io) io.to(result.teamId).emit("message-reactions", result);
    return res.status(200).json({ success: true, data: result });
  } catch (err) { return res.status(err.statusCode || 500).json({ success: false, message: err.message || "Something went wrong" }); }
}

async function markReadController(req, res) {
  try {
    await chatService.markTeamRead(req.user.userId, req.params.teamId);
    return res.status(200).json({ success: true, message: "Team marked as read" });
  } catch (err) { return res.status(err.statusCode || 500).json({ success: false, message: err.message || "Something went wrong" }); }
}

async function getUnreadCountsController(req, res) {
  try { return res.status(200).json({ success: true, data: await chatService.getUnreadCounts(req.user.userId) }); }
  catch (err) { return res.status(err.statusCode || 500).json({ success: false, message: err.message || "Something went wrong" }); }
}

async function getChatHistoryController(req, res) {
  try {
    const { teamId } = req.params;
    const { limit, offset } = req.query;

    const messages = await chatService.getChatHistory(req.user.userId, teamId, {
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });

    return res.status(200).json({
      success: true,
      message: "Chat history fetched",
      data: messages,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Something went wrong",
    });
  }
}

async function editMessageController(req, res) {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, message: "Content is required" });
    }

    const message = await chatService.editMessage(req.user.userId, messageId, { content });

    const io = req.app.get("io");
    if (io && message.teamId) {
      io.to(message.teamId).emit("message-edited", { id: messageId, content });
    }

    return res.status(200).json({
      success: true,
      message: "Message updated",
      data: message,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Something went wrong",
    });
  }
}

async function deleteMessageController(req, res) {
  try {
    const { messageId } = req.params;

    const result = await chatService.deleteMessage(req.user.userId, messageId);

    const io = req.app.get("io");
    if (io) {
      io.emit("message-deleted", { id: messageId });
    }

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

async function sendFileMessageController(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const { teamId, content } = req.body;

    if (!teamId) {
      return res.status(400).json({ success: false, message: "teamId is required" });
    }

    let fileType = "document";
    if (req.file.mimetype.startsWith("image/")) fileType = "image";
    else if (req.file.mimetype.startsWith("video/")) fileType = "video";

    const message = await chatService.sendMessage(req.user.userId, {
      teamId,
      content: content || null,
      fileUrl: req.file.path,       
      fileType,
      fileName: req.file.originalname,
    });

    const io = req.app.get("io");
    if (io) {
      io.to(teamId).emit("newMessage", message);
      io.to(teamId).emit("new-message", message);
    }

    return res.status(201).json({
      success: true,
      message: "File message sent",
      data: message,
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Something went wrong",
    });
  }
}



module.exports = {
  sendMessageController,
  getChatHistoryController,
  sendFileMessageController, 
  editMessageController,
  deleteMessageController,
  toggleReactionController,
  markReadController,
  getUnreadCountsController,
};
