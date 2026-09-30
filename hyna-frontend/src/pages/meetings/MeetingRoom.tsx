import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { 
  Video, VideoOff, Mic, MicOff, PhoneOff, 
  MonitorUp, MessageSquare, Users, Settings, 
  Copy, Check, Volume2, VolumeX, Radio, Sparkles, Send, ShieldCheck,
  MoreVertical, UserX, AlertTriangle, RefreshCw
} from 'lucide-react';
import { Button, Avatar, Badge, Modal } from '@/components/ui';
import { useAuthStore } from '@/stores';
import { supabase } from '@/lib/supabase';
import { getUsers, getUserById } from '@/services/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { User, Meeting } from '@/types';

// WebRTC STUN Configuration
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
  ],
};

const SOCKET_SERVER_URL = import.meta.env.VITE_WEBRTC_SERVER_URL || `http://${window.location.hostname}:5050`;

interface Participant {
  socketId: string;
  userId: string;
  name: string;
  avatar: string;
  role?: string;
  designation?: string;
  micEnabled: boolean;
  videoEnabled: boolean;
  isScreenSharing: boolean;
  isSpeaking: boolean;
  isHost: boolean;
  joinedAt: string;
  connectionState?: RTCPeerConnectionState;
}

interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  timestamp: string;
}

