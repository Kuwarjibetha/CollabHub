const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../../config/cloudinary");





const storage = new CloudinaryStorage({

  cloudinary: cloudinary,
  params: {
    folder: "team-collab/chat-files",
    resource_type: "auto",
    allowed_formats: ["jpg", "png", "webp", "mp4", "mov", "pdf", "docx", "xlsx", "zip"],
  },

});


const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },   
});


module.exports = upload;