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

const rooms = new Map(); // roomId -> Set of users
const userSockets = new Map(); // socketId -> { userId, roomId, name }

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', ({ roomId, userId, name }) => {
    socket.join(roomId);
    
    userSockets.set(socket.id, { userId, roomId, name });
    
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    
    const roomUsers = rooms.get(roomId);
    
    // Get array of existing users before adding current
    const existingUsers = Array.from(roomUsers).map(id => {
      const u = userSockets.get(id);
      return { socketId: id, userId: u.userId, name: u.name };
    });
    
    roomUsers.add(socket.id);
    console.log(`User ${userId} (${socket.id}) joined room ${roomId}`);

    // Tell the new user about existing users so they can initiate connections
    socket.emit('room-users', existingUsers);

    // Notify others
    socket.to(roomId).emit('user-joined', {
      socketId: socket.id,
      userId,
      name
    });
  });

  // WebRTC Signaling Events
  socket.on('offer', (payload) => {
    io.to(payload.target).emit('offer', {
      caller: socket.id,
      sdp: payload.sdp,
      name: userSockets.get(socket.id)?.name
    });
  });

  socket.on('answer', (payload) => {
    io.to(payload.target).emit('answer', {
      caller: socket.id,
      sdp: payload.sdp
    });
  });

  socket.on('ice-candidate', (payload) => {
    io.to(payload.target).emit('ice-candidate', {
      caller: socket.id,
      candidate: payload.candidate
    });
  });

  // Chat and Meeting State
  socket.on('chat-message', (payload) => {
    const user = userSockets.get(socket.id);
    if (user) {
      io.to(user.roomId).emit('chat-message', {
        id: Date.now().toString(),
        senderId: user.userId,
        senderName: user.name,
        message: payload.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  socket.on('media-state-change', (payload) => {
    const user = userSockets.get(socket.id);
    if (user) {
      socket.to(user.roomId).emit('user-media-state', {
        socketId: socket.id,
        videoEnabled: payload.videoEnabled,
        micEnabled: payload.micEnabled,
        screenSharing: payload.screenSharing
      });
    }
  });

  socket.on('host-action', (payload) => {
    io.to(payload.targetSocketId).emit('host-action', payload.action);
  });

  socket.on('disconnect', () => {
    const user = userSockets.get(socket.id);
    if (user) {
      console.log(`User ${user.userId} disconnected from room ${user.roomId}`);
      const roomUsers = rooms.get(user.roomId);
      if (roomUsers) {
        roomUsers.delete(socket.id);
        if (roomUsers.size === 0) {
          rooms.delete(user.roomId);
        }
      }
      socket.to(user.roomId).emit('user-disconnected', socket.id);
      userSockets.delete(socket.id);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`WebRTC Signaling Server running on port ${PORT}`);
});
