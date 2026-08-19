require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { sequelize, User } = require("./models");
const v1Routes = require("./routes/v1");
const initSocket = require("./sockets");
const { startWorkflows } = require("./workflow");
const { runMigrations } = require("./config/migrator");

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
}));
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.use("/api/v1", v1Routes);

const httpServer = http.createServer(app);
const io = initSocket(httpServer);
app.set("io", io);



async function start() {
  try {
    await sequelize.authenticate();
    console.log("Database connected...");

    await runMigrations(sequelize);
    await sequelize.sync();
    console.log("Database synced...");

    
    if (process.env.ADMIN_EMAIL) {
      await User.update({ role: "admin" }, { where: { email: process.env.ADMIN_EMAIL } });
    }

    startWorkflows();

    const PORT = process.env.PORT || 5000;

    httpServer.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Unable to connect to the database:", err);
  }
}

start();
