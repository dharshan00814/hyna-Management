import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Video, VideoOff, Mic, MicOff, PhoneOff, 
  MonitorUp, MessageSquare, Users, Settings, 
  Copy, Check, Volume2, VolumeX, Radio, Sparkles, Send, ShieldCheck
} from 'lucide-react';
import { Button, Avatar } from '@/components/ui';
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

interface PresenceUser {
  userId: string;
  name: string;
  avatar: string;
  designation?: string;
  role?: string;
  micEnabled: boolean;
  videoEnabled: boolean;
  isScreenSharing: boolean;
  joinedAt: string;
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  time: string;
}

// Synthesize pleasant Discord-like chimes via Web Audio API
function playChime(type: 'join' | 'leave' | 'mute' | 'unmute') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    if (type === 'join') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'leave') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.exponentialRampToValueAtTime(330, now + 0.18);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'mute' || type === 'unmute') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(type === 'mute' ? 320 : 560, now);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    }
  } catch {
    // Ignore audio restrictions
  }
}

export function MeetingRoom() {
  const { id: roomId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, effectiveRole } = useAuthStore();
  const rolePrefix = effectiveRole === 'admin' ? '/admin' : effectiveRole === 'manager' ? '/manager' : '/member';

  // Guest lobby state if accessing via direct link without login
  const [guestName, setGuestName] = useState(() => {
    return localStorage.getItem('hyna_guest_name') || '';
  });
  const [hasEnteredLobby, setHasEnteredLobby] = useState(Boolean(currentUser));

  const currentUserId = useMemo(() => {
    if (currentUser?.id) return currentUser.id;
    let stored = sessionStorage.getItem('hyna_guest_id');
    if (!stored) {
      stored = 'guest-' + Math.random().toString(36).slice(2, 9);
      sessionStorage.setItem('hyna_guest_id', stored);
    }
    return stored;
  }, [currentUser]);

  const currentUserName = currentUser?.name || guestName.trim() || 'You';
  const currentUserAvatar = currentUser?.avatar || '';

  // Meeting metadata from database
  const [meetingInfo, setMeetingInfo] = useState<Meeting | null>(null);
  const [invitedUsers, setInvitedUsers] = useState<User[]>([]);

  // Local media controls
  const [micEnabled, setMicEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);

  // Active connected participants (tracked strictly via Realtime Presence)
  const [connectedUsers, setConnectedUsers] = useState<PresenceUser[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());

  // UI Panels
  const [activeSidePanel, setActiveSidePanel] = useState<'participants' | 'chat' | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // References
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const lobbyVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({});
  const iceCandidatesQueueRef = useRef<Record<string, RTCIceCandidateInit[]>>({});
  const channelRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioAnalysersRef = useRef<Record<string, AnalyserNode>>({});
  const animationFrameRef = useRef<number | null>(null);

  // 1. Call timer
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

  // 2. Fetch Meeting Metadata & Invited Participants from Supabase
  useEffect(() => {
    let isMounted = true;
    async function fetchMeetingDetails() {
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
        console.error('Failed to load meeting details:', err);
      }
    }
    fetchMeetingDetails();
    return () => { isMounted = false; };
  }, [roomId]);

  // 3. Audio Activity Detection (Speaking Indicator)
  const setupAudioAnalyser = useCallback((stream: MediaStream, userId: string) => {
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
        ctx.resume();
      }

      const source = ctx.createMediaStreamSource(new MediaStream([audioTrack]));
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      audioAnalysersRef.current[userId] = analyser;
    } catch (e) {
      console.warn('Audio analyser setup failed for', userId, e);
    }
  }, []);

  // Monitor speaking levels periodically
  useEffect(() => {
    const checkVoiceActivity = () => {
      const activeSpeakers = new Set<string>();
      const analysers = audioAnalysersRef.current;

      for (const [uId, analyser] of Object.entries(analysers)) {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        if (avg > 18) {
          activeSpeakers.add(uId);
        }
      }

      setSpeakingUsers(activeSpeakers);
      animationFrameRef.current = requestAnimationFrame(checkVoiceActivity);
    };

    animationFrameRef.current = requestAnimationFrame(checkVoiceActivity);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // 4. Initialize Local Media (Microphone & Camera)
  useEffect(() => {
    let localStream: MediaStream | null = null;

    async function initMedia() {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30 },
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        localStreamRef.current = localStream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }
        if (lobbyVideoRef.current) {
          lobbyVideoRef.current.srcObject = localStream;
        }

        setupAudioAnalyser(localStream, currentUserId);
      } catch (err: any) {
        console.warn('Could not acquire audio/video stream:', err);
        try {
          localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          localStreamRef.current = localStream;
          setVideoEnabled(false);
          setupAudioAnalyser(localStream, currentUserId);
          toast.warning('Camera unavailable. Joined with microphone only.');
        } catch (audioErr) {
          console.error('No media devices available:', audioErr);
          toast.error('Unable to access camera or microphone.');
        }
      }
    }

    initMedia();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [currentUserId, setupAudioAnalyser]);

  // 5. WebRTC Peer Connection Helper
  const createPeerConnection = useCallback((remoteUserId: string) => {
    if (peerConnectionsRef.current[remoteUserId]) {
      return peerConnectionsRef.current[remoteUserId];
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnectionsRef.current[remoteUserId] = pc;
    iceCandidatesQueueRef.current[remoteUserId] = [];

    const currentStream = screenStreamRef.current || localStreamRef.current;
    if (currentStream) {
      currentStream.getTracks().forEach(track => {
        pc.addTrack(track, currentStream);
      });
    }

    pc.ontrack = (event) => {
      const stream = event.streams[0] || new MediaStream([event.track]);
      setRemoteStreams(prev => ({
        ...prev,
        [remoteUserId]: stream,
      }));
      setupAudioAnalyser(stream, remoteUserId);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'webrtc-signal',
          payload: {
            type: 'ice-candidate',
            candidate: event.candidate,
            from: currentUserId,
            to: remoteUserId,
          },
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        setRemoteStreams(prev => {
          const next = { ...prev };
          delete next[remoteUserId];
          return next;
        });
      }
    };

    return pc;
  }, [currentUserId, setupAudioAnalyser]);

  // 6. Connect to Supabase Realtime Channel
  useEffect(() => {
    if (!roomId || !hasEnteredLobby) return;

    const channelName = `meeting_room_${roomId}`;
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: currentUserId,
        },
        broadcast: {
          ack: false,
          self: false,
        },
      },
    });

    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceUser>();
        const activeList: PresenceUser[] = [];

        Object.values(state).forEach(presences => {
          if (Array.isArray(presences) && presences.length > 0) {
            activeList.push(presences[0]);
          }
        });

        const uniqueActive = Array.from(
          new Map(activeList.map(u => [u.userId, u])).values()
        );

        setConnectedUsers(prev => {
          const prevIds = new Set(prev.map(p => p.userId));
          uniqueActive.forEach(u => {
            if (u.userId !== currentUserId && !prevIds.has(u.userId)) {
              playChime('join');
              toast.info(`${u.name} joined the meeting`);
            }
          });
          return uniqueActive;
        });

        uniqueActive.forEach(remoteUser => {
          if (remoteUser.userId !== currentUserId) {
            if (currentUserId < remoteUser.userId) {
              const pc = createPeerConnection(remoteUser.userId);
              pc.createOffer()
                .then(offer => pc.setLocalDescription(offer))
                .then(() => {
                  channel.send({
                    type: 'broadcast',
                    event: 'webrtc-signal',
                    payload: {
                      type: 'offer',
                      sdp: pc.localDescription,
                      from: currentUserId,
                      to: remoteUser.userId,
                    },
                  });
                })
                .catch(err => console.error('Error creating offer:', err));
            }
          }
        });
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (key && key !== currentUserId) {
          playChime('leave');
          if (peerConnectionsRef.current[key]) {
            peerConnectionsRef.current[key].close();
            delete peerConnectionsRef.current[key];
          }
          delete iceCandidatesQueueRef.current[key];
          delete audioAnalysersRef.current[key];

          setRemoteStreams(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
          setConnectedUsers(prev => prev.filter(u => u.userId !== key));
        }
      })
      .on('broadcast', { event: 'webrtc-signal' }, async ({ payload }) => {
        if (payload.to !== currentUserId) return;
        const senderId = payload.from;

        if (payload.type === 'offer') {
          const pc = createPeerConnection(senderId);
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));

            const queue = iceCandidatesQueueRef.current[senderId] || [];
            while (queue.length > 0) {
              const candidate = queue.shift();
              if (candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            channel.send({
              type: 'broadcast',
              event: 'webrtc-signal',
              payload: {
                type: 'answer',
                sdp: answer,
                from: currentUserId,
                to: senderId,
              },
            });
          } catch (err) {
            console.error('Error handling WebRTC offer:', err);
          }
        } else if (payload.type === 'answer') {
          const pc = peerConnectionsRef.current[senderId];
          if (pc) {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
              const queue = iceCandidatesQueueRef.current[senderId] || [];
              while (queue.length > 0) {
                const candidate = queue.shift();
                if (candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
              }
            } catch (err) {
              console.error('Error setting remote description from answer:', err);
            }
          }
        } else if (payload.type === 'ice-candidate') {
          const pc = peerConnectionsRef.current[senderId];
          if (pc && pc.remoteDescription && pc.remoteDescription.type) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch (err) {
              console.error('Error adding ICE candidate:', err);
            }
          } else {
            if (!iceCandidatesQueueRef.current[senderId]) {
              iceCandidatesQueueRef.current[senderId] = [];
            }
            iceCandidatesQueueRef.current[senderId].push(payload.candidate);
          }
        }
      })
      .on('broadcast', { event: 'media-toggle' }, ({ payload }) => {
        setConnectedUsers(prev =>
          prev.map(u => (u.userId === payload.userId ? { ...u, ...payload } : u))
        );
      })
      .on('broadcast', { event: 'chat-message' }, ({ payload }) => {
        setChatMessages(prev => [...prev, payload]);
        if (activeSidePanel !== 'chat') {
          setUnreadChatCount(c => c + 1);
        }
      });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          userId: currentUserId,
          name: currentUserName,
          avatar: currentUserAvatar,
          designation: currentUser?.designation || 'Member',
          role: effectiveRole,
          micEnabled,
          videoEnabled,
          isScreenSharing: false,
          joinedAt: new Date().toISOString(),
        });
      }
    });

    return () => {
      Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
      peerConnectionsRef.current = {};
      iceCandidatesQueueRef.current = {};
      audioAnalysersRef.current = {};
      channel.unsubscribe();
    };
  }, [roomId, hasEnteredLobby, currentUserId, currentUserName, currentUserAvatar, currentUser?.designation, effectiveRole, createPeerConnection]);

  // 7. Toggle Mic
  const toggleMic = () => {
    const nextState = !micEnabled;
    setMicEnabled(nextState);
    playChime(nextState ? 'unmute' : 'mute');

    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = nextState;
      });
    }

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'media-toggle',
        payload: { userId: currentUserId, micEnabled: nextState },
      });
      channelRef.current.track({
        userId: currentUserId,
        name: currentUserName,
        avatar: currentUserAvatar,
        designation: currentUser?.designation || 'Member',
        role: effectiveRole,
        micEnabled: nextState,
        videoEnabled,
        isScreenSharing: screenSharing,
        joinedAt: new Date().toISOString(),
      });
    }
  };

  // 8. Toggle Video
  const toggleVideo = () => {
    const nextState = !videoEnabled;
    setVideoEnabled(nextState);

    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = nextState;
      });
    }

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'media-toggle',
        payload: { userId: currentUserId, videoEnabled: nextState },
      });
      channelRef.current.track({
        userId: currentUserId,
        name: currentUserName,
        avatar: currentUserAvatar,
        designation: currentUser?.designation || 'Member',
        role: effectiveRole,
        micEnabled,
        videoEnabled: nextState,
        isScreenSharing: screenSharing,
        joinedAt: new Date().toISOString(),
      });
    }
  };

  // 9. Screen Sharing
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

        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'media-toggle',
            payload: { userId: currentUserId, isScreenSharing: true },
          });
        }
        toast.success('Sharing your screen');
      } catch (err) {
        console.warn('Screen sharing cancelled:', err);
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

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'media-toggle',
        payload: { userId: currentUserId, isScreenSharing: false },
      });
    }
    toast.info('Stopped screen sharing');
  };

  // 10. Deafen
  const toggleDeafen = () => {
    setIsDeafened(prev => !prev);
  };

  // 11. Send Chat Message
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: currentUserId,
      userName: currentUserName,
      userAvatar: currentUserAvatar,
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages(prev => [...prev, newMsg]);
    setChatInput('');

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'chat-message',
        payload: newMsg,
      });
    }
  };

  // 12. Copy Invite Link
  const handleCopyLink = () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    toast.success('Meeting link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // 13. Leave Meeting
  const handleLeave = () => {
    playChime('leave');
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
    }
    Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
    peerConnectionsRef.current = {};

    navigate(`${rolePrefix}/meetings`);
  };

  // Offline invited users calculation
  const connectedUserIds = useMemo(() => {
    return new Set(connectedUsers.map(u => u.userId));
  }, [connectedUsers]);

  const offlineInvitedUsers = useMemo(() => {
    return invitedUsers.filter(u => !connectedUserIds.has(u.id) && u.id !== currentUserId);
  }, [invitedUsers, connectedUserIds, currentUserId]);

  const screenSharer = useMemo(() => {
    if (screenSharing) {
      return { userId: currentUserId, name: 'You', stream: screenStreamRef.current };
    }
    const remoteSharer = connectedUsers.find(u => u.isScreenSharing && u.userId !== currentUserId);
    if (remoteSharer && remoteStreams[remoteSharer.userId]) {
      return {
        userId: remoteSharer.userId,
        name: remoteSharer.name,
        stream: remoteStreams[remoteSharer.userId],
      };
    }
    return null;
  }, [screenSharing, connectedUsers, currentUserId, remoteStreams]);

  // PRE-JOIN LOBBY FOR GUEST USERS JOINING VIA LINK
  if (!hasEnteredLobby && !currentUser) {
    return (
      <div className="h-screen w-full bg-[#111214] flex flex-col items-center justify-center p-4 text-white font-sans">
        <div className="w-full max-w-md bg-[#1e1f22] border border-[#2b2d31] rounded-3xl p-6 shadow-2xl flex flex-col items-center animate-in fade-in zoom-in-95">
          <div className="w-14 h-14 rounded-2xl bg-[#5865F2] flex items-center justify-center text-white mb-4 shadow-lg shadow-[#5865F2]/25">
            <Radio className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-gray-100">Join Meeting</h2>
          <p className="text-xs text-gray-400 mt-1 text-center">
            {meetingInfo?.title || `Room: #${roomId?.slice(0, 10)}`}
          </p>

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
              className="w-full bg-[#2b2d31] border border-[#383a40] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#5865F2]"
              autoFocus
            />
            <Button
              className="w-full h-11 bg-[#5865F2] hover:bg-[#4752c4] text-white rounded-xl font-semibold shadow-lg shadow-[#5865F2]/25 mt-2"
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

  return (
    <div className="h-screen w-full bg-[#111214] flex flex-col overflow-hidden text-white font-sans select-none">
      {/* Discord Header Bar */}
      <header className="h-14 border-b border-[#202225] flex items-center justify-between px-5 bg-[#1e1f22] z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#5865F2] flex items-center justify-center text-white shadow-md shadow-[#5865F2]/20">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm tracking-wide text-gray-100">
                  {meetingInfo?.title || `Voice Room: #${roomId?.slice(0, 8)}`}
                </span>
                <span className="bg-[#2b2d31] text-[#949ba4] text-[10px] font-medium px-2 py-0.5 rounded-full border border-[#383a40]">
                  {meetingInfo?.type || 'team'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#23a55a]">
                <ShieldCheck className="w-3 h-3" />
                <span>WebRTC Encrypted Peer-to-Peer</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Call Elapsed Timer */}
          <div className="bg-[#2b2d31] px-3 py-1 rounded-lg text-xs font-mono text-gray-300 border border-[#383a40]">
            {formattedCallTime}
          </div>

          {/* Quick Copy Link Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopyLink}
            className="h-8 border-[#383a40] bg-[#2b2d31] hover:bg-[#383a40] text-gray-200 text-xs gap-1.5 rounded-lg"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedLink ? 'Copied' : 'Invite Link'}
          </Button>

          {/* Connected Participants Counter */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#23a55a]/15 text-[#23a55a] rounded-lg text-xs font-medium border border-[#23a55a]/30">
            <span className="w-2 h-2 rounded-full bg-[#23a55a] animate-ping" />
            <span>{connectedUsers.length} In Call</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Stage Video Grid */}
        <div className="flex-1 p-4 overflow-y-auto flex flex-col justify-center items-center">
          {screenSharer ? (
            /* Screen Sharing Spotlight View */
            <div className="w-full h-full flex flex-col gap-3">
              <div className="flex-1 bg-[#1e1f22] rounded-2xl overflow-hidden border border-[#313338] relative flex items-center justify-center shadow-xl">
                <VideoFeed
                  stream={screenSharer.stream}
                  isMuted={screenSharer.userId === currentUserId || isDeafened}
                  className="w-full h-full object-contain bg-black"
                />
                <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 border border-white/10">
                  <MonitorUp className="w-3.5 h-3.5 text-[#5865F2]" />
                  <span>{screenSharer.name} is sharing screen</span>
                </div>
              </div>

              {/* Strip of participants below screen share */}
              <div className="h-28 flex gap-3 overflow-x-auto pb-1 justify-center">
                <div className="w-44 h-full relative rounded-xl overflow-hidden bg-[#2b2d31] border border-[#383a40]">
                  {videoEnabled ? (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Avatar name={currentUserName} size="sm" />
                    </div>
                  )}
                  <div className="absolute bottom-1.5 left-1.5 bg-black/60 px-2 py-0.5 rounded text-[10px]">
                    You {!micEnabled && '🔇'}
                  </div>
                </div>

                {connectedUsers
                  .filter(u => u.userId !== currentUserId)
                  .map(user => (
                    <div key={user.userId} className="w-44 h-full relative rounded-xl overflow-hidden bg-[#2b2d31] border border-[#383a40]">
                      {remoteStreams[user.userId] && user.videoEnabled ? (
                        <VideoFeed
                          stream={remoteStreams[user.userId]}
                          isMuted={isDeafened}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Avatar name={user.name} size="sm" />
                        </div>
                      )}
                      <div className="absolute bottom-1.5 left-1.5 bg-black/60 px-2 py-0.5 rounded text-[10px] truncate max-w-[120px]">
                        {user.name} {!user.micEnabled && '🔇'}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ) : connectedUsers.length <= 1 ? (
            /* Solo In Room (Waiting for Others) - Discord Clean Empty State */
            <div className="w-full max-w-2xl flex flex-col items-center justify-center gap-6">
              {/* Local User Preview Tile */}
              <div
                className={cn(
                  'w-full aspect-video max-h-[380px] bg-[#1e1f22] rounded-2xl overflow-hidden border relative shadow-2xl transition-all duration-200',
                  speakingUsers.has(currentUserId)
                    ? 'border-[#23a55a] ring-4 ring-[#23a55a]/40 shadow-[0_0_24px_rgba(35,165,90,0.4)]'
                    : 'border-[#313338]'
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
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#2b2d31] to-[#1e1f22]">
                    <div
                      className={cn(
                        'rounded-full p-2 transition-all duration-200',
                        speakingUsers.has(currentUserId) ? 'ring-4 ring-[#23a55a]' : ''
                      )}
                    >
                      <Avatar name={currentUserName} size="xl" className="w-24 h-24 text-2xl" />
                    </div>
                    <p className="mt-3 text-sm text-gray-400">Camera is off</p>
                  </div>
                )}

                {/* Local Info Tag */}
                <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-2 border border-white/10 text-xs">
                  <span className="font-semibold text-white">You</span>
                  {!micEnabled && <MicOff className="w-3.5 h-3.5 text-red-400" />}
                  {speakingUsers.has(currentUserId) && (
                    <span className="w-2 h-2 rounded-full bg-[#23a55a] animate-pulse" />
                  )}
                </div>
              </div>

              {/* Discord Waiting Invitation Banner */}
              <div className="w-full bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-5 text-center flex flex-col items-center shadow-lg">
                <div className="w-12 h-12 rounded-full bg-[#5865F2]/15 text-[#5865F2] flex items-center justify-center mb-3">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
                <h3 className="text-base font-semibold text-gray-100">You are the only one in this meeting</h3>
                <p className="text-xs text-gray-400 mt-1 max-w-md">
                  No invited participants have joined yet. Once someone connects, they will automatically pop into this room with voice and video!
                </p>
                <div className="flex items-center gap-3 mt-4">
                  <Button
                    onClick={handleCopyLink}
                    className="bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs h-9 px-4 rounded-xl gap-2 font-medium shadow-md shadow-[#5865F2]/25"
                  >
                    {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copiedLink ? 'Link Copied!' : 'Copy Meeting Link'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setActiveSidePanel('participants')}
                    className="border-[#383a40] bg-[#2b2d31] hover:bg-[#383a40] text-gray-200 text-xs h-9 px-4 rounded-xl gap-2"
                  >
                    <Users className="w-4 h-4" />
                    View Invited ({offlineInvitedUsers.length})
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* Multi-User Dynamic Discord Grid */
            <div
              className={cn(
                'w-full h-full grid gap-4 place-content-center',
                connectedUsers.length === 2
                  ? 'grid-cols-1 md:grid-cols-2 max-w-5xl'
                  : connectedUsers.length <= 4
                  ? 'grid-cols-2 max-w-6xl'
                  : 'grid-cols-2 md:grid-cols-3 max-w-7xl'
              )}
            >
              {/* Local User Tile */}
              <div
                className={cn(
                  'relative bg-[#1e1f22] rounded-2xl overflow-hidden border aspect-video flex items-center justify-center shadow-xl transition-all duration-200 group',
                  speakingUsers.has(currentUserId)
                    ? 'border-[#23a55a] ring-4 ring-[#23a55a]/40 shadow-[0_0_20px_rgba(35,165,90,0.4)]'
                    : 'border-[#313338]'
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
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#2b2d31] to-[#1e1f22]">
                    <div
                      className={cn(
                        'rounded-full p-2 transition-all duration-200',
                        speakingUsers.has(currentUserId) ? 'ring-4 ring-[#23a55a]' : ''
                      )}
                    >
                      <Avatar name={currentUserName} size="xl" className="w-20 h-20 text-xl" />
                    </div>
                    <p className="mt-3 text-xs text-gray-400">Camera off</p>
                  </div>
                )}
                <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-2 border border-white/10 text-xs">
                  <span className="font-semibold text-white">You</span>
                  {!micEnabled && <MicOff className="w-3.5 h-3.5 text-red-400" />}
                </div>
              </div>

              {/* Remote Participants Tiles (ONLY people who joined!) */}
              {connectedUsers
                .filter(u => u.userId !== currentUserId)
                .map(peer => {
                  const stream = remoteStreams[peer.userId];
                  const isSpeaking = speakingUsers.has(peer.userId);

                  return (
                    <div
                      key={peer.userId}
                      className={cn(
                        'relative bg-[#1e1f22] rounded-2xl overflow-hidden border aspect-video flex items-center justify-center shadow-xl transition-all duration-200 animate-in fade-in zoom-in-95',
                        isSpeaking
                          ? 'border-[#23a55a] ring-4 ring-[#23a55a]/40 shadow-[0_0_20px_rgba(35,165,90,0.4)]'
                          : 'border-[#313338]'
                      )}
                    >
                      {stream && peer.videoEnabled ? (
                        <VideoFeed
                          stream={stream}
                          isMuted={isDeafened}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#2b2d31] to-[#1e1f22]">
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
                          <div
                            className={cn(
                              'rounded-full p-2 transition-all duration-200',
                              isSpeaking ? 'ring-4 ring-[#23a55a]' : ''
                            )}
                          >
                            <Avatar name={peer.name} size="xl" className="w-20 h-20 text-xl" />
                          </div>
                          <p className="mt-3 text-xs text-gray-400">
                            {!peer.videoEnabled ? 'Camera off' : 'Connecting stream...'}
                          </p>
                        </div>
                      )}

                      {/* Participant Badge */}
                      <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-2 border border-white/10 text-xs">
                        <span className="font-semibold text-white">{peer.name}</span>
                        {peer.designation && (
                          <span className="text-[10px] text-gray-400 border-l border-white/20 pl-2">
                            {peer.designation}
                          </span>
                        )}
                        {!peer.micEnabled && <MicOff className="w-3.5 h-3.5 text-red-400" />}
                        {isSpeaking && <span className="w-2 h-2 rounded-full bg-[#23a55a] animate-pulse" />}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Discord Side Drawer (Participants & Live In-Meeting Chat) */}
        {activeSidePanel && (
          <div className="w-80 border-l border-[#202225] bg-[#1e1f22] flex flex-col z-20 shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#2b2d31] flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveSidePanel('participants')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5',
                    activeSidePanel === 'participants'
                      ? 'bg-[#313338] text-white shadow-sm'
                      : 'text-gray-400 hover:text-gray-200'
                  )}
                >
                  <Users className="w-3.5 h-3.5" />
                  Participants ({connectedUsers.length})
                </button>
                <button
                  onClick={() => {
                    setActiveSidePanel('chat');
                    setUnreadChatCount(0);
                  }}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 relative',
                    activeSidePanel === 'chat'
                      ? 'bg-[#313338] text-white shadow-sm'
                      : 'text-gray-400 hover:text-gray-200'
                  )}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Chat
                  {unreadChatCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-[#5865F2]" />
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
                    <span className="w-2 h-2 rounded-full bg-[#23a55a]" />
                    In Meeting — {connectedUsers.length}
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-[#2b2d31]/60 border border-[#383a40]">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar name={currentUserName} size="sm" />
                        <div className="truncate">
                          <p className="text-xs font-medium text-white truncate flex items-center gap-1.5">
                            {currentUserName}
                            <span className="text-[10px] text-[#5865F2] font-semibold">(You)</span>
                          </p>
                          <p className="text-[10px] text-gray-400">{currentUser?.designation || 'Participant'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-400">
                        {micEnabled ? <Mic className="w-3.5 h-3.5 text-gray-300" /> : <MicOff className="w-3.5 h-3.5 text-red-400" />}
                        {videoEnabled ? <Video className="w-3.5 h-3.5 text-gray-300" /> : <VideoOff className="w-3.5 h-3.5 text-red-400" />}
                      </div>
                    </div>

                    {connectedUsers
                      .filter(u => u.userId !== currentUserId)
                      .map(user => (
                        <div key={user.userId} className="flex items-center justify-between p-2 rounded-xl bg-[#2b2d31]/60 border border-[#383a40]">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar name={user.name} size="sm" />
                            <div className="truncate">
                              <p className="text-xs font-medium text-white truncate">{user.name}</p>
                              <p className="text-[10px] text-gray-400 truncate">{user.designation || 'Member'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-400">
                            {user.micEnabled ? <Mic className="w-3.5 h-3.5 text-gray-300" /> : <MicOff className="w-3.5 h-3.5 text-red-400" />}
                            {user.videoEnabled ? <Video className="w-3.5 h-3.5 text-gray-300" /> : <VideoOff className="w-3.5 h-3.5 text-red-400" />}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {offlineInvitedUsers.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-gray-500" />
                      Invited / Not Yet Joined — {offlineInvitedUsers.length}
                    </h4>
                    <div className="space-y-1.5">
                      {offlineInvitedUsers.map(user => (
                        <div key={user.id} className="flex items-center justify-between p-2 rounded-xl bg-[#1e1f22] opacity-60 border border-dashed border-[#383a40]">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar name={user.name} size="sm" />
                            <div className="truncate">
                              <p className="text-xs font-medium text-gray-300 truncate">{user.name}</p>
                              <p className="text-[10px] text-gray-500 truncate">{user.designation || 'Invited'}</p>
                            </div>
                          </div>
                          <span className="text-[10px] bg-[#2b2d31] px-2 py-0.5 rounded text-gray-400">Offline</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-3 bg-[#2b2d31]/80 rounded-xl border border-[#383a40] space-y-2">
                  <p className="text-xs font-semibold text-gray-200">Share Meeting Room</p>
                  <p className="text-[11px] text-gray-400">Invite anyone by copying this direct room link.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyLink}
                    className="w-full text-xs h-8 border-[#383a40] bg-[#313338] hover:bg-[#383a40] text-gray-200"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-green-400 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                    {copiedLink ? 'Copied' : 'Copy Room Link'}
                  </Button>
                </div>
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
                      <p className="text-[11px] text-gray-500 mt-1">Send a message to everyone currently in this call.</p>
                    </div>
                  ) : (
                    chatMessages.map(msg => {
                      const isMe = msg.userId === currentUserId;
                      return (
                        <div key={msg.id} className="text-xs space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-gray-200">{isMe ? 'You' : msg.userName}</span>
                            <span className="text-[10px] text-gray-500">{msg.time}</span>
                          </div>
                          <div className="bg-[#2b2d31] text-gray-200 p-2.5 rounded-xl rounded-tl-none border border-[#383a40] inline-block max-w-full break-words">
                            {msg.text}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <form onSubmit={handleSendMessage} className="p-3 border-t border-[#2b2d31] bg-[#1e1f22]">
                  <div className="flex items-center gap-2 bg-[#2b2d31] border border-[#383a40] rounded-xl px-3 py-1.5 focus-within:border-[#5865F2] transition-colors">
                    <input
                      type="text"
                      placeholder="Send a message..."
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      className="flex-1 bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim()}
                      className="text-[#5865F2] disabled:text-gray-600 hover:text-white transition-colors"
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

      {/* Discord Style Bottom Control Dock */}
      <footer className="h-20 bg-[#1e1f22] border-t border-[#202225] flex items-center justify-center gap-3 px-6 relative z-30">
        <button
          onClick={toggleMic}
          title={micEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
          className={cn(
            'h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-150 shadow-md',
            micEnabled
              ? 'bg-[#2b2d31] hover:bg-[#383a40] text-gray-200 border border-[#383a40]'
              : 'bg-[#da373c]/20 hover:bg-[#da373c]/30 text-[#da373c] border border-[#da373c]/50'
          )}
        >
          {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        <button
          onClick={toggleVideo}
          title={videoEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
          className={cn(
            'h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-150 shadow-md',
            videoEnabled
              ? 'bg-[#2b2d31] hover:bg-[#383a40] text-gray-200 border border-[#383a40]'
              : 'bg-[#da373c]/20 hover:bg-[#da373c]/30 text-[#da373c] border border-[#da373c]/50'
          )}
        >
          {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

        <button
          onClick={toggleScreenShare}
          title={screenSharing ? 'Stop Sharing Screen' : 'Share Screen'}
          className={cn(
            'h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-150 shadow-md',
            screenSharing
              ? 'bg-[#5865F2] hover:bg-[#4752c4] text-white shadow-[#5865F2]/30'
              : 'bg-[#2b2d31] hover:bg-[#383a40] text-gray-200 border border-[#383a40]'
          )}
        >
          <MonitorUp className="w-5 h-5" />
        </button>

        <button
          onClick={toggleDeafen}
          title={isDeafened ? 'Undeafen' : 'Deafen'}
          className={cn(
            'h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-150 shadow-md',
            isDeafened
              ? 'bg-[#da373c]/20 hover:bg-[#da373c]/30 text-[#da373c] border border-[#da373c]/50'
              : 'bg-[#2b2d31] hover:bg-[#383a40] text-gray-200 border border-[#383a40]'
          )}
        >
          {isDeafened ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>

        <div className="w-px h-8 bg-[#313338] mx-2" />

        <button
          onClick={() => setActiveSidePanel(p => (p === 'participants' ? null : 'participants'))}
          title="Participants"
          className={cn(
            'h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-150 shadow-md relative',
            activeSidePanel === 'participants'
              ? 'bg-[#5865F2]/20 text-[#5865F2] border border-[#5865F2]/50'
              : 'bg-[#2b2d31] hover:bg-[#383a40] text-gray-200 border border-[#383a40]'
          )}
        >
          <Users className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 bg-[#23a55a] text-black font-extrabold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#1e1f22]">
            {connectedUsers.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveSidePanel(p => (p === 'chat' ? null : 'chat'));
            setUnreadChatCount(0);
          }}
          title="Chat"
          className={cn(
            'h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-150 shadow-md relative',
            activeSidePanel === 'chat'
              ? 'bg-[#5865F2]/20 text-[#5865F2] border border-[#5865F2]/50'
              : 'bg-[#2b2d31] hover:bg-[#383a40] text-gray-200 border border-[#383a40]'
          )}
        >
          <MessageSquare className="w-5 h-5" />
          {unreadChatCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#5865F2] text-white font-extrabold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#1e1f22]">
              {unreadChatCount}
            </span>
          )}
        </button>

        <button
          onClick={handleLeave}
          title="Leave Meeting"
          className="h-12 px-6 rounded-2xl bg-[#da373c] hover:bg-[#c02e34] text-white font-semibold flex items-center gap-2 shadow-lg shadow-[#da373c]/25 transition-all duration-150 ml-4 active:scale-95"
        >
          <PhoneOff className="w-5 h-5" />
          <span>Disconnect</span>
        </button>
      </footer>
    </div>
  );
}

function VideoFeed({
  stream,
  isMuted,
  className,
}: {
  stream: MediaStream;
  isMuted: boolean;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

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
