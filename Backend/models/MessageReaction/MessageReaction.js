const { DataTypes } = require("sequelize");
const sequelize = require("../../config/db");

const MessageReaction = sequelize.define("MessageReaction", {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  messageId: { type: DataTypes.UUID, allowNull: false },
  userId: { type: DataTypes.UUID, allowNull: false },
  emoji: { type: DataTypes.STRING(16), allowNull: false },
}, { tableName: "message_reactions", timestamps: true, indexes: [{ unique: true, fields: ["messageId", "userId", "emoji"] }] });

module.exports = MessageReaction;
