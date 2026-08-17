const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const registerChatHandlers = require("./chat");
const registerCallHandlers = require("./call");   



function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: "*", 
    },
  });

  io.use((socket, next) => {     // auth middlewa
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("No token provided"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;       //  userId, role 
      next();
    } catch (err) {
      next(new Error("Invalid or expired token"));
    }
  });



   // connection handler
  io.on("connection", (socket) => {
    console.log(`New socket connection: ${socket.user.userId}`);

    registerChatHandlers(io, socket);
    registerCallHandlers(io, socket);  
  });

  return io;
}

module.exports = initSocket;