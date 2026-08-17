const express = require("express");
const router = express.Router();

const { verifyToken } = require("../../../middleware/auth");
const chatUpload = require("../../../middleware/upload/chatUpload"); 
const {
  sendMessageController,
  getChatHistoryController,
  sendFileMessageController,
  editMessageController,
  deleteMessageController,
} = require("../../../controllers/v1/chat");

router.post("/send", verifyToken, sendMessageController);
router.post("/send-file", verifyToken, chatUpload.single("file"), sendFileMessageController);  
router.get("/:teamId/history", verifyToken, getChatHistoryController);
router.patch("/:messageId", verifyToken, editMessageController);
router.delete("/:messageId", verifyToken, deleteMessageController);

module.exports = router;