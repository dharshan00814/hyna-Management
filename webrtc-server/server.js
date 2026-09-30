const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId);
    console.log(`User ${userId} joined room ${roomId}`);
    
    // Notify others in the room
    socket.to(roomId).emit('user-connected', userId);

    socket.on('disconnect', () => {
      console.log(`User ${userId} disconnected from room ${roomId}`);
      socket.to(roomId).emit('user-disconnected', userId);
    });
  });

  // WebRTC Signaling Events
  socket.on('offer', (payload) => {
    // Send offer to the specific user
    io.to(payload.target).emit('offer', payload);
  });

  socket.on('answer', (payload) => {
    // Send answer back to the offerer
    io.to(payload.target).emit('answer', payload);
  });

  socket.on('ice-candidate', (incoming) => {
    // Send ICE candidate to the peer
    io.to(incoming.target).emit('ice-candidate', incoming.candidate);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`WebRTC Signaling Server running on port ${PORT}`);
});
