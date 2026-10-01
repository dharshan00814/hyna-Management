require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const mediasoup = require('mediasoup');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5050;
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

const supabase = (SUPABASE_URL && SUPABASE_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_KEY) 
  : null;

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    activeRooms: rooms.size,
    timestamp: new Date().toISOString(),
  });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 30000,
  pingInterval: 10000,
});

// Mediasoup Config
const mediaCodecs = [
  { kind: 'audio', mimeType: 'audio/opus', clockRate: 48000, channels: 2 },
  { kind: 'video', mimeType: 'video/VP8', clockRate: 90000, parameters: { 'x-google-start-bitrate': 1000 } },
];

let worker;
async function startMediasoup() {
  worker = await mediasoup.createWorker({
    rtcMinPort: 40000,
    rtcMaxPort: 49999,
  });
  worker.on('died', () => {
    console.error('mediasoup worker died, exiting in 2 seconds... [pid:%d]', worker.pid);
    setTimeout(() => process.exit(1), 2000);
  });
  console.log('[Mediasoup] Worker started');
}

startMediasoup();

// rooms: Map<roomId, { roomId, hostId, status, participants, router }>
const rooms = new Map();
// socketToRoom: Map<socketId, { roomId, userId }>
const socketToRoom = new Map();

async function getRouter(roomId) {
  let room = rooms.get(roomId);
  if (!room) return null;
  if (!room.router) {
    room.router = await worker.createRouter({ mediaCodecs });
  }
  return room.router;
}

// Helper: Query Database Meeting Details
async function getDbMeeting(roomId) {
  if (!supabase) return null;
  try {
    const { data: byLink } = await supabase.from('meetings').select('*').ilike('meeting_link', `%${roomId}%`).maybeSingle();
    if (byLink) return byLink;
    const { data: byId } = await supabase.from('meetings').select('*').eq('id', roomId).maybeSingle();
    return byId || null;
  } catch (err) {
    return null;
  }
}

async function updateDbMeetingStatus(roomId, status) {
  if (!supabase) return;
  try {
    const dbStatus = status === 'LIVE' ? 'ongoing' : status === 'ENDED' ? 'completed' : 'scheduled';
    await supabase.from('meetings').update({ status: dbStatus, updated_at: new Date().toISOString() }).or(`id.eq.${roomId},meeting_link.ilike.%${roomId}%`);
  } catch (err) {}
}

