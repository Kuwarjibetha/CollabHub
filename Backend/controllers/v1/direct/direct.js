const directService = require("../../../service/v1/direct");

async function sendController(req, res) {
  try {
    const message = await directService.sendDirectMessage(req.user.userId, req.body.recipientId, req.body.content);
    const io = req.app.get("io");
    if (io) io.to(`user:${req.body.recipientId}`).emit("direct-message", message);
    return res.status(201).json({ success: true, data: message });
  } catch (err) { return res.status(err.statusCode || 500).json({ success: false, message: err.message || "Something went wrong" }); }
}
async function conversationController(req, res) {
  try { return res.status(200).json({ success: true, data: await directService.getConversation(req.user.userId, req.params.userId, req.query) }); }
  catch (err) { return res.status(err.statusCode || 500).json({ success: false, message: err.message || "Something went wrong" }); }
}
async function contactsController(req, res) {
  try { return res.status(200).json({ success: true, data: await directService.getContacts(req.user.userId) }); }
  catch (err) { return res.status(err.statusCode || 500).json({ success: false, message: err.message || "Something went wrong" }); }
}
module.exports = { sendController, conversationController, contactsController };
