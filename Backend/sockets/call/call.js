const { TeamMember, Notification } = require("../../models");


const activeCalls = new Map();
const socketToUser = new Map();

async function notifyTeam(io, teamId, event, payload, excludeUserId = null) {
  const members = await TeamMember.findAll({ where: { teamId }, attributes: ["userId"] });
  members.filter((member) => member.userId !== excludeUserId)
    .forEach((member) => io.to(`user:${member.userId}`).emit(event, payload));
}

function registerCallHandlers(io, socket) {
  const callRooms = new Set();

  // Send active calls status on demand
  socket.on("get-active-calls", () => {
    const liveTeamIds = Array.from(activeCalls.keys()).filter((tId) => activeCalls.get(tId)?.size > 0);
    socket.emit("active-calls-list", { liveTeamIds });
  });

  // join call / rejoin call
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

    // Broadcast meeting is live to all team members
    await notifyTeam(io, teamId, "meeting-status-changed", {
      teamId,
      isLive: true,
      participantCount: activeCalls.get(teamId)?.size || 1,
    });

    console.log(`User ${socket.user.userId} joined call room: ${callRoom}`);
  });

  socket.on("call-start", async ({ teamId, teamName, callerName }) => {
    const membership = await TeamMember.findOne({ where: { teamId, userId: socket.user.userId } });
    if (!membership) return;

    const payload = {
      teamId,
      teamName: teamName || "Your team",
      callerName: callerName || "A teammate",
      callerId: socket.user.userId,
      isLive: true,
      participantCount: activeCalls.get(teamId)?.size || 1,
    };

    await notifyTeam(io, teamId, "team-call-started", payload, socket.user.userId);
    await notifyTeam(io, teamId, "meeting-status-changed", payload);

    // Save persistent in-app notification in DB & emit to recipient users
    try {
      const members = await TeamMember.findAll({ where: { teamId }, attributes: ["userId"] });
      const recipients = members.filter((m) => m.userId !== socket.user.userId);
      
      const notifPromises = recipients.map((m) =>
        Notification.create({
          userId: m.userId,
          type: "call",
          title: `📹 Live Meeting: ${teamName || "Team"}`,
          content: `${callerName || "A teammate"} started a live meeting in ${teamName || "your team"}. Click to join!`,
          relatedId: teamId,
          isRead: false,
        }).catch(() => {})
      );
      await Promise.all(notifPromises);

      // Emit real-time notification event to user personal rooms
      recipients.forEach((m) => {
        io.to(`user:${m.userId}`).emit("notification", {
          type: "call",
          title: `📹 Live Meeting: ${teamName || "Team"}`,
          content: `${callerName || "A teammate"} started a live meeting in ${teamName || "your team"}. Click to join!`,
          relatedId: teamId,
          createdAt: new Date().toISOString(),
        });
      });
    } catch (e) {
      console.warn("Could not save call notification in DB:", e.message);
    }
  });

  // webrtc signaling
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
  socket.on("callAnswer", ({ toSocketId, answer }) => {
    io.to(toSocketId).emit("callAnswer", {
      fromSocketId: socket.id,
      answer,
    });
  });
  socket.on("call-answer", ({ to, answer }) => io.to(to).emit("callAnswer", { fromSocketId: socket.id, from: socket.id, answer }));

  socket.on("iceCandidate", ({ toSocketId, candidate }) => {
    io.to(toSocketId).emit("iceCandidate", {
      fromSocketId: socket.id,
      candidate,
    });
  });
  socket.on("ice-candidate", ({ to, candidate }) => io.to(to).emit("iceCandidate", { fromSocketId: socket.id, from: socket.id, candidate }));

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
        await notifyTeam(io, teamId, "meeting-status-changed", { teamId, isLive: false });
      } else {
        await notifyTeam(io, teamId, "meeting-status-changed", { teamId, isLive: true, participantCount: participants.size });
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
        await notifyTeam(io, teamId, "meeting-status-changed", { teamId, isLive: false });
      } else {
        await notifyTeam(io, teamId, "meeting-status-changed", { teamId, isLive: true, participantCount: participants.size });
      }
    }
    socketToUser.delete(socket.id);
  });

  // disconnect
  socket.on("disconnect", async () => {
    callRooms.forEach(async (callRoom) => {
      socket.to(callRoom).emit("userLeftCall", { userId: socket.user.userId, socketId: socket.id });
      const teamId = callRoom.replace("call-", "");
      const participants = activeCalls.get(teamId);
      if (participants) {
        participants.delete(socket.id);
        if (participants.size === 0) {
          activeCalls.delete(teamId);
          await notifyTeam(io, teamId, "team-call-ended", { teamId });
          await notifyTeam(io, teamId, "meeting-status-changed", { teamId, isLive: false });
        } else {
          await notifyTeam(io, teamId, "meeting-status-changed", { teamId, isLive: true, participantCount: participants.size });
        }
      }
    });
    socketToUser.delete(socket.id);
    console.log(`User ${socket.user.userId} disconnected from call`);
  });
}

module.exports = registerCallHandlers;