io.on('connection', (socket) => {
  console.log(`[Connect] Socket ${socket.id} connected`);
  
  socket.on('join-room', async ({ roomId, user, micEnabled = true, videoEnabled = true }) => {
    if (!roomId || !user || !user.userId) return socket.emit('error', { message: 'Invalid credentials' });
    
    let dbMeeting = await getDbMeeting(roomId);
    let room = rooms.get(roomId);

    if (!room) {
      const hostId = dbMeeting?.host_id || user.userId;
      room = {
        roomId, hostId, status: 'WAITING',
        participants: new Map(),
        router: await worker.createRouter({ mediaCodecs })
      };
      rooms.set(roomId, room);
    }

    const isHost = (room.hostId === user.userId) || (dbMeeting && dbMeeting.host_id === user.userId);
    if (isHost && !room.hostId) room.hostId = user.userId;
    
    if (room.status === 'WAITING') {
      room.status = 'LIVE';
      updateDbMeetingStatus(roomId, 'LIVE');
    }

    const participantData = {
      socketId: socket.id, userId: user.userId, name: user.name || 'Member',
      avatar: user.avatar || '', role: user.role || 'member',
      designation: user.designation || '', micEnabled: Boolean(micEnabled),
      videoEnabled: Boolean(videoEnabled), isScreenSharing: false, isSpeaking: false,
      isHost: Boolean(isHost), joinedAt: new Date().toISOString(),
      transports: new Map(), producers: new Map(), consumers: new Map()
    };

    socket.join(roomId);
    room.participants.set(socket.id, participantData);
    socketToRoom.set(socket.id, { roomId, userId: user.userId });

    const existingParticipants = Array.from(room.participants.values())
      .filter(p => p.socketId !== socket.id)
      .map(p => ({
        socketId: p.socketId, userId: p.userId, name: p.name, avatar: p.avatar,
        role: p.role, designation: p.designation, micEnabled: p.micEnabled,
        videoEnabled: p.videoEnabled, isScreenSharing: p.isScreenSharing,
        isSpeaking: p.isSpeaking, isHost: p.isHost, joinedAt: p.joinedAt,
        producers: Array.from(p.producers.keys())
      }));

    socket.emit('room-joined', {
      roomId, isHost, hostId: room.hostId, status: room.status,
      participants: existingParticipants, yourParticipantInfo: { ...participantData, transports: null, producers: null, consumers: null }
    });

    socket.to(roomId).emit('participant_joined', { ...participantData, transports: null, producers: null, consumers: null });
  });

  // --- MEDIASOUP SIGNALING ---

  socket.on('getRouterRtpCapabilities', (data, callback) => {
    const info = socketToRoom.get(socket.id);
    if (!info) return callback({ error: 'Not in room' });
    const room = rooms.get(info.roomId);
    if (!room) return callback({ error: 'Room not found' });
    callback(room.router.rtpCapabilities);
  });

  socket.on('createWebRtcTransport', async (data, callback) => {
    try {
      const info = socketToRoom.get(socket.id);
      if (!info) return callback({ error: 'Not in room' });
      const room = rooms.get(info.roomId);
      const participant = room.participants.get(socket.id);

      const transport = await room.router.createWebRtcTransport({
        listenIps: [{ ip: '0.0.0.0', announcedIp: process.env.ANNOUNCED_IP || '127.0.0.1' }],
        enableUdp: true, enableTcp: true, preferUdp: true,
      });

      transport.on('dtlsstatechange', dtlsState => {
        if (dtlsState === 'closed') transport.close();
      });
      transport.on('@close', () => {
        console.log('[Transport Closed]', transport.id);
      });

      participant.transports.set(transport.id, transport);

      callback({
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters
      });
    } catch (err) {
      console.error(err);
      callback({ error: err.message });
    }
  });

  socket.on('connectWebRtcTransport', async ({ transportId, dtlsParameters }, callback) => {
    const info = socketToRoom.get(socket.id);
    const participant = rooms.get(info.roomId)?.participants.get(socket.id);
    const transport = participant.transports.get(transportId);
    await transport.connect({ dtlsParameters });
    callback();
  });

  socket.on('produce', async ({ transportId, kind, rtpParameters }, callback) => {
    const info = socketToRoom.get(socket.id);
    const room = rooms.get(info.roomId);
    const participant = room.participants.get(socket.id);
    const transport = participant.transports.get(transportId);

    const producer = await transport.produce({ kind, rtpParameters });
    participant.producers.set(producer.id, producer);

    producer.on('transportclose', () => {
      producer.close();
      participant.producers.delete(producer.id);
    });

    callback({ id: producer.id });

    // Inform other clients in the room about the new producer
    socket.to(info.roomId).emit('new-producer', {
      producerId: producer.id,
      socketId: socket.id,
      userId: info.userId,
      kind: producer.kind
    });
  });

  socket.on('consume', async ({ producerId, rtpCapabilities, transportId }, callback) => {
    try {
      const info = socketToRoom.get(socket.id);
      const room = rooms.get(info.roomId);
      const participant = room.participants.get(socket.id);
      const transport = participant.transports.get(transportId);

      if (!room.router.canConsume({ producerId, rtpCapabilities })) {
        return callback({ error: 'cannot consume' });
      }

      const consumer = await transport.consume({
        producerId,
        rtpCapabilities,
        paused: true
      });

      participant.consumers.set(consumer.id, consumer);

      consumer.on('transportclose', () => {
        participant.consumers.delete(consumer.id);
      });
      consumer.on('producerclose', () => {
        participant.consumers.delete(consumer.id);
        socket.emit('producer-closed', { producerId });
      });

      callback({
        id: consumer.id,
        producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters
      });
    } catch (err) {
      console.error('consume error', err);
      callback({ error: err.message });
    }
  });

  socket.on('resume', async ({ consumerId }, callback) => {
    const info = socketToRoom.get(socket.id);
    const participant = rooms.get(info.roomId)?.participants.get(socket.id);
    const consumer = participant.consumers.get(consumerId);
    if (consumer) {
      await consumer.resume();
    }
    callback();
  });

  // --- END MEDIASOUP SIGNALING ---

  socket.on('media-toggle', ({ micEnabled, videoEnabled, isScreenSharing }) => {
    const info = socketToRoom.get(socket.id);
    if (!info) return;
    const room = rooms.get(info.roomId);
    const participant = room?.participants.get(socket.id);
    if (participant) {
      if (micEnabled !== undefined) participant.micEnabled = micEnabled;
      if (videoEnabled !== undefined) participant.videoEnabled = videoEnabled;
      if (isScreenSharing !== undefined) participant.isScreenSharing = isScreenSharing;
      io.to(info.roomId).emit('participant-media-changed', {
        socketId: socket.id, userId: info.userId,
        micEnabled: participant.micEnabled, videoEnabled: participant.videoEnabled, isScreenSharing: participant.isScreenSharing,
      });
    }
  });

  socket.on('speaking-change', ({ isSpeaking }) => {
    const info = socketToRoom.get(socket.id);
    if (!info) return;
    const participant = rooms.get(info.roomId)?.participants.get(socket.id);
    if (participant) {
      participant.isSpeaking = Boolean(isSpeaking);
      socket.to(info.roomId).emit('participant-speaking-changed', { socketId: socket.id, userId: info.userId, isSpeaking: participant.isSpeaking });
    }
  });

  socket.on('send-message', (msg) => {
    const info = socketToRoom.get(socket.id);
    if (info) io.to(info.roomId).emit('receive-message', { ...msg, id: msg.id || `msg_${Date.now()}`, roomId: info.roomId, timestamp: msg.timestamp || new Date().toISOString() });
  });

  socket.on('host-mute-participant', ({ targetSocketId, targetUserId }) => {
    const info = socketToRoom.get(socket.id);
    const room = rooms.get(info?.roomId);
    const caller = room?.participants.get(socket.id);
    if (!caller || !caller.isHost) return;

    const targetSocket = targetSocketId || Array.from(room.participants.entries()).find(([_, p]) => p.userId === targetUserId)?.[0];
    if (targetSocket) {
      const targetParticipant = room.participants.get(targetSocket);
      targetParticipant.micEnabled = false;
      io.to(targetSocket).emit('forced-mute', { by: caller.name });
      io.to(info.roomId).emit('participant-media-changed', { socketId: targetSocket, userId: targetParticipant.userId, micEnabled: false, videoEnabled: targetParticipant.videoEnabled, isScreenSharing: targetParticipant.isScreenSharing });
    }
  });

  socket.on('host-remove-participant', ({ targetSocketId, targetUserId }) => {
    const info = socketToRoom.get(socket.id);
    const room = rooms.get(info?.roomId);
    const caller = room?.participants.get(socket.id);
    if (!caller || !caller.isHost) return;

    const targetSocket = targetSocketId || Array.from(room.participants.entries()).find(([_, p]) => p.userId === targetUserId)?.[0];
    if (targetSocket) {
      io.to(targetSocket).emit('removed-by-host', { reason: 'Removed by host.' });
      handleLeave(targetSocket);
      io.sockets.sockets.get(targetSocket)?.leave(info.roomId);
    }
  });

  socket.on('host-end-meeting', async () => {
    const info = socketToRoom.get(socket.id);
    const room = rooms.get(info?.roomId);
    const caller = room?.participants.get(socket.id);
    if (!caller || !caller.isHost) return;

    room.status = 'ENDED';
    await updateDbMeetingStatus(info.roomId, 'ENDED');
    io.to(info.roomId).emit('meeting-ended', { by: caller.name });

    for (const [pSocketId] of room.participants) {
      handleLeave(pSocketId);
      io.sockets.sockets.get(pSocketId)?.leave(info.roomId);
    }
    room.router?.close();
    rooms.delete(info.roomId);
  });

  socket.on('disconnect', () => {
    handleLeave(socket.id);
  });
  
  function handleLeave(socketId) {
    const info = socketToRoom.get(socketId);
    if (!info) return;
    const room = rooms.get(info.roomId);
    if (room) {
      const participant = room.participants.get(socketId);
      if (participant) {
        // Close Mediasoup entities
        for (const producer of participant.producers.values()) producer.close();
        for (const consumer of participant.consumers.values()) consumer.close();
        for (const transport of participant.transports.values()) transport.close();
      }
      room.participants.delete(socketId);
      socketToRoom.delete(socketId);

      io.to(info.roomId).emit('participant_left', { socketId, userId: participant?.userId || info.userId, name: participant?.name });

      if (room.participants.size === 0) {
        setTimeout(async () => {
          const freshRoom = rooms.get(info.roomId);
          if (freshRoom && freshRoom.participants.size === 0) {
            freshRoom.status = 'ENDED';
            await updateDbMeetingStatus(info.roomId, 'ENDED');
            freshRoom.router?.close();
            rooms.delete(info.roomId);
          }
        }, 15000);
      }
    }
  }
});

if (!process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 WebRTC Mediasoup SFU Server running on port ${PORT}`);
    console.log(`📡 Health Check: http://localhost:${PORT}/health`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