export function MeetingRoom() {
  const { id: roomId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, effectiveRole } = useAuthStore();
  const rolePrefix = effectiveRole === 'admin' ? '/admin' : effectiveRole === 'manager' ? '/manager' : '/member';

  // Guest fallback if user is not authenticated yet
  const [guestName, setGuestName] = useState(() => localStorage.getItem('hyna_guest_name') || '');
  const [hasEnteredLobby, setHasEnteredLobby] = useState(Boolean(currentUser));

  const currentUserId = useMemo(() => {
    if (currentUser?.id) return currentUser.id;
    let stored = sessionStorage.getItem('hyna_guest_id');
    if (!stored) {
      stored = 'guest_' + Math.random().toString(36).slice(2, 9);
      sessionStorage.setItem('hyna_guest_id', stored);
    }
    return stored;
  }, [currentUser]);

  const currentUserName = currentUser?.name || guestName.trim() || 'Team Member';
  const currentUserAvatar = currentUser?.avatar || '';

  // Meeting Metadata & Roles
  const [meetingInfo, setMeetingInfo] = useState<Meeting | null>(null);
  const [invitedUsers, setInvitedUsers] = useState<User[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [meetingStatus, setMeetingStatus] = useState<'WAITING' | 'LIVE' | 'ENDED'>('WAITING');

  // Local Media State
  const [micEnabled, setMicEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  // Active Participants List (REAL connected users only)
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [overallConnectionState, setOverallConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  // UI Panels
  const [activeSidePanel, setActiveSidePanel] = useState<'participants' | 'chat' | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Device Selection Modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<{
    audioInputs: MediaDeviceInfo[];
    videoInputs: MediaDeviceInfo[];
    audioOutputs: MediaDeviceInfo[];
  }>({ audioInputs: [], videoInputs: [], audioOutputs: [] });
  const [selectedAudioInput, setSelectedAudioInput] = useState<string>('');
  const [selectedVideoInput, setSelectedVideoInput] = useState<string>('');
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>('');

  // Host Action Dialogs
  const [targetParticipantForHost, setTargetParticipantForHost] = useState<Participant | null>(null);

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const lobbyVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({});
  const iceCandidatesQueueRef = useRef<Record<string, RTCIceCandidateInit[]>>({});
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioAnalysersRef = useRef<Record<string, AnalyserNode>>({});
  const speakingIntervalRef = useRef<number | null>(null);

  // 1. Elapsed Call Timer
  useEffect(() => {
    if (!hasEnteredLobby) return;
    const timer = setInterval(() => {
      setCallDuration(d => d + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [hasEnteredLobby]);

  const formattedCallTime = useMemo(() => {
    const mins = Math.floor(callDuration / 60);
    const secs = callDuration % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [callDuration]);

  // 2. Fetch Meeting Info from Database
  useEffect(() => {
    let isMounted = true;
    async function loadMeeting() {
      if (!roomId) return;
      try {
        await getUsers();
        const { data: byLink } = await supabase
          .from('meetings')
          .select('*')
          .ilike('meeting_link', `%${roomId}%`)
          .maybeSingle();

        let meeting = byLink;
        if (!meeting) {
          const { data: byId } = await supabase
            .from('meetings')
            .select('*')
            .eq('id', roomId)
            .maybeSingle();
          meeting = byId;
        }

        if (isMounted && meeting) {
          setMeetingInfo(meeting);
          if (meeting.participant_ids && Array.isArray(meeting.participant_ids)) {
            const users = meeting.participant_ids
              .map((pId: string) => getUserById(pId))
              .filter(Boolean) as User[];
            setInvitedUsers(users);
          }
        }
      } catch (err) {
        console.error('Failed to load meeting details from DB:', err);
      }
    }
    loadMeeting();
    return () => { isMounted = false; };
  }, [roomId]);

  // 3. Audio Activity Detection (Real-Time Speaking Volume Analyser)
  const setupAudioAnalyser = useCallback((stream: MediaStream, identifier: string) => {
    try {
      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) return;

      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const source = ctx.createMediaStreamSource(new MediaStream([audioTrack]));
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      audioAnalysersRef.current[identifier] = analyser;
    } catch (e) {
      console.warn('Audio analyser setup error:', e);
    }
  }, []);

  // Monitor speaking levels periodically
  useEffect(() => {
    const checkVoiceActivity = () => {
      const analysers = audioAnalysersRef.current;
      for (const [idKey, analyser] of Object.entries(analysers)) {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const isSpeaking = avg > 20;

        if (idKey === 'local') {
          // Send local speaking status change via socket
          if (socketRef.current?.connected) {
            socketRef.current.emit('speaking-change', { isSpeaking });
          }
        } else {
          // Remote peer speaking status
          setParticipants(prev => {
            const p = prev.get(idKey);
            if (p && p.isSpeaking !== isSpeaking) {
              const next = new Map(prev);
              next.set(idKey, { ...p, isSpeaking });
              return next;
            }
            return prev;
          });
        }
      }
    };

    speakingIntervalRef.current = window.setInterval(checkVoiceActivity, 150);
    return () => {
      if (speakingIntervalRef.current) clearInterval(speakingIntervalRef.current);
    };
  }, []);

  // 4. Enumerate Available Audio & Video Devices
  const refreshDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAvailableDevices({
        audioInputs: devices.filter(d => d.kind === 'audioinput'),
        videoInputs: devices.filter(d => d.kind === 'videoinput'),
        audioOutputs: devices.filter(d => d.kind === 'audiooutput'),
      });
    } catch (err) {
      console.warn('Could not enumerate devices:', err);
    }
  }, []);

  // 5. Initialize Local Media Stream
  const initLocalMedia = useCallback(async (audioSourceId?: string, videoSourceId?: string) => {
    setMediaError(null);
    try {
      const constraints: MediaStreamConstraints = {
        video: videoSourceId ? { deviceId: { exact: videoSourceId } } : {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: audioSourceId ? { deviceId: { exact: audioSourceId } } : {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      if (lobbyVideoRef.current) {
        lobbyVideoRef.current.srcObject = stream;
      }

      setupAudioAnalyser(stream, 'local');
      refreshDevices();
      return stream;
    } catch (err: any) {
      console.warn('getUserMedia error with audio/video:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMediaError('Camera or microphone permission was denied. Please allow device access in browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setMediaError('No camera or microphone device was found on this system.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setMediaError('Camera or microphone is already in use by another application.');
      } else {
        setMediaError(`Media device error: ${err.message || 'Unable to access media'}`);
      }

      // Fallback: try audio only
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = audioStream;
        setVideoEnabled(false);
        setupAudioAnalyser(audioStream, 'local');
        refreshDevices();
        return audioStream;
      } catch (audioErr) {
        console.error('Audio fallback also failed:', audioErr);
        return null;
      }
    }
  }, [setupAudioAnalyser, refreshDevices]);

  useEffect(() => {
    initLocalMedia();
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [initLocalMedia]);

  // 6. WebRTC Peer Connection Factory
  const createPeerConnection = useCallback((remoteSocketId: string) => {
    if (peerConnectionsRef.current[remoteSocketId]) {
      return peerConnectionsRef.current[remoteSocketId];
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnectionsRef.current[remoteSocketId] = pc;
    iceCandidatesQueueRef.current[remoteSocketId] = [];

    // Add local tracks to this peer connection
    const currentStream = screenStreamRef.current || localStreamRef.current;
    if (currentStream) {
      currentStream.getTracks().forEach(track => {
        pc.addTrack(track, currentStream);
      });
    }

    // Handle incoming remote media tracks
    pc.ontrack = (event) => {
      console.log(`[WebRTC] Received remote track from ${remoteSocketId}:`, event.track.kind);
      const stream = event.streams[0] || new MediaStream([event.track]);
      
      setRemoteStreams(prev => ({
        ...prev,
        [remoteSocketId]: stream,
      }));

      setupAudioAnalyser(stream, remoteSocketId);
    };

    // Send local ICE candidates to remote peer via Socket.IO
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', {
          target: remoteSocketId,
          candidate: event.candidate,
        });
      }
    };

    // Monitor connection state
    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Peer ${remoteSocketId} connectionState:`, pc.connectionState);
      setParticipants(prev => {
        const p = prev.get(remoteSocketId);
        if (p) {
          const next = new Map(prev);
          next.set(remoteSocketId, { ...p, connectionState: pc.connectionState });
          return next;
        }
        return prev;
      });

      if (pc.connectionState === 'connected') {
        setOverallConnectionState('connected');
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        setOverallConnectionState('disconnected');
      }
    };

    return pc;
  }, [setupAudioAnalyser]);

  // 7. Socket.IO Signaling Connection & Event Listeners
  useEffect(() => {
    if (!roomId || !hasEnteredLobby) return;

    console.log(`[Socket] Connecting to signaling server at: ${SOCKET_SERVER_URL}`);
    const socket = io(SOCKET_SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log(`[Socket] Connected with ID: ${socket.id}`);
      setOverallConnectionState('connected');

      // Join room with full participant data
      socket.emit('join-room', {
        roomId,
        user: {
          userId: currentUserId,
          name: currentUserName,
          avatar: currentUserAvatar,
          role: effectiveRole,
          designation: currentUser?.designation || 'Member',
        },
        micEnabled,
        videoEnabled,
      });
    });

    // Successfully joined room
    socket.on('room-joined', async ({ isHost: verifiedHost, status, participants: existingPeers }) => {
      console.log('[Socket] room-joined:', { verifiedHost, status, existingPeersCount: existingPeers.length });
      setIsHost(Boolean(verifiedHost));
      setMeetingStatus(status || 'LIVE');

      const initialMap = new Map<string, Participant>();
      existingPeers.forEach((p: Participant) => {
        initialMap.set(p.socketId, { ...p, connectionState: 'connecting' });
      });
      setParticipants(initialMap);

      // Create WebRTC Offer for each already connected peer
      for (const peer of existingPeers) {
        try {
          const pc = createPeerConnection(peer.socketId);
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          });
          await pc.setLocalDescription(offer);

          socket.emit('offer', {
            target: peer.socketId,
            sdp: pc.localDescription,
          });
        } catch (err) {
          console.error(`Error initiating WebRTC offer to ${peer.name}:`, err);
        }
      }
    });

    // Another participant joined the room
    socket.on('participant_joined', (newParticipant: Participant) => {
      console.log('[Socket] participant_joined:', newParticipant);
      setParticipants(prev => {
        const next = new Map(prev);
        next.set(newParticipant.socketId, { ...newParticipant, connectionState: 'connecting' });
        return next;
      });
      toast.info(`${newParticipant.name} joined the meeting`);
    });

    // WebRTC Offer received from a peer
    socket.on('offer', async ({ callerSocketId, sdp }) => {
      console.log(`[WebRTC] Received offer from: ${callerSocketId}`);
      try {
        const pc = createPeerConnection(callerSocketId);
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));

        // Flush any queued ICE candidates for this caller
        const queue = iceCandidatesQueueRef.current[callerSocketId] || [];
        while (queue.length > 0) {
          const candidate = queue.shift();
          if (candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('answer', {
          target: callerSocketId,
          sdp: answer,
        });
      } catch (err) {
        console.error('Error handling WebRTC offer:', err);
      }
    });

    // WebRTC Answer received
    socket.on('answer', async ({ responderSocketId, sdp }) => {
      console.log(`[WebRTC] Received answer from: ${responderSocketId}`);
      const pc = peerConnectionsRef.current[responderSocketId];
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          const queue = iceCandidatesQueueRef.current[responderSocketId] || [];
          while (queue.length > 0) {
            const candidate = queue.shift();
            if (candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
        } catch (err) {
          console.error('Error setting remote description from answer:', err);
        }
      }
    });

    // ICE Candidate received
    socket.on('ice-candidate', async ({ senderSocketId, candidate }) => {
      const pc = peerConnectionsRef.current[senderSocketId];
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('Error adding received ICE candidate:', err);
        }
      } else {
        if (!iceCandidatesQueueRef.current[senderSocketId]) {
          iceCandidatesQueueRef.current[senderSocketId] = [];
        }
        iceCandidatesQueueRef.current[senderSocketId].push(candidate);
      }
    });

    // Media status updated (camera / mic / screen share)
    socket.on('participant-media-changed', ({ socketId, micEnabled: mEn, videoEnabled: vEn, isScreenSharing: sSh }) => {
      setParticipants(prev => {
        const p = prev.get(socketId);
        if (p) {
          const next = new Map(prev);
          next.set(socketId, {
            ...p,
            micEnabled: mEn !== undefined ? mEn : p.micEnabled,
            videoEnabled: vEn !== undefined ? vEn : p.videoEnabled,
            isScreenSharing: sSh !== undefined ? sSh : p.isScreenSharing,
          });
          return next;
        }
        return prev;
      });
    });

    // Speaking activity updated
    socket.on('participant-speaking-changed', ({ socketId, isSpeaking }) => {
      setParticipants(prev => {
        const p = prev.get(socketId);
        if (p) {
          const next = new Map(prev);
          next.set(socketId, { ...p, isSpeaking });
          return next;
        }
        return prev;
      });
    });

    // Chat Message received
    socket.on('receive-message', (msg: ChatMessage) => {
      setChatMessages(prev => [...prev, msg]);
      if (activeSidePanel !== 'chat') {
        setUnreadChatCount(c => c + 1);
      }
    });

    // Host Action: Forced Mute
    socket.on('forced-mute', ({ by }) => {
      toast.warning(`Your microphone was muted by host ${by}`);
      setMicEnabled(false);
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = false; });
      }
      socket.emit('media-toggle', { micEnabled: false });
    });

    // Host Action: Removed from Meeting
    socket.on('removed-by-host', ({ reason }) => {
      toast.error(reason || 'You were removed from the meeting by the host.');
      cleanupAndLeave();
    });

    // Host Action: Meeting Ended
    socket.on('meeting-ended', ({ by, message }) => {
      toast.info(message || `The meeting was ended by host ${by}.`);
      setMeetingStatus('ENDED');
      setTimeout(() => {
        cleanupAndLeave();
      }, 2000);
    });

    // Participant Left
    socket.on('participant_left', ({ socketId, name }) => {
      console.log(`[Socket] participant_left: ${socketId} (${name})`);
      if (name) toast.info(`${name} left the meeting`);

      // Close peer connection
      if (peerConnectionsRef.current[socketId]) {
        peerConnectionsRef.current[socketId].close();
        delete peerConnectionsRef.current[socketId];
      }
      delete iceCandidatesQueueRef.current[socketId];
      delete audioAnalysersRef.current[socketId];

      setRemoteStreams(prev => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });

      setParticipants(prev => {
        const next = new Map(prev);
        next.delete(socketId);
        return next;
      });
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected from signaling server');
      setOverallConnectionState('disconnected');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, hasEnteredLobby, currentUserId, currentUserName, currentUserAvatar, effectiveRole, currentUser?.designation, micEnabled, videoEnabled, createPeerConnection, activeSidePanel]);

  // 8. Toggle Microphone
  const toggleMic = () => {
    const nextState = !micEnabled;
    setMicEnabled(nextState);

    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = nextState;
      });
    }

    if (socketRef.current?.connected) {
      socketRef.current.emit('media-toggle', { micEnabled: nextState });
    }
  };

  // 9. Toggle Camera
  const toggleVideo = () => {
    const nextState = !videoEnabled;
    setVideoEnabled(nextState);

    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = nextState;
      });
    }

    if (socketRef.current?.connected) {
      socketRef.current.emit('media-toggle', { videoEnabled: nextState });
    }
  };

  // 10. Real Screen Sharing
  const toggleScreenShare = async () => {
    if (!screenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        const screenTrack = screenStream.getVideoTracks()[0];
        screenStreamRef.current = screenStream;
        setScreenSharing(true);

        // Replace video track in all active peer connections
        Object.values(peerConnectionsRef.current).forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        screenTrack.onended = () => {
          stopScreenShare();
        };

        if (socketRef.current?.connected) {
          socketRef.current.emit('media-toggle', { isScreenSharing: true });
        }
        toast.success('Sharing your screen with participants');
      } catch (err) {
        console.warn('Screen sharing cancelled or failed:', err);
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }
    setScreenSharing(false);

    // Revert back to camera track
    const camTrack = localStreamRef.current?.getVideoTracks()[0] || null;
    if (camTrack) {
      Object.values(peerConnectionsRef.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(camTrack);
        }
      });
      if (localVideoRef.current && localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    }

    if (socketRef.current?.connected) {
      socketRef.current.emit('media-toggle', { isScreenSharing: false });
    }
    toast.info('Stopped screen sharing');
  };

  // 11. Deafen (Mute all incoming audio)
  const toggleDeafen = () => {
    setIsDeafened(prev => !prev);
  };

  // 12. Switch Camera or Microphone Device
  const handleDeviceChange = async (kind: 'audio' | 'video', deviceId: string) => {
    try {
      if (kind === 'audio') {
        setSelectedAudioInput(deviceId);
        const newStream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: deviceId } },
        });
        const newTrack = newStream.getAudioTracks()[0];
        if (localStreamRef.current) {
          const oldTrack = localStreamRef.current.getAudioTracks()[0];
          if (oldTrack) {
            localStreamRef.current.removeTrack(oldTrack);
            oldTrack.stop();
          }
          localStreamRef.current.addTrack(newTrack);
        }
        // Replace in peer connections
        Object.values(peerConnectionsRef.current).forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'audio');
          if (sender) sender.replaceTrack(newTrack);
        });
        setupAudioAnalyser(newStream, 'local');
        toast.success('Microphone changed');
      } else {
        setSelectedVideoInput(deviceId);
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        const newTrack = newStream.getVideoTracks()[0];
        if (localStreamRef.current) {
          const oldTrack = localStreamRef.current.getVideoTracks()[0];
          if (oldTrack) {
            localStreamRef.current.removeTrack(oldTrack);
            oldTrack.stop();
          }
          localStreamRef.current.addTrack(newTrack);
        }
        if (!screenSharing && localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
        Object.values(peerConnectionsRef.current).forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender && !screenSharing) sender.replaceTrack(newTrack);
        });
        toast.success('Camera changed');
      }
    } catch (err) {
      console.error('Error switching device:', err);
      toast.error('Failed to switch device');
    }
  };

  // 13. Send Chat Message
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    const messagePayload: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      roomId: roomId || '',
      senderId: currentUserId,
      senderName: currentUserName,
      senderAvatar: currentUserAvatar,
      text: chatInput.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatInput('');
    if (socketRef.current?.connected) {
      socketRef.current.emit('send-message', messagePayload);
    }
  };

  // 14. Host Actions
  const handleHostMute = (participant: Participant) => {
    if (!isHost) return;
    socketRef.current?.emit('host-mute-participant', {
      targetSocketId: participant.socketId,
      targetUserId: participant.userId,
    });
    toast.success(`Muted ${participant.name}`);
  };

  const handleHostRemove = (participant: Participant) => {
    if (!isHost) return;
    socketRef.current?.emit('host-remove-participant', {
      targetSocketId: participant.socketId,
      targetUserId: participant.userId,
    });
    toast.info(`Removed ${participant.name} from meeting`);
  };

  const handleHostEndMeeting = () => {
    if (!isHost) return;
    socketRef.current?.emit('host-end-meeting');
    cleanupAndLeave();
  };

  // 15. Copy Invite Link
  const handleCopyLink = () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    toast.success('Meeting link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // 16. Cleanup & Leave Meeting
  const cleanupAndLeave = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }
    Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
    peerConnectionsRef.current = {};
    iceCandidatesQueueRef.current = {};
    audioAnalysersRef.current = {};

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    navigate(`${rolePrefix}/meetings`);
  }, [navigate, rolePrefix]);

  // Handle browser tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      cleanupAndLeave();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [cleanupAndLeave]);

  // Offline Invited Calculation (invited users in meeting who haven't connected)
  const connectedUserIds = useMemo(() => {
    const set = new Set<string>();
    set.add(currentUserId);
    participants.forEach(p => set.add(p.userId));
    return set;
  }, [participants, currentUserId]);

  const offlineInvitedUsers = useMemo(() => {
    return invitedUsers.filter(u => !connectedUserIds.has(u.id));
  }, [invitedUsers, connectedUserIds]);

  // Is anyone sharing screen?
  const screenSharer = useMemo(() => {
    if (screenSharing) {
      return { socketId: 'local', name: 'You', stream: screenStreamRef.current };
    }
    for (const [sId, p] of participants) {
      if (p.isScreenSharing && remoteStreams[sId]) {
        return { socketId: sId, name: p.name, stream: remoteStreams[sId] };
      }
    }
    return null;
  }, [screenSharing, participants, remoteStreams]);

  // =========================================================================
  // PRE-JOIN LOBBY FOR GUEST USERS (When joining directly via URL without login)
  // =========================================================================
  if (!hasEnteredLobby && !currentUser) {
    return (
      <div className="h-screen w-full bg-[#111214] flex flex-col items-center justify-center p-4 text-white font-sans">
        <div className="w-full max-w-md bg-[#1e1f22] border border-[#2b2d31] rounded-3xl p-6 shadow-2xl flex flex-col items-center animate-in fade-in zoom-in-95">
          <div className="w-14 h-14 rounded-2xl bg-[#2F3EFF] flex items-center justify-center text-white mb-4 shadow-lg shadow-[#2F3EFF]/25">
            <Radio className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-gray-100">Join Meeting</h2>
          <p className="text-xs text-gray-400 mt-1 text-center">
            {meetingInfo?.title || `Room: #${roomId?.slice(0, 10)}`}
          </p>

          {/* Camera preview */}
          <div className="w-full aspect-video rounded-2xl bg-[#2b2d31] border border-[#383a40] overflow-hidden my-5 relative flex items-center justify-center shadow-inner">
            {videoEnabled ? (
              <video ref={lobbyVideoRef} autoPlay playsInline muted className="w-full h-full object-cover -scale-x-100" />
            ) : (
              <Avatar name={guestName || 'You'} size="lg" className="w-16 h-16 text-lg" />
            )}
            <div className="absolute bottom-2 right-2 flex gap-2">
              <button 
                type="button" 
                onClick={toggleMic} 
                className={cn("p-2 rounded-xl text-xs transition-colors shadow-md", micEnabled ? "bg-[#313338] text-white" : "bg-red-500 text-white")}
              >
                {micEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4 text-white" />}
              </button>
              <button 
                type="button" 
                onClick={toggleVideo} 
                className={cn("p-2 rounded-xl text-xs transition-colors shadow-md", videoEnabled ? "bg-[#313338] text-white" : "bg-red-500 text-white")}
              >
                {videoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4 text-white" />}
              </button>
            </div>
          </div>

          <div className="w-full space-y-3">
            <label className="text-xs text-gray-400 block font-medium">Your Name</label>
            <input 
              type="text" 
              placeholder="e.g. Jashwin" 
              value={guestName} 
              onChange={e => setGuestName(e.target.value)}
              className="w-full bg-[#2b2d31] border border-[#383a40] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#2F3EFF]"
              autoFocus
            />
            <Button
              className="w-full h-11 bg-[#2F3EFF] hover:bg-[#2532cc] text-white rounded-xl font-semibold shadow-lg shadow-[#2F3EFF]/25 mt-2"
              onClick={() => {
                if (!guestName.trim()) {
                  toast.error("Please enter your name to join");
                  return;
                }
                localStorage.setItem('hyna_guest_name', guestName.trim());
                setHasEnteredLobby(true);
              }}
            >
              Join Voice & Video
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const participantsList = Array.from(participants.values());

  return (
    <div className="h-screen w-full bg-[#0a0a0c] flex flex-col overflow-hidden text-white font-sans select-none">
      {/* Autoplay Blocked Alert Bar */}
      {autoplayBlocked && (
        <div className="bg-[#2F3EFF] px-4 py-2 flex items-center justify-between text-xs text-white z-50">
          <span>Browser blocked audio autoplay. Click here to enable audio playback:</span>
          <button 
            onClick={() => {
              if (audioContextRef.current?.state === 'suspended') {
                audioContextRef.current.resume();
              }
              setAutoplayBlocked(false);
            }} 
            className="bg-white text-[#2F3EFF] px-3 py-1 rounded-md font-semibold text-xs"
          >
            Enable Audio
          </button>
        </div>
      )}

      {/* Header Bar */}
      <header className="h-16 border-b border-[#1f2028] flex items-center justify-between px-6 bg-[#0f1015] z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="font-semibold text-base tracking-wide text-gray-100">
              {meetingInfo?.title || `Meeting: ${roomId}`}
            </span>
          </div>
          <span className="text-gray-400 bg-[#1a1b22] px-3 py-1 rounded-md text-xs font-mono border border-gray-800">
            {formattedCallTime}
          </span>
          <Badge className="bg-[#1a1b22] text-xs font-medium text-gray-300 border border-gray-800">
            {meetingStatus}
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          {/* WebRTC Connection Status Badge */}
          <div className="flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full bg-[#14151c] border border-gray-800">
            <span className={cn(
              "w-2 h-2 rounded-full",
              overallConnectionState === 'connected' ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-amber-500 animate-ping"
            )} />
            <span className={overallConnectionState === 'connected' ? 'text-green-400' : 'text-amber-400'}>
              {overallConnectionState === 'connected' ? 'Connected (WebRTC)' : 'Connecting...'}
            </span>
          </div>

          {/* Quick Copy Link Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopyLink}
            className="h-8 border-gray-800 bg-[#1a1b22] hover:bg-gray-800 text-gray-200 text-xs gap-1.5 rounded-lg"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedLink ? 'Copied' : 'Copy Link'}
          </Button>

          {/* Participants Count */}
          <div className="flex items-center gap-1.5 text-gray-300 bg-[#1a1b22] px-3 py-1 rounded-lg border border-gray-800 text-xs">
            <Users className="w-3.5 h-3.5" />
            <span className="font-semibold">{participantsList.length + 1}</span>
          </div>
        </div>
      </header>

      {/* Main Video & Stage Area */}
      <main className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 p-4 overflow-y-auto flex flex-col justify-center items-center">
          {/* Media Permission Error Banner */}
          {mediaError && (
            <div className="mb-4 w-full max-w-2xl bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center gap-3 text-xs text-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <div className="flex-1">{mediaError}</div>
              <Button size="sm" variant="outline" onClick={() => initLocalMedia()} className="text-xs h-7 border-amber-500/40 text-amber-200">
                <RefreshCw className="w-3 h-3 mr-1" /> Retry
              </Button>
            </div>
          )}

          {screenSharer ? (
            /* Screen Sharing Spotlight View */
            <div className="w-full h-full flex flex-col gap-3">
              <div className="flex-1 bg-[#0f1015] rounded-2xl overflow-hidden border border-gray-800 relative flex items-center justify-center shadow-2xl">
                <VideoFeed
                  stream={screenSharer.stream}
                  isMuted={screenSharer.socketId === 'local' || isDeafened}
                  onAutoplayBlocked={() => setAutoplayBlocked(true)}
                  className="w-full h-full object-contain bg-black"
                />
                <div className="absolute top-4 left-4 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 border border-white/10">
                  <MonitorUp className="w-3.5 h-3.5 text-[#2F3EFF]" />
                  <span>{screenSharer.name} is sharing screen</span>
                </div>
              </div>

              {/* Participants Strip Below Screen Share */}
              <div className="h-28 flex gap-3 overflow-x-auto pb-1 justify-center">
                {/* Local strip tile */}
                <div className="w-44 h-full relative rounded-xl overflow-hidden bg-[#16171f] border border-gray-800">
                  {videoEnabled ? (
                    <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Avatar name={currentUserName} size="sm" />
                    </div>
                  )}
                  <div className="absolute bottom-1.5 left-1.5 bg-black/60 px-2 py-0.5 rounded text-[10px]">
                    You {!micEnabled && '🔇'}
                  </div>
                </div>

                {/* Remote strip tiles */}
                {participantsList.map(peer => (
                  <div key={peer.socketId} className="w-44 h-full relative rounded-xl overflow-hidden bg-[#16171f] border border-gray-800">
                    {remoteStreams[peer.socketId] && peer.videoEnabled ? (
                      <VideoFeed
                        stream={remoteStreams[peer.socketId]}
                        isMuted={isDeafened}
                        onAutoplayBlocked={() => setAutoplayBlocked(true)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Avatar name={peer.name} size="sm" />
                      </div>
                    )}
                    <div className="absolute bottom-1.5 left-1.5 bg-black/60 px-2 py-0.5 rounded text-[10px] truncate max-w-[120px]">
                      {peer.name} {!peer.micEnabled && '🔇'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : participantsList.length === 0 ? (
            /* Solo In Room (Waiting for Others) - Real Clean State */
            <div className="w-full max-w-2xl flex flex-col items-center justify-center gap-6">
              {/* Local User Preview Tile */}
              <div
                className={cn(
                  'w-full aspect-video max-h-[380px] bg-[#0f1015] rounded-2xl overflow-hidden border relative shadow-2xl transition-all duration-200',
                  micEnabled ? 'border-[#2F3EFF]/40' : 'border-gray-800'
                )}
              >
                {videoEnabled ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover -scale-x-100"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#16171f] to-[#0f1015]">
                    <Avatar name={currentUserName} size="xl" className="w-24 h-24 text-2xl" />
                    <p className="mt-3 text-sm text-gray-400">Camera is off</p>
                  </div>
                )}

                <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-2 border border-white/10 text-xs">
                  <span className="font-semibold text-white">You</span>
                  {isHost && <span className="bg-[#2F3EFF] text-[10px] px-1.5 py-0.2 rounded font-bold">HOST</span>}
                  {!micEnabled && <MicOff className="w-3.5 h-3.5 text-red-400" />}
                </div>
              </div>

              {/* Waiting Notification Box */}
              <div className="w-full bg-[#0f1015] border border-gray-800 rounded-2xl p-5 text-center flex flex-col items-center shadow-lg">
                <div className="w-12 h-12 rounded-full bg-[#2F3EFF]/15 text-[#2F3EFF] flex items-center justify-center mb-3">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
                <h3 className="text-base font-semibold text-gray-100">You are the only one in this meeting</h3>
                <p className="text-xs text-gray-400 mt-1 max-w-md">
                  No other participants have joined yet. Once an invited teammate opens the meeting link, their live video and audio will automatically connect!
                </p>
                <div className="flex items-center gap-3 mt-4">
                  <Button
                    onClick={handleCopyLink}
                    className="bg-[#2F3EFF] hover:bg-[#2532cc] text-white text-xs h-9 px-4 rounded-xl gap-2 font-medium shadow-md shadow-[#2F3EFF]/25"
                  >
                    {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedLink ? 'Link Copied!' : 'Copy Meeting Link'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setActiveSidePanel('participants')}
                    className="border-gray-800 bg-[#16171f] hover:bg-gray-800 text-gray-200 text-xs h-9 px-4 rounded-xl gap-2"
                  >
                    <Users className="w-4 h-4" />
                    View Invited ({offlineInvitedUsers.length})
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* Multi-User Dynamic Workspace Grid (ONLY REAL CONNECTED PARTICIPANTS) */
            <div
              className={cn(
                'w-full h-full grid gap-4 place-content-center',
                participantsList.length === 1
                  ? 'grid-cols-1 md:grid-cols-2 max-w-5xl'
                  : participantsList.length <= 3
                  ? 'grid-cols-2 max-w-6xl'
                  : 'grid-cols-2 md:grid-cols-3 max-w-7xl'
              )}
            >
              {/* Local User Tile */}
              <div
                className={cn(
                  'relative bg-[#0f1015] rounded-2xl overflow-hidden border aspect-video flex items-center justify-center shadow-xl transition-all duration-200 group',
                  'border-gray-800'
                )}
              >
                {videoEnabled ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover -scale-x-100"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#16171f] to-[#0f1015]">
                    <Avatar name={currentUserName} size="xl" className="w-20 h-20 text-xl" />
                    <p className="mt-3 text-xs text-gray-400">Camera off</p>
                  </div>
                )}
                <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-2 border border-white/10 text-xs">
                  <span className="font-semibold text-white">You</span>
                  {isHost && <span className="bg-[#2F3EFF] text-[10px] px-1.5 py-0.2 rounded font-bold">HOST</span>}
                  {!micEnabled && <MicOff className="w-3.5 h-3.5 text-red-400" />}
                </div>
              </div>

              {/* Remote Participants Tiles (Real WebRTC Video Streams) */}
              {participantsList.map(peer => {
                const stream = remoteStreams[peer.socketId];
                const isSpeaking = peer.isSpeaking;

                return (
                  <div
                    key={peer.socketId}
                    className={cn(
                      'relative bg-[#0f1015] rounded-2xl overflow-hidden border aspect-video flex items-center justify-center shadow-xl transition-all duration-200 animate-in fade-in zoom-in-95',
                      isSpeaking
                        ? 'border-[#23a55a] ring-4 ring-[#23a55a]/40 shadow-[0_0_20px_rgba(35,165,90,0.4)]'
                        : 'border-gray-800'
                    )}
                  >
                    {stream && peer.videoEnabled ? (
                      <VideoFeed
                        stream={stream}
                        isMuted={isDeafened}
                        onAutoplayBlocked={() => setAutoplayBlocked(true)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#16171f] to-[#0f1015]">
                        {/* Audio element so voice continues streaming even if video is off */}
                        {stream && (
                          <audio
                            ref={audioEl => {
                              if (audioEl && stream) {
                                audioEl.srcObject = stream;
                              }
                            }}
                            autoPlay
                            muted={isDeafened}
                          />
                        )}
                        <div className={cn(
                          'rounded-full p-2 transition-all duration-200',
                          isSpeaking ? 'ring-4 ring-[#23a55a]' : ''
                        )}>
                          <Avatar name={peer.name} size="xl" className="w-20 h-20 text-xl" />
                        </div>
                        <p className="mt-3 text-xs text-gray-400">
                          {!peer.videoEnabled ? 'Camera off' : 'Connecting stream...'}
                        </p>
                      </div>
                    )}

                    {/* Participant Info Tag */}
                    <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-2 border border-white/10 text-xs">
                      <span className="font-semibold text-white">{peer.name}</span>
                      {peer.isHost && <span className="bg-[#2F3EFF] text-[10px] px-1.5 py-0.2 rounded font-bold">HOST</span>}
                      {peer.designation && (
                        <span className="text-[10px] text-gray-400 border-l border-white/20 pl-2">
                          {peer.designation}
                        </span>
                      )}
                      {!peer.micEnabled && <MicOff className="w-3.5 h-3.5 text-red-400" />}
                      {isSpeaking && <span className="w-2 h-2 rounded-full bg-[#23a55a] animate-pulse" />}
                    </div>

                    {/* Host action button on participant tile */}
                    {isHost && (
                      <div className="absolute top-3 right-3 flex gap-1">
                        <button
                          onClick={() => handleHostMute(peer)}
                          title="Mute Participant"
                          className="p-1.5 rounded-lg bg-black/60 hover:bg-red-500/80 text-white backdrop-blur-sm transition-colors text-xs"
                        >
                          <MicOff className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleHostRemove(peer)}
                          title="Remove from Meeting"
                          className="p-1.5 rounded-lg bg-black/60 hover:bg-red-600 text-white backdrop-blur-sm transition-colors text-xs"
                        >
                          <UserX className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Side Panel (Participants / Live In-Meeting Chat) */}
        {activeSidePanel && (
          <div className="w-80 border-l border-gray-800 bg-[#0f1015] flex flex-col z-20 shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Side Panel Tabs Header */}
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveSidePanel('participants')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5',
                    activeSidePanel === 'participants'
                      ? 'bg-gray-800 text-white shadow-sm'
                      : 'text-gray-400 hover:text-gray-200'
                  )}
                >
                  <Users className="w-3.5 h-3.5" />
                  In Call ({participantsList.length + 1})
                </button>
                <button
                  onClick={() => {
                    setActiveSidePanel('chat');
                    setUnreadChatCount(0);
                  }}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 relative',
                    activeSidePanel === 'chat'
                      ? 'bg-gray-800 text-white shadow-sm'
                      : 'text-gray-400 hover:text-gray-200'
                  )}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Chat
                  {unreadChatCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-[#2F3EFF]" />
                  )}
                </button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveSidePanel(null)}
                className="h-7 w-7 p-0 text-gray-400 hover:text-white"
              >
                ✕
              </Button>
            </div>

            {/* Participants View */}
            {activeSidePanel === 'participants' && (
              <div className="flex-1 p-4 overflow-y-auto space-y-6">
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Connected Participants — {participantsList.length + 1}
                  </h4>
                  <div className="space-y-2">
                    {/* Self */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-[#16171f] border border-gray-800">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar name={currentUserName} size="sm" />
                        <div className="truncate">
                          <p className="text-xs font-medium text-white truncate flex items-center gap-1.5">
                            {currentUserName}
                            <span className="text-[10px] text-[#2F3EFF] font-semibold">(You)</span>
                            {isHost && <span className="bg-[#2F3EFF] text-[9px] px-1 py-0.2 rounded font-bold">HOST</span>}
                          </p>
                          <p className="text-[10px] text-gray-400">{currentUser?.designation || 'Participant'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-400">
                        {micEnabled ? <Mic className="w-3.5 h-3.5 text-gray-300" /> : <MicOff className="w-3.5 h-3.5 text-red-400" />}
                        {videoEnabled ? <Video className="w-3.5 h-3.5 text-gray-300" /> : <VideoOff className="w-3.5 h-3.5 text-red-400" />}
                      </div>
                    </div>

                    {/* Remote Participants */}
                    {participantsList.map(peer => (
                      <div key={peer.socketId} className="flex items-center justify-between p-2 rounded-xl bg-[#16171f] border border-gray-800 group">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar name={peer.name} size="sm" />
                          <div className="truncate">
                            <p className="text-xs font-medium text-white truncate flex items-center gap-1.5">
                              {peer.name}
                              {peer.isHost && <span className="bg-[#2F3EFF] text-[9px] px-1 py-0.2 rounded font-bold">HOST</span>}
                            </p>
                            <p className="text-[10px] text-gray-400 truncate">{peer.designation || 'Member'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 text-gray-400">
                            {peer.micEnabled ? <Mic className="w-3.5 h-3.5 text-gray-300" /> : <MicOff className="w-3.5 h-3.5 text-red-400" />}
                            {peer.videoEnabled ? <Video className="w-3.5 h-3.5 text-gray-300" /> : <VideoOff className="w-3.5 h-3.5 text-red-400" />}
                          </div>
                          {isHost && (
                            <div className="flex items-center gap-1 border-l border-gray-700 pl-2">
                              <button
                                onClick={() => handleHostMute(peer)}
                                title="Mute Participant"
                                className="p-1 hover:text-red-400 transition-colors"
                              >
                                <MicOff className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleHostRemove(peer)}
                                title="Remove Participant"
                                className="p-1 hover:text-red-400 transition-colors"
                              >
                                <UserX className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Offline Invited Users */}
                {offlineInvitedUsers.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-gray-500" />
                      Invited / Not Yet Joined — {offlineInvitedUsers.length}
                    </h4>
                    <div className="space-y-1.5">
                      {offlineInvitedUsers.map(user => (
                        <div key={user.id} className="flex items-center justify-between p-2 rounded-xl bg-[#0f1015] opacity-60 border border-dashed border-gray-800">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar name={user.name} size="sm" />
                            <div className="truncate">
                              <p className="text-xs font-medium text-gray-300 truncate">{user.name}</p>
                              <p className="text-[10px] text-gray-500 truncate">{user.designation || 'Invited'}</p>
                            </div>
                          </div>
                          <span className="text-[10px] bg-gray-800 px-2 py-0.5 rounded text-gray-400">Offline</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Host Control: End Meeting Button */}
                {isHost && (
                  <div className="pt-2">
                    <Button
                      onClick={handleHostEndMeeting}
                      className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/40 text-xs h-9 rounded-xl font-medium"
                    >
                      End Meeting for All
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* In-Meeting Live Chat */}
            {activeSidePanel === 'chat' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  {chatMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 text-gray-400">
                      <MessageSquare className="w-8 h-8 text-gray-600 mb-2" />
                      <p className="text-xs font-medium">Meeting Chat</p>
                      <p className="text-[11px] text-gray-500 mt-1">Chat messages are delivered in real time to all room participants.</p>
                    </div>
                  ) : (
                    chatMessages.map(msg => {
                      const isMe = msg.senderId === currentUserId;
                      return (
                        <div key={msg.id} className="text-xs space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-gray-200">{isMe ? 'You' : msg.senderName}</span>
                            <span className="text-[10px] text-gray-500">{msg.timestamp}</span>
                          </div>
                          <div className="bg-[#1a1b22] text-gray-200 p-2.5 rounded-xl rounded-tl-none border border-gray-800 inline-block max-w-full break-words">
                            {msg.text}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-800 bg-[#0f1015]">
                  <div className="flex items-center gap-2 bg-[#1a1b22] border border-gray-700 rounded-xl px-3 py-1.5 focus-within:border-[#2F3EFF] transition-colors">
                    <input
                      type="text"
                      placeholder="Type a message..."
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      className="flex-1 bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim()}
                      className="text-[#2F3EFF] disabled:text-gray-600 hover:text-white transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer Meeting Controls Dock */}
      <footer className="h-20 bg-[#0f1015] border-t border-gray-800 flex items-center justify-center gap-4 px-6 relative z-30">
        {/* Mic Toggle */}
        <Button
          onClick={toggleMic}
          className={cn(
            'h-12 w-12 rounded-full flex items-center justify-center border-none transition-all shadow-md',
            micEnabled
              ? 'bg-gray-800 hover:bg-gray-700 text-white'
              : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
          )}
        >
          {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </Button>

        {/* Video Toggle */}
        <Button
          onClick={toggleVideo}
          className={cn(
            'h-12 w-12 rounded-full flex items-center justify-center border-none transition-all shadow-md',
            videoEnabled
              ? 'bg-gray-800 hover:bg-gray-700 text-white'
              : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
          )}
        >
          {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </Button>

        {/* Screen Share Toggle */}
        <Button
          onClick={toggleScreenShare}
          className={cn(
            'h-12 w-12 rounded-full flex items-center justify-center border-none transition-all shadow-md',
            screenSharing
              ? 'bg-[#2F3EFF] hover:bg-[#2532cc] text-white shadow-[#2F3EFF]/30'
              : 'bg-gray-800 hover:bg-gray-700 text-white'
          )}
        >
          <MonitorUp className="w-5 h-5" />
        </Button>

        {/* Deafen (Incoming Audio Mute) */}
        <Button
          onClick={toggleDeafen}
          className={cn(
            'h-12 w-12 rounded-full flex items-center justify-center border-none transition-all shadow-md',
            isDeafened
              ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
              : 'bg-gray-800 hover:bg-gray-700 text-white'
          )}
        >
          {isDeafened ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </Button>

        <div className="w-px h-8 bg-gray-800 mx-2" />

        {/* Participants Toggle */}
        <Button
          onClick={() => setActiveSidePanel(p => (p === 'participants' ? null : 'participants'))}
          className={cn(
            'h-12 w-12 rounded-full flex items-center justify-center border-none relative transition-all',
            activeSidePanel === 'participants'
              ? 'bg-[#2F3EFF]/20 text-[#2F3EFF]'
              : 'bg-gray-800 hover:bg-gray-700 text-white'
          )}
        >
          <Users className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 bg-green-500 text-black font-extrabold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#0f1015]">
            {participantsList.length + 1}
          </span>
        </Button>

        {/* Chat Toggle */}
        <Button
          onClick={() => {
            setActiveSidePanel(p => (p === 'chat' ? null : 'chat'));
            setUnreadChatCount(0);
          }}
          className={cn(
            'h-12 w-12 rounded-full flex items-center justify-center border-none relative transition-all',
            activeSidePanel === 'chat'
              ? 'bg-[#2F3EFF]/20 text-[#2F3EFF]'
              : 'bg-gray-800 hover:bg-gray-700 text-white'
          )}
        >
          <MessageSquare className="w-5 h-5" />
          {unreadChatCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#2F3EFF] text-white font-extrabold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#0f1015]">
              {unreadChatCount}
            </span>
          )}
        </Button>

        {/* Audio / Video Device Settings Button */}
        <Button
          onClick={() => {
            refreshDevices();
            setShowSettingsModal(true);
          }}
          className="h-12 w-12 rounded-full bg-gray-800 hover:bg-gray-700 text-white flex items-center justify-center border-none"
        >
          <Settings className="w-5 h-5" />
        </Button>

        {/* Leave Meeting Button */}
        <Button
          onClick={cleanupAndLeave}
          className="h-12 px-6 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold border-none ml-4 shadow-lg shadow-red-600/25 transition-all"
        >
          <PhoneOff className="w-5 h-5 mr-2" />
          Leave
        </Button>
      </footer>

      {/* Device Selection & Settings Modal */}
      <Modal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        title="Audio & Video Settings"
        size="md"
        footer={
          <Button onClick={() => setShowSettingsModal(false)}>Done</Button>
        }
      >
        <div className="space-y-4 text-sm">
          {/* Microphone Selector */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Microphone</label>
            <select
              value={selectedAudioInput}
              onChange={e => handleDeviceChange('audio', e.target.value)}
              className="w-full bg-[#1a1b22] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#2F3EFF]"
            >
              {availableDevices.audioInputs.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  {d.label || `Microphone ${i + 1}`}
                </option>
              ))}
            </select>
          </div>

          {/* Camera Selector */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Camera</label>
            <select
              value={selectedVideoInput}
              onChange={e => handleDeviceChange('video', e.target.value)}
              className="w-full bg-[#1a1b22] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#2F3EFF]"
            >
              {availableDevices.videoInputs.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  {d.label || `Camera ${i + 1}`}
                </option>
              ))}
            </select>
          </div>

          {/* Speaker Selector */}
          {availableDevices.audioOutputs.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Speaker / Output</label>
              <select
                value={selectedAudioOutput}
                onChange={e => setSelectedAudioOutput(e.target.value)}
                className="w-full bg-[#1a1b22] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#2F3EFF]"
              >
                {availableDevices.audioOutputs.map((d, i) => (
                  <option key={d.deviceId || i} value={d.deviceId}>
                    {d.label || `Speaker ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

// Dedicated Sub-component for rendering incoming WebRTC video feeds with sound
function VideoFeed({
  stream,
  isMuted,
  onAutoplayBlocked,
  className,
}: {
  stream?: MediaStream | null;
  isMuted: boolean;
  onAutoplayBlocked?: () => void;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video && stream) {
      video.srcObject = stream;
      video.play().catch(err => {
        if (err.name === 'NotAllowedError') {
          console.warn('[VideoFeed] Autoplay prevented by browser:', err);
          if (onAutoplayBlocked) onAutoplayBlocked();
        }
      });
    }
  }, [stream, onAutoplayBlocked]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={isMuted}
      className={className}
    />
  );
}
