const chatService = require("../../../service/v1/chat");




async function sendMessageController(req, res) {
  try {
    const { teamId, content, replyToId } = req.body;

    if (!teamId || !content) {
      return res.status(400).json({ success: false, message: "teamId and content are required" });
    }

    const message = await chatService.sendMessage(req.user.userId, { teamId, content, replyToId });

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
};