function registerCallHandlers(io, socket) {

  // join call
  socket.on("joinCall", ({ teamId }) => {

    const callRoom = `call-${teamId}`;
    socket.join(callRoom);

    socket.to(callRoom).emit("userJoinedCall", {
      userId: socket.user.userId,
      socketId: socket.id,
    });

    console.log(`User ${socket.user.userId} joined call room: ${callRoom}`);
  });



  // webrtc
  socket.on("callOffer", ({ toSocketId, offer }) => {
    io.to(toSocketId).emit("callOffer", {
      fromSocketId: socket.id,
      fromUserId: socket.user.userId,
      offer,
    });
  });
  // webtrc ans
  socket.on("callAnswer", ({ toSocketId, answer }) => {
    io.to(toSocketId).emit("callAnswer", {
      fromSocketId: socket.id,
      answer,
    });
  });

  // ice candi
  socket.on("iceCandidate", ({ toSocketId, candidate }) => {
    io.to(toSocketId).emit("iceCandidate", {
      fromSocketId: socket.id,
      candidate,
    });
  });



  // mute vid tog
  socket.on("toggleMedia", ({ teamId, audioEnabled, videoEnabled }) => {
    const callRoom = `call-${teamId}`;
    socket.to(callRoom).emit("participantMediaChanged", {
      userId: socket.user.userId,
      audioEnabled,
      videoEnabled,
    });
  });



  // call leave
  socket.on("leaveCall", ({ teamId }) => {
    const callRoom = `call-${teamId}`;
    socket.leave(callRoom);

    socket.to(callRoom).emit("userLeftCall", {
      userId: socket.user.userId,
      socketId: socket.id,
    });

    console.log(`User ${socket.user.userId} left call room: ${callRoom}`);
  });


  // disconnect
  socket.on("disconnect", () => {
    console.log(`User ${socket.user.userId} disconnected from call`);
  });
}

module.exports = registerCallHandlers;