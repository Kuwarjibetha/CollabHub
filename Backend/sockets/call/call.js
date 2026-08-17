const { TeamMember } = require("../../models");

// In-memory state is enough for a single Socket.io server.  It lets us alert
// every team member and automatically clears a meeting when its last attendee leaves.
const activeCalls = new Map();
const socketToUser = new Map();

async function notifyTeam(io, teamId, event, payload, excludeUserId = null) {
  const members = await TeamMember.findAll({ where: { teamId }, attributes: ["userId"] });
  members.filter((member) => member.userId !== excludeUserId)
    .forEach((member) => io.to(`user:${member.userId}`).emit(event, payload));
}

function registerCallHandlers(io, socket) {
  const callRooms = new Set();

  // join call
  socket.on("joinCall", async ({ teamId }) => {
    const membership = await TeamMember.findOne({ where: { teamId, userId: socket.user.userId } });
    if (!membership) return socket.emit("errorMessage", { message: "You are not a member of this team" });

    const callRoom = `call-${teamId}`;
    socket.join(callRoom);
    callRooms.add(callRoom);
    if (!activeCalls.has(teamId)) activeCalls.set(teamId, new Set());
    activeCalls.get(teamId).add(socket.id);
    socketToUser.set(socket.id, socket.user.userId);

    const existingParticipants = [...activeCalls.get(teamId)]
      .filter((sid) => sid !== socket.id)
      .map((sid) => ({ socketId: sid, userId: socketToUser.get(sid) }))
      .filter((p) => p.userId);

    if (existingParticipants.length) {
      socket.emit("callParticipants", { participants: existingParticipants });
    }

    socket.to(callRoom).emit("userJoinedCall", {
      userId: socket.user.userId,
      socketId: socket.id,
    });

    console.log(`User ${socket.user.userId} joined call room: ${callRoom}`);
  });

  socket.on("call-start", async ({ teamId, teamName, callerName }) => {
    const membership = await TeamMember.findOne({ where: { teamId, userId: socket.user.userId } });
    if (!membership) return;
    await notifyTeam(io, teamId, "team-call-started", {
      teamId,
      teamName: teamName || "Your team",
      callerName: callerName || "A teammate",
      callerId: socket.user.userId,
    }, socket.user.userId);
  });



  // webrtc
  socket.on("callOffer", ({ toSocketId, offer }) => {
    io.to(toSocketId).emit("callOffer", {
      fromSocketId: socket.id,
      fromUserId: socket.user.userId,
      offer,
    });
  });
  socket.on("call-offer", ({ to, offer }) => {
    io.to(to).emit("callOffer", { fromSocketId: socket.id, from: socket.id, fromUserId: socket.user.userId, offer });
  });
  // webtrc ans
  socket.on("callAnswer", ({ toSocketId, answer }) => {
    io.to(toSocketId).emit("callAnswer", {
      fromSocketId: socket.id,
      answer,
    });
  });
  socket.on("call-answer", ({ to, answer }) => io.to(to).emit("callAnswer", { fromSocketId: socket.id, from: socket.id, answer }));

  // ice candi
  socket.on("iceCandidate", ({ toSocketId, candidate }) => {
    io.to(toSocketId).emit("iceCandidate", {
      fromSocketId: socket.id,
      candidate,
    });
  });
  socket.on("ice-candidate", ({ to, candidate }) => io.to(to).emit("iceCandidate", { fromSocketId: socket.id, from: socket.id, candidate }));



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
  socket.on("leaveCall", async ({ teamId }) => {
    const callRoom = `call-${teamId}`;
    socket.leave(callRoom);
    callRooms.delete(callRoom);
    const participants = activeCalls.get(teamId);
    if (participants) {
      participants.delete(socket.id);
      if (participants.size === 0) {
        activeCalls.delete(teamId);
        await notifyTeam(io, teamId, "team-call-ended", { teamId });
      }
    }
    socketToUser.delete(socket.id);

    socket.to(callRoom).emit("userLeftCall", {
      userId: socket.user.userId,
      socketId: socket.id,
    });

    console.log(`User ${socket.user.userId} left call room: ${callRoom}`);
  });
  socket.on("call-end", async ({ teamId }) => {
    const callRoom = `call-${teamId}`;
    socket.to(callRoom).emit("userLeftCall", { userId: socket.user.userId, socketId: socket.id });
    socket.leave(callRoom);
    callRooms.delete(callRoom);
    const participants = activeCalls.get(teamId);
    if (participants) {
      participants.delete(socket.id);
      if (participants.size === 0) {
        activeCalls.delete(teamId);
        await notifyTeam(io, teamId, "team-call-ended", { teamId });
      }
    }
    socketToUser.delete(socket.id);
  });


  // disconnect
  socket.on("disconnect", () => {
    callRooms.forEach((callRoom) => {
      socket.to(callRoom).emit("userLeftCall", { userId: socket.user.userId, socketId: socket.id });
      const teamId = callRoom.replace("call-", "");
      const participants = activeCalls.get(teamId);
      if (participants) { participants.delete(socket.id); if (participants.size === 0) activeCalls.delete(teamId); }
    });
    socketToUser.delete(socket.id);
    console.log(`User ${socket.user.userId} disconnected from call`);
  });
}

module.exports = registerCallHandlers;
