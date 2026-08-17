const chatService = require("../../service/v1/chat");


function registerChatHandlers(io, socket) {

  // join room 
  socket.on("joinRoom", (teamId) => { // Jab user kisi team ki chat kholta hai, usse us team ke "room" me daal do
    socket.join(teamId);
    console.log(`User ${socket.user.userId} joined room: ${teamId}`);
  });



  // send mes
  socket.on("sendMessage", async (data) => {
    try {
      const { teamId, content, replyToId } = data;

      const message = await chatService.sendMessage(socket.user.userId, {
        teamId,
        content,
        replyToId,
      });

      io.to(teamId).emit("newMessage", message);
    } catch (err) {
      socket.emit("errorMessage", { message: err.message || "Failed to send message" });
    }
  });

  // typeing indic
  socket.on("typing", ({ teamId }) => {
    socket.to(teamId).emit("userTyping", {
      userId: socket.user.userId,
    });
  });


  socket.on("stopTyping", ({ teamId }) => {
    socket.to(teamId).emit("userStoppedTyping", {
      userId: socket.user.userId,
    });
  });

  // discon
  socket.on("disconnect", () => {
    console.log(`User ${socket.user.userId} disconnected`);
  });
}

module.exports = registerChatHandlers;