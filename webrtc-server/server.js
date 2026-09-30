const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Map of userId -> socketId and socketId -> { userId, roomId }
const userSocketMap = new Map();
const socketInfoMap = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId);
    userSocketMap.set(userId, socket.id);
    socketInfoMap.set(socket.id, { userId, roomId });
    console.log(`User ${userId} joined room ${roomId}`);
    
    // Notify others in the room
    socket.to(roomId).emit('user-connected', { userId, socketId: socket.id });
  });

  socket.on('offer', (payload) => {
    const targetSocketId = userSocketMap.get(payload.target) || payload.target;
    if (targetSocketId) {
      io.to(targetSocketId).emit('offer', payload);
    }
  });

  socket.on('answer', (payload) => {
    const targetSocketId = userSocketMap.get(payload.target) || payload.target;
    if (targetSocketId) {
      io.to(targetSocketId).emit('answer', payload);
    }
  });

  socket.on('ice-candidate', (incoming) => {
    const targetSocketId = userSocketMap.get(incoming.target) || incoming.target;
    if (targetSocketId) {
      io.to(targetSocketId).emit('ice-candidate', incoming);
    }
  });

  socket.on('disconnect', () => {
    const info = socketInfoMap.get(socket.id);
    if (info) {
      const { userId, roomId } = info;
      console.log(`User ${userId} disconnected from room ${roomId}`);
      userSocketMap.delete(userId);
      socketInfoMap.delete(socket.id);
      socket.to(roomId).emit('user-disconnected', userId);
    }
  });
});

const PORT = process.env.PORT || 5050;
server.listen(PORT, () => {
  console.log(`WebRTC Signaling Server running on port ${PORT}`);
});

