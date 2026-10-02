// ============================================================
// Hyna Studio Management - WebRTC Group Meeting Core Hook
// Mesh WebRTC Peer Management + Supabase Realtime Signaling
// Cloud-native: Automatic peer discovery, audio/video streaming
// ============================================================

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { WebRTCManager } from '@/services/webrtc/WebRTCManager';
import { SupabaseSignalingService } from '@/services/signaling/SupabaseSignalingService';
import { updateMeetingStatus } from '@/services/meetingService';
import { toast } from 'sonner';
import type { 
  Meeting, 
  ParticipantState, 
  SignalingMessage 
} from '@/types/meeting';
import type { User } from '@/types';

export interface UseWebRTCMeetingProps {
  meeting: Meeting | null;
  currentUser: User | null;
  isHost: boolean;
  initialMicEnabled?: boolean;
  initialVideoEnabled?: boolean;
  selectedCameraId?: string;
  selectedMicrophoneId?: string;
  onMeetingEndedByHost?: () => void;
}

export function useWebRTCMeeting({
  meeting,
  currentUser,
  isHost,
  initialMicEnabled = true,
  initialVideoEnabled = true,
  selectedCameraId,
  selectedMicrophoneId,
  onMeetingEndedByHost,
}: UseWebRTCMeetingProps) {
  // Local media state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [micEnabled, setMicEnabled] = useState<boolean>(initialMicEnabled);
  const [videoEnabled, setVideoEnabled] = useState<boolean>(
    meeting?.meetingType === 'audio' ? false : initialVideoEnabled
  );
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [isLocalSpeaking, setIsLocalSpeaking] = useState<boolean>(false);

  // Connection and remote participants state
  const [participants, setParticipants] = useState<Map<string, ParticipantState>>(new Map());
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [overallConnectionState, setOverallConnectionState] = useState<'connecting' | 'connected' | 'reconnecting' | 'disconnected'>('connecting');
  const [pinnedParticipantId, setPinnedParticipantId] = useState<string | null>(null);

  // References
  const webrtcManagerRef = useRef<WebRTCManager | null>(null);
  const signalingServiceRef = useRef<SupabaseSignalingService | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Stable Unique Peer/Session ID per browser tab (Prevents same-account/guest collisions)
  const roomKey = meeting?.meetingRoomId || meeting?.id || 'default_room';
  const localPeerId = useMemo(() => {
    const storageKey = `hyna_rtc_peer_${roomKey}`;
    let stored = sessionStorage.getItem(storageKey);
    if (!stored) {
      stored = `${currentUser?.id || 'guest'}_${Math.random().toString(36).slice(2, 9)}`;
      sessionStorage.setItem(storageKey, stored);
    }
    return stored;
  }, [roomKey, currentUser?.id]);

  const localUserId = currentUser?.id || localPeerId;
  const localUserName = currentUser?.name || 'Guest Member';
  const localUserAvatar = currentUser?.avatar || '';
  const localUserRole = currentUser?.designation || currentUser?.role || 'Member';

  // 1. Initialize Web Audio Analyser for Speaking Detection
  const setupSpeechDetection = useCallback((stream: MediaStream) => {
    try {
      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) return;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkAudioLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;

        // If average frequency amplitude > threshold, user is speaking
        setIsLocalSpeaking(average > 18);
        animFrameRef.current = requestAnimationFrame(checkAudioLevel);
      };

      checkAudioLevel();
    } catch (e) {
      console.warn('[useWebRTCMeeting] Audio analyser setup failed:', e);
    }
  }, []);

  // Helper: Guarantees a remote participant is registered in UI state
  const ensureParticipant = useCallback((peerId: string, meta?: Partial<ParticipantState>) => {
    setParticipants(prev => {
      const existing = prev.get(peerId);
      const next = new Map(prev);
      next.set(peerId, {
        memberId: meta?.memberId || existing?.memberId || peerId,
        name: meta?.name || existing?.name || 'Team Member',
        avatar: meta?.avatar || existing?.avatar || '',
        role: meta?.role || existing?.role || 'member',
        designation: meta?.designation || existing?.designation || 'Software Engineer',
        micEnabled: meta?.micEnabled ?? existing?.micEnabled ?? true,
        videoEnabled: meta?.videoEnabled ?? existing?.videoEnabled ?? true,
        isScreenSharing: meta?.isScreenSharing ?? existing?.isScreenSharing ?? false,
        isSpeaking: existing?.isSpeaking ?? false,
        isHost: meta?.isHost ?? existing?.isHost ?? false,
        joinedAt: existing?.joinedAt || new Date().toISOString(),
        connectionState: meta?.connectionState || existing?.connectionState || 'connecting',
      });
      return next;
    });
  }, []);

  // 2. Handle incoming WebRTC signaling messages
  const handleIncomingSignal = useCallback(async (msg: SignalingMessage) => {
    const manager = webrtcManagerRef.current;
    if (!manager) return;

    const senderId = msg.senderId;
    if (!senderId || senderId === localPeerId) return;

    // Immediately guarantee sender is registered in participants state with metadata
    ensureParticipant(senderId, {
      name: msg.senderName,
      avatar: msg.senderAvatar,
      role: msg.senderRole,
      designation: msg.senderRole,
    });

    switch (msg.type) {
      case 'JOIN': {
        // Peer joined: create and send WebRTC offer to them
        try {
          console.log(`[WebRTC] Peer ${senderId} joined. Creating offer...`);
          const offer = await manager.createOffer(senderId);
          await signalingServiceRef.current?.sendSignal({
            type: 'OFFER',
            senderId: localPeerId,
            targetId: senderId,
            senderName: localUserName,
            offer,
          });
        } catch (err) {
          console.error(`[WebRTC] Failed to send offer to ${senderId}:`, err);
        }
        break;
      }

      case 'OFFER': {
        if (!msg.offer) return;
        try {
          console.log(`[WebRTC] Received offer from ${senderId}. Creating answer...`);
          const answer = await manager.handleOffer(senderId, msg.offer);
          if (answer && answer.type === 'answer') {
            await signalingServiceRef.current?.sendSignal({
              type: 'ANSWER',
              senderId: localPeerId,
              targetId: senderId,
              senderName: localUserName,
              answer,
            });
          }
        } catch (err) {
          console.error(`[WebRTC] Failed to handle offer from ${senderId}:`, err);
        }
        break;
      }

      case 'ANSWER': {
        if (!msg.answer) return;
        try {
          console.log(`[WebRTC] Received answer from ${senderId}.`);
          await manager.handleAnswer(senderId, msg.answer);
        } catch (err) {
          console.error(`[WebRTC] Failed to handle answer from ${senderId}:`, err);
        }
        break;
      }

      case 'ICE_CANDIDATE': {
        if (!msg.candidate) return;
        try {
          await manager.addIceCandidate(senderId, msg.candidate);
        } catch (err) {
          console.error(`[WebRTC] Failed to add ICE candidate from ${senderId}:`, err);
        }
        break;
      }

      case 'MUTE_CHANGED': {
        setParticipants(prev => {
          const next = new Map(prev);
          const p = next.get(senderId);
          if (p) {
            next.set(senderId, { ...p, micEnabled: Boolean(msg.micEnabled) });
          }
          return next;
        });
        break;
      }

      case 'CAMERA_CHANGED': {
        setParticipants(prev => {
          const next = new Map(prev);
          const p = next.get(senderId);
          if (p) {
            next.set(senderId, { ...p, videoEnabled: Boolean(msg.videoEnabled) });
          }
          return next;
        });
        break;
      }

      case 'SCREEN_SHARE_STARTED': {
        setParticipants(prev => {
          const next = new Map(prev);
          const p = next.get(senderId);
          if (p) {
            next.set(senderId, { ...p, isScreenSharing: true });
          }
          return next;
        });
        break;
      }

      case 'SCREEN_SHARE_STOPPED': {
        setParticipants(prev => {
          const next = new Map(prev);
          const p = next.get(senderId);
          if (p) {
            next.set(senderId, { ...p, isScreenSharing: false });
          }
          return next;
        });
        break;
      }

      case 'LEAVE': {
        manager.cleanupPeer(senderId);
        setParticipants(prev => {
          const next = new Map(prev);
          next.delete(senderId);
          return next;
        });
        setRemoteStreams(prev => {
          const next = new Map(prev);
          next.delete(senderId);
          return next;
        });
        break;
      }

      default:
        break;
    }
  }, [localPeerId, localUserName]);

  // 3. Handle presence sync
  const handlePresenceSync = useCallback((presences: Record<string, any[]>) => {
    const manager = webrtcManagerRef.current;

    setParticipants(prev => {
      const next = new Map(prev);

      Object.entries(presences).forEach(([key, presenceList]) => {
        if (key !== localPeerId && presenceList && presenceList.length > 0) {
          const latest = presenceList[presenceList.length - 1];
          const existing = next.get(key);

          next.set(key, {
            memberId: latest.memberId || key,
            name: latest.name || 'Team Member',
            avatar: latest.avatar || '',
            role: latest.role || 'member',
            designation: latest.designation || 'Software Engineer',
            micEnabled: latest.micEnabled ?? true,
            videoEnabled: latest.videoEnabled ?? true,
            isScreenSharing: latest.isScreenSharing ?? false,
            isSpeaking: existing?.isSpeaking ?? false,
            isHost: latest.isHost ?? false,
            joinedAt: latest.joinedAt || new Date().toISOString(),
            connectionState: existing?.connectionState || 'connecting',
          });

          // Tie-breaker: If no peer connection exists yet and localPeerId > remotePeerId,
          // initiate an offer to ensure connection succeeds even if JOIN broadcast was missed
          if (manager && !manager.hasPeerConnection(key) && localPeerId > key) {
            console.log(`[WebRTC] Deterministic offer initiation to ${key} from presence sync.`);
            manager.createOffer(key).then(offer => {
              signalingServiceRef.current?.sendSignal({
                type: 'OFFER',
                senderId: localPeerId,
                targetId: key,
                senderName: localUserName,
                offer,
              });
            }).catch(e => console.warn('[WebRTC] Presence offer initiation error:', e));
          }
        }
      });

      // Cleanup departed peers
      for (const peerId of next.keys()) {
        if (!presences[peerId]) {
          manager?.cleanupPeer(peerId);
          next.delete(peerId);
        }
      }

      return next;
    });
  }, [localPeerId, localUserName]);

  // 4. Initialize Media Stream and WebRTC Manager
  const startMeetingSession = useCallback(async (initialVideo?: boolean, initialAudio?: boolean, preExistingStream?: MediaStream | null) => {
    if (!meeting) return;

    const isAudioOnly = meeting.meetingType === 'audio';

    const activeVideo = typeof initialVideo === 'boolean'
      ? (!isAudioOnly && initialVideo)
      : (!isAudioOnly && videoEnabled);
    const activeAudio = typeof initialAudio === 'boolean'
      ? initialAudio
      : micEnabled;

    setVideoEnabled(activeVideo);
    setMicEnabled(activeAudio);

    try {
      let stream = preExistingStream;
      if (stream) {
        stream = new MediaStream(stream.getTracks());
      } else {
        const constraints: MediaStreamConstraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            ...(selectedMicrophoneId ? { deviceId: { exact: selectedMicrophoneId } } : {}),
          },
          video: (!isAudioOnly && activeVideo)
            ? {
                width: { ideal: 1280, max: 1920 },
                height: { ideal: 720, max: 1080 },
                frameRate: { ideal: 30, max: 30 },
                ...(selectedCameraId ? { deviceId: { exact: selectedCameraId } } : {}),
              }
            : false,
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);
      }

      setLocalStream(stream);

      // Apply initial track enabled state
      stream.getAudioTracks().forEach(t => {
        t.enabled = activeAudio;
      });
      stream.getVideoTracks().forEach(t => {
        t.enabled = activeVideo;
      });

      setupSpeechDetection(stream);

      // Initialize WebRTC Manager
      if (webrtcManagerRef.current) {
        webrtcManagerRef.current.cleanupAll();
        webrtcManagerRef.current = null;
      }

      const manager = new WebRTCManager(localPeerId, {
        onRemoteStream: (peerId, remoteStream) => {
          console.log(`[WebRTC Hook] Received remote stream from peer ${peerId}`, {
            audioTracks: remoteStream.getAudioTracks().length,
            videoTracks: remoteStream.getVideoTracks().length,
          });
          setRemoteStreams(prev => new Map(prev).set(peerId, remoteStream));
          ensureParticipant(peerId);
        },
        onRemoteStreamUpdate: (peerId, remoteStream) => {
          setRemoteStreams(prev => new Map(prev).set(peerId, remoteStream));
          ensureParticipant(peerId);
        },
        onRemoteStreamRemoved: (peerId) => {
          setRemoteStreams(prev => {
            const next = new Map(prev);
            next.delete(peerId);
            return next;
          });
        },
        onPeerConnectionStateChange: (peerId, state) => {
          setParticipants(prev => {
            const next = new Map(prev);
            const p = next.get(peerId);
            if (p) {
              next.set(peerId, { ...p, connectionState: state });
            }
            return next;
          });

          if (state === 'connected') {
            setOverallConnectionState('connected');
          } else if (state === 'disconnected' || state === 'failed') {
            setOverallConnectionState('reconnecting');
          }
        },
        onIceCandidate: (targetPeerId, candidate) => {
          signalingServiceRef.current?.sendSignal({
            type: 'ICE_CANDIDATE',
            senderId: localPeerId,
            targetId: targetPeerId,
            senderName: localUserName,
            candidate: candidate.toJSON(),
          });
        },
        onError: (error, ctx) => {
          console.error(`[WebRTC Error in ${ctx}]:`, error);
        },
      });

      manager.setLocalStream(stream);
      webrtcManagerRef.current = manager;

      // Initialize Supabase Signaling Service
      const currentRoomKey = meeting.meetingRoomId || meeting.id;
      const signaling = new SupabaseSignalingService(
        currentRoomKey,
        localPeerId,
        {
          id: localUserId,
          name: localUserName,
          avatar: localUserAvatar,
          role: localUserRole,
          designation: currentUser?.designation,
        },
        {
          onSignal: async (msg: SignalingMessage) => {
            await handleIncomingSignal(msg);
          },
          onPresenceSync: (presences) => {
            handlePresenceSync(presences);
          },
          onPresenceJoin: (key, newPresences) => {
            if (key !== localPeerId) {
              const latest = newPresences?.[0] || {};
              ensureParticipant(key, {
                memberId: latest.memberId || key,
                name: latest.name || 'Team Member',
                avatar: latest.avatar || '',
                role: latest.role || 'member',
                designation: latest.designation || 'Software Engineer',
                micEnabled: latest.micEnabled ?? true,
                videoEnabled: latest.videoEnabled ?? true,
                isScreenSharing: latest.isScreenSharing ?? false,
                isHost: latest.isHost ?? false,
                connectionState: 'connecting',
              });
            }
          },
          onPresenceLeave: (key) => {
            if (key !== localPeerId) {
              webrtcManagerRef.current?.cleanupPeer(key);
              setParticipants(prev => {
                const next = new Map(prev);
                next.delete(key);
                return next;
              });
              setRemoteStreams(prev => {
                const next = new Map(prev);
                next.delete(key);
                return next;
              });
            }
          },
          onMeetingEnded: () => {
            if (onMeetingEndedByHost) {
              onMeetingEndedByHost();
            }
          },
        }
      );

      signalingServiceRef.current = signaling;

      // Connect signaling and broadcast presence
      await signaling.connect({
        memberId: localUserId,
        name: localUserName,
        avatar: localUserAvatar,
        role: localUserRole,
        designation: currentUser?.designation,
        micEnabled: activeAudio,
        videoEnabled: activeVideo,
        isScreenSharing: false,
        isHost,
        joinedAt: new Date().toISOString(),
        connectionState: 'connected',
      });

      setOverallConnectionState('connected');

      // Update meeting status in DB to 'live' if it's currently scheduled
      if (meeting.status === 'scheduled') {
        updateMeetingStatus(meeting.id, 'live').catch(() => {});
      }
    } catch (err: any) {
      console.error('[useWebRTCMeeting] Failed to start meeting session:', err);
      setOverallConnectionState('disconnected');
    }
  }, [
    meeting,
    localPeerId,
    localUserId,
    localUserName,
    localUserAvatar,
    localUserRole,
    currentUser?.designation,
    micEnabled,
    videoEnabled,
    isHost,
    selectedCameraId,
    selectedMicrophoneId,
    setupSpeechDetection,
    handleIncomingSignal,
    handlePresenceSync,
    onMeetingEndedByHost,
  ]);

  // 5. Toggle microphone
  const toggleMute = useCallback(() => {
    const nextState = !micEnabled;
    setMicEnabled(nextState);

    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.setAudioEnabled(nextState);
    }

    signalingServiceRef.current?.sendSignal({
      type: 'MUTE_CHANGED',
      senderId: localPeerId,
      senderName: localUserName,
      micEnabled: nextState,
    });

    signalingServiceRef.current?.updatePresence({
      micEnabled: nextState,
    });
  }, [micEnabled, localPeerId, localUserName]);

  // 6. Toggle camera
  const toggleCamera = useCallback(async () => {
    if (meeting?.meetingType === 'audio') {
      toast.info('This is an audio-only meeting.');
      return;
    }

    const nextState = !videoEnabled;
    setVideoEnabled(nextState);

    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.setVideoEnabled(nextState);
    }

    signalingServiceRef.current?.sendSignal({
      type: 'CAMERA_CHANGED',
      senderId: localPeerId,
      senderName: localUserName,
      videoEnabled: nextState,
    });

    signalingServiceRef.current?.updatePresence({
      videoEnabled: nextState,
    });
  }, [videoEnabled, meeting?.meetingType, localPeerId, localUserName]);

  // 7. Toggle Screen Share
  const toggleScreenShare = useCallback(async () => {
    const manager = webrtcManagerRef.current;
    if (!manager) return;

    if (isScreenSharing) {
      // Stop screen share
      await manager.stopScreenShare();
      setIsScreenSharing(false);

      signalingServiceRef.current?.sendSignal({
        type: 'SCREEN_SHARE_STOPPED',
        senderId: localPeerId,
        senderName: localUserName,
      });

      signalingServiceRef.current?.updatePresence({
        isScreenSharing: false,
      });
    } else {
      // Start screen share
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: { ideal: 30 } },
          audio: true,
        });

        screenStreamRef.current = displayStream;

        displayStream.getVideoTracks()[0].onended = () => {
          toggleScreenShare();
        };

        await manager.startScreenShare(displayStream);
        setIsScreenSharing(true);

        signalingServiceRef.current?.sendSignal({
          type: 'SCREEN_SHARE_STARTED',
          senderId: localPeerId,
          senderName: localUserName,
        });

        signalingServiceRef.current?.updatePresence({
          isScreenSharing: true,
        });
      } catch (err: any) {
        if (err.name !== 'NotAllowedError') {
          console.error('[WebRTC] Screen share failed:', err);
          toast.error('Failed to start screen share.');
        }
      }
    }
  }, [isScreenSharing, localPeerId, localUserName]);

  // 8. Leave Meeting
  const leaveMeeting = useCallback(async () => {
    // Stop local media
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    // Stop screen share
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }

    // Stop audio analyser
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }

    // Cleanup WebRTC and signaling
    webrtcManagerRef.current?.cleanupAll();
    await signalingServiceRef.current?.disconnect();

    setParticipants(new Map());
    setRemoteStreams(new Map());
    setOverallConnectionState('disconnected');
  }, [localStream]);

  // 9. End Meeting for Everyone (Host only)
  const endMeetingForEveryone = useCallback(async () => {
    if (!isHost || !meeting) return;

    try {
      await signalingServiceRef.current?.broadcastMeetingEnded();
      await updateMeetingStatus(meeting.id, 'completed');
      await leaveMeeting();
    } catch (err) {
      console.error('[WebRTC] Error ending meeting:', err);
    }
  }, [isHost, meeting, leaveMeeting]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveMeeting();
    };
  }, []);

  // Compute current local participant state
  const localParticipantState: ParticipantState = useMemo(() => ({
    memberId: localUserId,
    name: localUserName,
    avatar: localUserAvatar,
    role: currentUser?.role || 'member',
    designation: currentUser?.designation || 'Software Engineer',
    micEnabled,
    videoEnabled,
    isScreenSharing,
    isSpeaking: isLocalSpeaking,
    isHost,
    joinedAt: new Date().toISOString(),
    connectionState: overallConnectionState === 'connected' ? 'connected' : 'connecting',
  }), [
    localUserId,
    localUserName,
    localUserAvatar,
    currentUser?.role,
    currentUser?.designation,
    micEnabled,
    videoEnabled,
    isScreenSharing,
    isLocalSpeaking,
    isHost,
    overallConnectionState,
  ]);

  return {
    localStream,
    localParticipantState,
    participants,
    remoteStreams,
    micEnabled,
    videoEnabled,
    isScreenSharing,
    isLocalSpeaking,
    overallConnectionState,
    pinnedParticipantId,
    startMeetingSession,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
    setPinnedParticipantId,
    leaveMeeting,
    endMeetingForEveryone,
  };
}
