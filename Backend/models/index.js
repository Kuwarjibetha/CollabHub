const sequelize = require("../config/db");
const User = require("./User/User");
const Team = require("./Team/Team");
const TeamMember = require("./TeamMember/TeamMember");
const Message = require("./Message/Message");
const Notification = require("./Notification/Notification");  


User.belongsToMany(Team, { through: TeamMember, foreignKey: "userId" }); // Ek User multiple Teams me ho sakta hai, aur woh connection TeamMember table se hota hai

Team.belongsToMany(User, { through: TeamMember, foreignKey: "teamId" }); // Ek Team multiple Users rakh sakti hai, wahi TeamMember table se


TeamMember.belongsTo(User, { foreignKey: "userId" }); //
TeamMember.belongsTo(Team, { foreignKey: "teamId" });
Team.hasMany(TeamMember, { foreignKey: "teamId" });
User.hasMany(TeamMember, { foreignKey: "userId" });




Message.belongsTo(User, { foreignKey: "senderId", as: "sender" }); // Ek Message ka ek Sender (User) hota hai

Message.belongsTo(Team, { foreignKey: "teamId" });
Team.hasMany(Message, { foreignKey: "teamId" });


User.hasMany(Message, { foreignKey: "senderId" });

// 👇 2. naya — Notification associations
Notification.belongsTo(User, { foreignKey: "userId" });   // Har notification ka ek recipient (User) hota hai
User.hasMany(Notification, { foreignKey: "userId" });      // Ek User ki multiple notifications ho sakti hain

module.exports = {
  sequelize,
  User,
  Team,
  TeamMember,
  Message,
  Notification  
};