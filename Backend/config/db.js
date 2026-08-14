require("dotenv").config();

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,   // 👈 naya add kiya — .env se lega, nahi mila to 3306 default
    dialect: 'mysql',
    logging: false, // true karo agar har SQL query console me dekhni ho
  }
);

module.exports = sequelize;