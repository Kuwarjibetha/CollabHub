const router = require("express").Router();
const { verifyToken } = require("../../../middleware/auth");
const { sendController, conversationController, contactsController } = require("../../../controllers/v1/direct");
router.get("/contacts", verifyToken, contactsController);
router.get("/:userId", verifyToken, conversationController);
router.post("/send", verifyToken, sendController);
module.exports = router;
