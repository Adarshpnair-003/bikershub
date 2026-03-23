module.exports = function registerNotificationHandlers(socket, io) {
  /* ============================
     NOTIFICATIONS
     Clients join their personal room to receive notification events.
     Actual emission happens from services via: io.to("user:{userId}").emit("newNotification", ...)
  ============================ */
  socket.on("joinNotifications", () => {
    socket.join(`user:${socket.user.id}`);
  });
};
