const { DataTypes } = require("sequelize");

async function hasColumn(queryInterface, table, column) {
  const schema = await queryInterface.describeTable(table);
  return Boolean(schema[column]);
}


async function runMigrations(sequelize) {
  const queryInterface = sequelize.getQueryInterface();
  if (await hasColumn(queryInterface, "users", "isBlocked") === false) {
    await queryInterface.addColumn("users", "isBlocked", { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false });
  }
  if (await hasColumn(queryInterface, "team_members", "lastReadAt") === false) {
    await queryInterface.addColumn("team_members", "lastReadAt", { type: DataTypes.DATE, allowNull: true });
  }
}

module.exports = { runMigrations };
