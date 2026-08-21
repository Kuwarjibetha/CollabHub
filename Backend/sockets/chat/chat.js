const chatService = require("../../service/v1/chat");


function registerChatHandlers(io, socket) {

  // join room 
  socket.on("joinRoom", (teamId) => { // Jab user kisi team ki chat kholta hai, usse us team ke "room" me daal do
    if (teamId) {
      socket.join(String(teamId)); // String type ensure kiya — consistent room name
      console.log(`User ${socket.user?.userId} joined room: ${teamId}`);
    }
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

      io.to(String(teamId)).emit("newMessage", message);
    } catch (err) {
      socket.emit("errorMessage", { message: err.message || "Failed to send message" });
    }
  });

  // typeing indic
  const typingStart = ({ teamId }) => {
    socket.to(teamId).emit("userTyping", {
      userId: socket.user.userId,
    });
  };
  socket.on("typing", typingStart);
  socket.on("typing-start", typingStart);


  const typingStop = ({ teamId }) => {
    socket.to(teamId).emit("userStoppedTyping", {
      userId: socket.user.userId,
    });
  };
  socket.on("stopTyping", typingStop);
  socket.on("typing-stop", typingStop);

  // discon
  socket.on("disconnect", () => {
    console.log(`User ${socket.user.userId} disconnected`);
  });
}

module.exports = registerChatHandlers;
