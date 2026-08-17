require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { sequelize } = require("./models");
const v1Routes = require("./routes/v1");
const initSocket = require("./sockets");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.use("/api/v1", v1Routes);

const httpServer = http.createServer(app);
const io = initSocket(httpServer);



async function start() {
  try {
    await sequelize.authenticate();
    console.log("Database connected...");

    await sequelize.sync({ alter: true });
    console.log("Database synced...");

    const PORT = process.env.PORT || 5000;

    httpServer.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Unable to connect to the database:", err);
  }
}

start();