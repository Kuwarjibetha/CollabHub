const sequelize = require("../config/db");
const User = require("./User/User");
const Team = require("./Team/Team");
const TeamMember = require("./TeamMember/TeamMember");



User.belongsToMany(Team, { through: TeamMember, foreignKey: "userId" }); // Ek User multiple Teams me ho sakta hai, aur woh connection TeamMember table se hota hai

Team.belongsToMany(User, { through: TeamMember, foreignKey: "teamId" }); // Ek Team multiple Users rakh sakti hai, wahi TeamMember table se


TeamMember.belongsTo(User, { foreignKey: "userId" }); //
TeamMember.belongsTo(Team, { foreignKey: "teamId" });
Team.hasMany(TeamMember, { foreignKey: "teamId" });
User.hasMany(TeamMember, { foreignKey: "userId" });

module.exports = {
  sequelize,
  User,
  Team,
  TeamMember,
};