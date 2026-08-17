const { DataTypes } = require("sequelize");
const sequelize = require("../../config/db");

const DirectMessage = sequelize.define("DirectMessage", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  senderId: { type: DataTypes.UUID, allowNull: false },
  recipientId: { type: DataTypes.UUID, allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
  isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: "direct_messages", timestamps: true });

module.exports = DirectMessage;
