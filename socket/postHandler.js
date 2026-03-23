module.exports = function registerPostHandlers(socket, io) {
  /* ============================
     POST REAL-TIME EVENTS
     Clients join a post room to receive real-time updates for that post.
     Emission of postLiked, newComment, commentLiked happens from services via:
       io.to("post:{postId}").emit(...)
  ============================ */
  socket.on("joinPost", (postId) => {
    socket.join(`post:${postId}`);
  });

  socket.on("leavePost", (postId) => {
    socket.leave(`post:${postId}`);
  });
};
