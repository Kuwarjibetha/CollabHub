const { DataTypes } = require("sequelize");
const sequelize = require("../../config/db");

const Team = sequelize.define(
  "Team",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,

    },
    inviteCode: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      
    },
  },
  {
    tableName: "teams",   // MySQL me actual table ka naam
    timestamps: true,      // createdAt, updatedAt automatic aa jayenge
  }
);

module.exports = Team;