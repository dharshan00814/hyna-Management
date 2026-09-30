import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { 
  Video, VideoOff, Mic, MicOff, PhoneOff, 
  MonitorUp, MessageSquare, Users,
  UserPlus, Loader2, Send, CheckCircle2, XCircle
} from 'lucide-react';
import { Button, Avatar } from '@/components/ui';
import { useAuthStore } from '@/stores';
import { getMeeting } from '@/services/api';
import { toast } from 'sonner';

// Type definitions
interface PeerConnectionObj {
  peerConnection: RTCPeerConnection;
  stream?: MediaStream;
}

interface Participant {
  id: string; // Socket ID
  userId: string;
  name: string;
  stream?: MediaStream;
  isMuted: boolean;
  hasVideo: boolean;
  isScreenSharing: boolean;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: string;
}

// STUN servers for WebRTC
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
};

const SIGNALING_SERVER_URL = import.meta.env.VITE_WEBRTC_URL || 'http://localhost:5000';

export function MeetingRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, effectiveRole } = useAuthStore();
  const rolePrefix = effectiveRole === 'admin' ? '/admin' : effectiveRole === 'manager' ? '/manager' : '/member';
  
  // App States
  const [hasJoined, setHasJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false); // Host control
  
  // Media States
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [micEnabled, setMicEnabled] = useState(false); // Default false for everyone, will enable if host
  const [videoEnabled, setVideoEnabled] = useState(true);
  
  // UI States
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  
  // Meeting Data
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Refs
  const socketRef = useRef<Socket | null>(null);
  const peersRef = useRef<Map<string, PeerConnectionObj>>(new Map());
  const localVideoRef = useRef<HTMLVideoElement>(null);

  // --- Fetch Meeting details to identify host ---
  useEffect(() => {
    async function loadMeetingDetails() {
      if (!id) return;
      // Strip 'HYNA-MTG-' for DB lookup if necessary, or pass the full string if stored as meeting_link
      const meetingId = id.startsWith('HYNA-MTG-') ? id : id; 
      // We will assume the API can fetch by ID or we just rely on effectiveRole for simplicity if API fails
      try {
        const meeting = await getMeeting(meetingId);
        // If we created it, or we are the host, or we are an admin
        if (meeting?.hostId === currentUser?.id || effectiveRole === 'admin') {
          setIsHost(true);
          setCanSpeak(true);
          setMicEnabled(true);
        } else {
          setIsHost(false);
          setCanSpeak(false);
          setMicEnabled(false);
        }
      } catch (err) {
        console.error("Failed to fetch meeting", err);
        // Fallback: admin is host
        if (effectiveRole === 'admin') {
          setIsHost(true);
          setCanSpeak(true);
          setMicEnabled(true);
        }
      }
    }
    loadMeetingDetails();
  }, [id, currentUser, effectiveRole]);

  // --- Pre-Join Media Setup ---
  useEffect(() => {
    async function setupMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Failed to get local media", err);
        setError("Camera/Microphone permission denied. Please allow access to join the meeting.");
        setVideoEnabled(false);
        setMicEnabled(false);
      }
    }
    if (!hasJoined) {
      setupMedia();
    }
    
    return () => {
      // Don't cleanup if joined, we need the stream
    };
  }, [hasJoined]);

  // Update local stream tracks when toggles change
  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => track.enabled = micEnabled);
      localStream.getVideoTracks().forEach(track => track.enabled = videoEnabled);
      
      // Notify others of media state
      if (hasJoined && socketRef.current) {
        socketRef.current.emit('media-state-change', {
          videoEnabled,
          micEnabled,
          screenSharing: !!screenStream
        });
      }
    }
  }, [micEnabled, videoEnabled, hasJoined, localStream, screenStream]);

  // --- Join Meeting Flow ---
  const handleJoinMeeting = () => {
    if (error) return;
    setHasJoined(true);
    initWebRTC();
  };

  const createPeerConnection = (targetSocketId: string, name: string, userId: string) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    
    // Add local stream tracks to PC
    if (localStream) {
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    }
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', {
          target: targetSocketId,
          candidate: event.candidate
        });
      }
    };
    
    // Handle incoming stream
    pc.ontrack = (event) => {
      setParticipants(prev => {
        const existing = prev.find(p => p.id === targetSocketId);
        if (existing) {
          return prev.map(p => p.id === targetSocketId ? { ...p, stream: event.streams[0] } : p);
        } else {
          return [...prev, {
            id: targetSocketId,
            userId,
            name,
            stream: event.streams[0],
            isMuted: true, // Default remote users to muted until state sync
            hasVideo: true,
            isScreenSharing: false
          }];
        }
      });
    };

    peersRef.current.set(targetSocketId, { peerConnection: pc });
    return pc;
  };

  const initWebRTC = () => {
    const socket = io(SIGNALING_SERVER_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-room', {
        roomId: id,
        userId: currentUser?.id || 'unknown',
        name: currentUser?.name || 'Guest'
      });
      // Send initial state immediately
      setTimeout(() => {
        socket.emit('media-state-change', {
          videoEnabled,
          micEnabled,
          screenSharing: !!screenStream
        });
      }, 1000);
    });

    socket.on('room-users', async (users: any[]) => {
      setParticipants(users.map(u => ({
        id: u.socketId,
        userId: u.userId,
        name: u.name,
        isMuted: true,
        hasVideo: true,
        isScreenSharing: false
      })));

      for (const user of users) {
        const pc = createPeerConnection(user.socketId, user.name, user.userId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', { target: user.socketId, sdp: pc.localDescription });
      }
    });

    socket.on('user-joined', (user: any) => {
      toast.info(`${user.name} joined the meeting`);
      setParticipants(prev => [...prev, {
        id: user.socketId,
        userId: user.userId,
        name: user.name,
        isMuted: true,
        hasVideo: true,
        isScreenSharing: false
      }]);
    });

    socket.on('offer', async (payload: any) => {
      const pc = createPeerConnection(payload.caller, payload.name, payload.caller);
      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer', { target: payload.caller, sdp: pc.localDescription });
    });

    socket.on('answer', async (payload: any) => {
      const peerObj = peersRef.current.get(payload.caller);
      if (peerObj) {
        await peerObj.peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      }
    });

    socket.on('ice-candidate', async (payload: any) => {
      const peerObj = peersRef.current.get(payload.caller);
      if (peerObj) {
        try {
          await peerObj.peerConnection.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch (e) {
          console.error("Error adding received ice candidate", e);
        }
      }
    });

    socket.on('user-disconnected', (socketId: string) => {
      const peerObj = peersRef.current.get(socketId);
      if (peerObj) {
        peerObj.peerConnection.close();
        peersRef.current.delete(socketId);
      }
      setParticipants(prev => prev.filter(p => p.id !== socketId));
    });

    socket.on('chat-message', (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
      if (!showChat) {
        toast.message(`New message from ${msg.senderName}`, { description: msg.message });
      }
    });

    socket.on('user-media-state', (payload: any) => {
      setParticipants(prev => prev.map(p => {
        if (p.id === payload.socketId) {
          return { ...p, isMuted: !payload.micEnabled, hasVideo: payload.videoEnabled, isScreenSharing: payload.screenSharing };
        }
        return p;
      }));
    });

    // Handle Host actions (Allow/Revoke speak)
    socket.on('host-action', (action: string) => {
      if (action === 'allow-speak') {
        setCanSpeak(true);
        toast.success("Host has enabled your microphone! You can now speak.");
      } else if (action === 'revoke-speak') {
        setCanSpeak(false);
        setMicEnabled(false);
        toast.error("Host has muted your microphone.");
      }
    });
  };

  const handleLeave = () => {
    if (socketRef.current) socketRef.current.disconnect();
    peersRef.current.forEach(peer => peer.peerConnection.close());
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    if (screenStream) screenStream.getTracks().forEach(t => t.stop());
    navigate(`${rolePrefix}/meetings`);
  };

  const toggleScreenShare = async () => {
    if (screenStream) {
      screenStream.getTracks().forEach(t => t.stop());
      setScreenStream(null);
      if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        peersRef.current.forEach(peer => {
          const sender = peer.peerConnection.getSenders().find(s => s.track?.kind === 'video');
          if (sender && videoTrack) sender.replaceTrack(videoTrack);
        });
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setScreenStream(stream);
        const screenTrack = stream.getVideoTracks()[0];
        screenTrack.onended = () => {
          setScreenStream(null);
          if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            peersRef.current.forEach(peer => {
              const sender = peer.peerConnection.getSenders().find(s => s.track?.kind === 'video');
              if (sender && videoTrack) sender.replaceTrack(videoTrack);
            });
          }
        };
        peersRef.current.forEach(peer => {
          const sender = peer.peerConnection.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        });
      } catch (err) {
        console.error("Screen share failed", err);
      }
    }
  };

  const sendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || !socketRef.current) return;
    socketRef.current.emit('chat-message', { message: chatMessage });
    setChatMessage('');
  };

  const handleHostAction = (targetSocketId: string, action: 'allow-speak' | 'revoke-speak') => {
    if (socketRef.current) {
      socketRef.current.emit('host-action', { targetSocketId, action });
      toast.success(action === 'allow-speak' ? 'Allowed participant to speak' : 'Muted participant');
    }
  };

  // Participant Video Component Helper
  const RemoteVideo = ({ participant }: { participant: Participant }) => {
    const ref = useRef<HTMLVideoElement>(null);
    useEffect(() => {
      if (ref.current && participant.stream) {
        ref.current.srcObject = participant.stream;
      }
    }, [participant.stream]);

    return (
      <div className={`relative bg-gray-900 rounded-xl overflow-hidden border ${participant.isScreenSharing ? 'border-[#2F3EFF] shadow-[0_0_15px_rgba(47,62,255,0.2)]' : 'border-gray-800'}`}>
        {/* ALWAYS mount video so audio plays, hide visually if video off */}
        <video 
          ref={ref} 
          autoPlay 
          playsInline 
          className={`w-full h-full object-cover ${(!participant.hasVideo && !participant.isScreenSharing) ? 'hidden' : ''}`} 
        />
        
        {(!participant.hasVideo && !participant.isScreenSharing) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
            <Avatar name={participant.name} size="xl" />
          </div>
        )}
        
        <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1.5 rounded-lg flex items-center gap-2 backdrop-blur-sm">
          <span className="text-sm font-medium">{participant.name}</span>
          {participant.isMuted && <MicOff className="w-3.5 h-3.5 text-red-400" />}
        </div>
      </div>
    );
  };

  // --- Pre-Join View ---
  if (!hasJoined) {
    return (
      <div className="min-h-screen w-full bg-[#0a0a0c] text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="relative aspect-video bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 shadow-2xl">
            {localStream ? (
              <video ref={localVideoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${!videoEnabled ? 'hidden' : ''}`} />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-gray-500 animate-spin" />
              </div>
            )}
            {!videoEnabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <Avatar name={currentUser?.name || 'You'} size="xl" />
              </div>
            )}
            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4">
              <Button 
                onClick={() => setMicEnabled(!micEnabled)} 
                disabled={!canSpeak}
                className={`h-12 w-12 rounded-full flex items-center justify-center ${micEnabled ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'} border border-gray-700 backdrop-blur-md disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </Button>
              <Button 
                onClick={() => setVideoEnabled(!videoEnabled)} 
                className={`h-12 w-12 rounded-full flex items-center justify-center ${videoEnabled ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'} border border-gray-700 backdrop-blur-md`}
              >
                {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </Button>
            </div>
            {!canSpeak && (
              <div className="absolute top-4 left-0 right-0 flex justify-center">
                <span className="bg-black/80 px-3 py-1 rounded-full text-xs font-medium text-yellow-400 border border-yellow-500/30">
                  Microphone muted by Host
                </span>
              </div>
            )}
          </div>
          
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Ready to join?</h1>
              <p className="text-gray-400">Meeting Room: {id}</p>
              {isHost && <p className="text-[#2F3EFF] text-sm mt-1 font-medium">You are the Host</p>}
            </div>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg text-sm">
                {error}
              </div>
            )}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="font-medium mb-4">Joining as</h3>
              <div className="flex items-center gap-4 mb-6">
                <Avatar name={currentUser?.name || 'You'} size="md" />
                <div>
                  <p className="font-medium">{currentUser?.name || 'Guest'}</p>
                  <p className="text-sm text-gray-400">{currentUser?.email || 'No email'}</p>
                </div>
              </div>
              <Button 
                onClick={handleJoinMeeting} 
                className="w-full h-12 bg-[#2F3EFF] hover:bg-[#2F3EFF]/90 text-white text-lg font-medium"
                disabled={!!error && !localStream}
              >
                Join Meeting
              </Button>
              <Button 
                onClick={() => navigate(-1)} 
                variant="outline" 
                className="w-full h-12 mt-3 border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Main Meeting View ---
  return (
    <div className="h-screen w-full bg-[#0a0a0c] flex flex-col overflow-hidden text-white font-sans">
      <header className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-[#0f1015]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="font-semibold text-lg">Hyna Meeting</span>
          </div>
          <span className="text-gray-400 bg-gray-800 px-3 py-1 rounded-md text-sm font-mono">{id}</span>
        </div>
        <div className="flex items-center gap-4">
          {isHost && <span className="bg-[#2F3EFF]/20 text-[#2F3EFF] text-xs font-semibold px-2 py-1 rounded">HOST</span>}
          <div className="flex items-center text-green-400 gap-1.5 text-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Connected
          </div>
          <div className="flex items-center gap-2 text-gray-300">
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">{participants.length + 1}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-[minmax(0,1fr)] overflow-y-auto">
          {/* Local User */}
          <div className="relative bg-gray-900 rounded-xl overflow-hidden border border-gray-800 group h-full max-h-[70vh]">
            {localStream && (
              <video 
                ref={localVideoRef}
                autoPlay 
                playsInline 
                muted 
                className={`w-full h-full object-cover ${!videoEnabled && !!!screenStream ? 'hidden' : ''}`}
              />
            )}
            {!videoEnabled && !!!screenStream && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
                <Avatar name={currentUser?.name || 'You'} size="xl" />
              </div>
            )}
            <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1.5 rounded-lg flex items-center gap-2 backdrop-blur-sm">
              <span className="text-sm font-medium">You {!!screenStream ? '(Sharing Screen)' : ''}</span>
              {!micEnabled && <MicOff className="w-3.5 h-3.5 text-red-400" />}
            </div>
          </div>
          
          {/* Remote Users */}
          {participants.map(p => (
            <div key={p.id} className="h-full max-h-[70vh]">
              <RemoteVideo participant={p} />
            </div>
          ))}
        </div>

        {/* Side Panel */}
        {(showChat || showParticipants) && (
          <div className="w-80 border-l border-gray-800 bg-[#0f1015] flex flex-col transition-all duration-300">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center">
              <h3 className="font-semibold">{showChat ? 'Meeting Chat' : 'Participants'}</h3>
              <Button variant="ghost" size="sm" className="h-8 text-gray-400 hover:text-white" onClick={() => { setShowChat(false); setShowParticipants(false); }}>Close</Button>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto flex flex-col">
              {showParticipants ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-gray-800/50">
                    <div className="flex items-center gap-3">
                      <Avatar name={currentUser?.name || 'You'} size="sm" />
                      <span className="text-sm font-medium">You (Host)</span>
                    </div>
                    <div className="flex gap-2 text-gray-400">
                      {micEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4 text-red-400" />}
                      {videoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4 text-red-400" />}
                    </div>
                  </div>
                  {participants.map(p => (
                    <div key={p.id} className="flex flex-col gap-2 p-2 bg-gray-900/50 rounded-lg border border-gray-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar name={p.name} size="sm" />
                          <span className="text-sm truncate w-24">{p.name}</span>
                        </div>
                        <div className="flex gap-2 text-gray-400">
                          {p.isMuted ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4" />}
                          {!p.hasVideo ? <VideoOff className="w-4 h-4 text-red-400" /> : <Video className="w-4 h-4" />}
                        </div>
                      </div>
                      {/* Host Actions */}
                      {isHost && (
                        <div className="flex items-center gap-2 mt-1">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-xs flex-1 border-green-500/30 text-green-400 hover:bg-green-500/10 hover:text-green-300"
                            onClick={() => handleHostAction(p.id, 'allow-speak')}
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Allow Speak
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-xs flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                            onClick={() => handleHostAction(p.id, 'revoke-speak')}
                          >
                            <XCircle className="w-3 h-3 mr-1" /> Mute
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                  <Button className="w-full mt-4 bg-gray-800 hover:bg-gray-700 text-white border-none" onClick={() => {
                    navigator.clipboard.writeText(id || '');
                    toast.success('Room ID copied to clipboard');
                  }}>
                    <UserPlus className="w-4 h-4 mr-2" /> Invite via Room ID
                  </Button>
                </div>
              ) : (
                <div className="h-full flex flex-col gap-4">
                  <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-2">
                    {messages.length === 0 && (
                      <div className="text-center text-gray-500 text-sm mt-10">No messages yet. Say hello!</div>
                    )}
                    {messages.map(msg => (
                      <div key={msg.id} className={`flex flex-col ${msg.senderId === currentUser?.id ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] rounded-lg p-3 text-sm ${msg.senderId === currentUser?.id ? 'bg-[#2F3EFF] text-white' : 'bg-gray-800 text-gray-100'}`}>
                          {msg.senderId !== currentUser?.id && <p className="text-xs text-gray-400 mb-1">{msg.senderName}</p>}
                          <p className="break-words">{msg.message}</p>
                        </div>
                        <span className="text-[10px] text-gray-500 mt-1">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={sendChatMessage} className="mt-auto relative">
                    <input 
                      type="text" 
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      placeholder="Type a message..." 
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-4 pr-10 py-3 text-sm focus:outline-none focus:border-[#2F3EFF] transition-colors" 
                    />
                    <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#2F3EFF] transition-colors">
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="h-20 bg-[#0f1015] border-t border-gray-800 flex items-center justify-center gap-4 px-6 relative">
        <Button 
          onClick={() => setMicEnabled(!micEnabled)} 
          disabled={!canSpeak}
          className={`h-12 w-12 rounded-full flex items-center justify-center ${micEnabled ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'} border-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </Button>
        <Button 
          onClick={() => setVideoEnabled(!videoEnabled)} 
          className={`h-12 w-12 rounded-full flex items-center justify-center ${videoEnabled ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'} border-none transition-colors`}
        >
          {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </Button>
        <Button 
          onClick={toggleScreenShare} 
          className={`h-12 w-12 rounded-full flex items-center justify-center ${!!screenStream ? 'bg-[#2F3EFF] hover:bg-[#2F3EFF]/80' : 'bg-gray-800 hover:bg-gray-700'} text-white border-none transition-colors`}
        >
          <MonitorUp className="w-5 h-5" />
        </Button>
        
        <div className="w-px h-8 bg-gray-800 mx-2"></div>
        
        <Button 
          onClick={() => { setShowParticipants(!showParticipants); setShowChat(false); }} 
          className={`h-12 w-12 rounded-full flex items-center justify-center ${showParticipants ? 'bg-[#2F3EFF]/20 text-[#2F3EFF]' : 'bg-gray-800 hover:bg-gray-700 text-white'} border-none transition-colors`}
        >
          <Users className="w-5 h-5" />
        </Button>
        <Button 
          onClick={() => { setShowChat(!showChat); setShowParticipants(false); }} 
          className={`h-12 w-12 rounded-full flex items-center justify-center ${showChat ? 'bg-[#2F3EFF]/20 text-[#2F3EFF]' : 'bg-gray-800 hover:bg-gray-700 text-white'} border-none transition-colors`}
        >
          <MessageSquare className="w-5 h-5" />
        </Button>
        
        <Button 
          onClick={handleLeave} 
          className="h-12 px-6 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold border-none ml-6 transition-colors shadow-lg shadow-red-900/20"
        >
          <PhoneOff className="w-5 h-5 mr-2" />
          Leave
        </Button>
      </footer>
    </div>
  );
}
