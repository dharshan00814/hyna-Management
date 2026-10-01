// ============================================================
// Hyna Studio Management - WebRTC Group Meeting Core Hook
// Mesh WebRTC Peer Management + Supabase Signaling + Presence
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

  const localUserId = currentUser?.id || 'guest_' + Math.random().toString(36).slice(2, 8);
  const localUserName = currentUser?.name || 'Team Member';
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

  // 2. Initialize Media Stream and WebRTC Manager
  const startMeetingSession = useCallback(async (initialVideo?: boolean, initialAudio?: boolean) => {
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

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
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
      const manager = new WebRTCManager(localUserId, {
        onRemoteStream: (peerId, remoteStream) => {
          setRemoteStreams(prev => new Map(prev).set(peerId, remoteStream));
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
            senderId: localUserId,
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
      const roomKey = meeting.meetingRoomId || meeting.id;
      const signaling = new SupabaseSignalingService(
        roomKey,
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
            // New participant joined
            if (key !== localUserId) {
              const latest = newPresences?.[0];
              if (latest) {
                setParticipants(prev => {
                  const next = new Map(prev);
                  next.set(key, {
                    memberId: key,
                    name: latest.name || 'Team Member',
                    avatar: latest.avatar || '',
                    role: latest.role || 'member',
                    designation: latest.designation || 'Software Engineer',
                    micEnabled: latest.micEnabled ?? true,
                    videoEnabled: latest.videoEnabled ?? true,
                    isScreenSharing: latest.isScreenSharing ?? false,
                    isSpeaking: false,
                    isHost: latest.isHost ?? false,
                    joinedAt: latest.joinedAt || new Date().toISOString(),
                    connectionState: 'connecting',
                  });
                  return next;
                });
              }

              // Initiate WebRTC offer to the newly joined peer
              webrtcManagerRef.current?.createOffer(key).then(offer => {
                signalingServiceRef.current?.sendSignal({
                  type: 'OFFER',
                  senderId: localUserId,
                  targetId: key,
                  senderName: localUserName,
                  offer,
                });
              }).catch(err => console.error('Error creating offer for new joiner:', err));
            }
          },
          onPresenceLeave: (key) => {
            if (key !== localUserId) {
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
    onMeetingEndedByHost,
  ]);

  // 3. Handle incoming WebRTC signaling messages
  const handleIncomingSignal = async (msg: SignalingMessage) => {
    const manager = webrtcManagerRef.current;
    if (!manager) return;

    const senderId = msg.senderId;
    if (senderId === localUserId) return;

    switch (msg.type) {

      case 'OFFER': {
        if (!msg.offer) return;
        try {
          const answer = await manager.handleOffer(senderId, msg.offer);
          if (answer) {
            await signalingServiceRef.current?.sendSignal({
              type: 'ANSWER',
              senderId: localUserId,
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
          } else {
            next.set(senderId, {
              memberId: senderId,
              name: msg.senderName || 'Team Member',
              avatar: '',
              role: 'member',
              designation: '',
              micEnabled: Boolean(msg.micEnabled),
              videoEnabled: true,
              isScreenSharing: false,
              isSpeaking: false,
              isHost: false,
              joinedAt: new Date().toISOString(),
              connectionState: 'connected',
            });
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
          } else {
            next.set(senderId, {
              memberId: senderId,
              name: msg.senderName || 'Team Member',
              avatar: '',
              role: 'member',
              designation: '',
              micEnabled: true,
              videoEnabled: Boolean(msg.videoEnabled),
              isScreenSharing: false,
              isSpeaking: false,
              isHost: false,
              joinedAt: new Date().toISOString(),
              connectionState: 'connected',
            });
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
        setPinnedParticipantId(senderId);
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
        setPinnedParticipantId(null);
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
    }
  };

  // 4. Handle presence synchronization
  const handlePresenceSync = (presenceState: Record<string, any[]>) => {
    setParticipants(prev => {
      const next = new Map(prev);

      Object.entries(presenceState).forEach(([key, presences]) => {
        if (key === localUserId) return;
        const latest = presences[0];
        if (!latest) return;

        const existing = next.get(key);
        next.set(key, {
          memberId: key,
          name: latest.name || 'Team Member',
          avatar: latest.avatar || '',
          role: latest.role || 'member',
          designation: latest.designation || 'Software Engineer',
          micEnabled: latest.micEnabled ?? true,
          videoEnabled: latest.videoEnabled ?? true,
          isScreenSharing: latest.isScreenSharing ?? false,
          isSpeaking: latest.isSpeaking ?? false,
          isHost: latest.isHost ?? false,
          joinedAt: latest.joinedAt || new Date().toISOString(),
          connectionState: existing?.connectionState || 'connecting',
        });
      });

      return next;
    });
  };

  // 5. Media Control Handlers
  const toggleMute = useCallback(() => {
    const nextState = !micEnabled;
    setMicEnabled(nextState);
    webrtcManagerRef.current?.setAudioEnabled(nextState);

    signalingServiceRef.current?.sendSignal({
      type: 'MUTE_CHANGED',
      senderId: localUserId,
      senderName: localUserName,
      micEnabled: nextState,
    });

    signalingServiceRef.current?.updatePresence({ micEnabled: nextState });
  }, [micEnabled, localUserId, localUserName]);

  const toggleCamera = useCallback(async () => {
    if (meeting?.meetingType === 'audio') return;

    const nextState = !videoEnabled;

    if (!nextState) {
      // 1. Physically shut down laptop webcam hardware
      setVideoEnabled(false);

      if (localStream) {
        localStream.getVideoTracks().forEach(track => {
          track.stop();
          localStream.removeTrack(track);
        });
      }

      // Tell peers to stop rendering our video track
      await webrtcManagerRef.current?.replaceVideoTrack(null);

      signalingServiceRef.current?.sendSignal({
        type: 'CAMERA_CHANGED',
        senderId: localUserId,
        senderName: localUserName,
        videoEnabled: false,
      });

      signalingServiceRef.current?.updatePresence({ videoEnabled: false });
    } else {
      // 2. Turn camera hardware back ON with a fresh track
      try {
        const videoConstraints: MediaTrackConstraints = {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 30 },
          ...(selectedCameraId ? { deviceId: { exact: selectedCameraId } } : {}),
        };

        const freshVideoStream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false,
        });

        const newVideoTrack = freshVideoStream.getVideoTracks()[0];
        if (newVideoTrack && localStream) {
          localStream.addTrack(newVideoTrack);
          await webrtcManagerRef.current?.replaceVideoTrack(newVideoTrack);
        }

        setVideoEnabled(true);

        signalingServiceRef.current?.sendSignal({
          type: 'CAMERA_CHANGED',
          senderId: localUserId,
          senderName: localUserName,
          videoEnabled: true,
        });

        signalingServiceRef.current?.updatePresence({ videoEnabled: true });
      } catch (err) {
        console.error('[useWebRTCMeeting] Error re-enabling camera:', err);
        toast.error('Unable to access camera device.');
      }
    }
  }, [meeting?.meetingType, videoEnabled, localStream, selectedCameraId, localUserId, localUserName]);

  // Screen Sharing Toggle
  const toggleScreenShare = useCallback(async () => {
    const manager = webrtcManagerRef.current;
    if (!manager) return;

    if (isScreenSharing) {
      // Stop screen sharing
      await manager.stopScreenShare();
      screenStreamRef.current = null;
      setIsScreenSharing(false);

      signalingServiceRef.current?.sendSignal({
        type: 'SCREEN_SHARE_STOPPED',
        senderId: localUserId,
        senderName: localUserName,
      });

      signalingServiceRef.current?.updatePresence({ isScreenSharing: false });
    } else {
      // Start screen sharing
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });

        screenStreamRef.current = displayStream;
        setIsScreenSharing(true);
        await manager.startScreenShare(displayStream);

        // When user stops sharing using browser UI
        displayStream.getVideoTracks()[0].onended = () => {
          manager.stopScreenShare();
          screenStreamRef.current = null;
          setIsScreenSharing(false);

          signalingServiceRef.current?.sendSignal({
            type: 'SCREEN_SHARE_STOPPED',
            senderId: localUserId,
            senderName: localUserName,
          });

          signalingServiceRef.current?.updatePresence({ isScreenSharing: false });
        };

        signalingServiceRef.current?.sendSignal({
          type: 'SCREEN_SHARE_STARTED',
          senderId: localUserId,
          senderName: localUserName,
        });

        signalingServiceRef.current?.updatePresence({ isScreenSharing: true });
      } catch (err: any) {
        if (err.name !== 'NotAllowedError') {
          console.error('[ScreenShare] Error starting screen share:', err);
        }
      }
    }
  }, [isScreenSharing, localUserId, localUserName]);

  // Leave Meeting (normal participant)
  const leaveMeeting = useCallback(async () => {
    // 1. Stop all local tracks immediately so camera hardware shuts down
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      setLocalStream(null);
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }

    // 2. Teardown WebRTC & Signaling
    webrtcManagerRef.current?.cleanupAll();
    await signalingServiceRef.current?.disconnect();

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
    }

    setOverallConnectionState('disconnected');
  }, [localStream]);

  // End Meeting for Everyone (host only)
  const endMeetingForEveryone = useCallback(async () => {
    if (!meeting) return;

    // Broadcast MEETING_ENDED to all participants
    await signalingServiceRef.current?.broadcastMeetingEnded();

    // Update meeting status in DB to 'completed'
    await updateMeetingStatus(meeting.id, 'completed');

    // Cleanup local session
    await leaveMeeting();
  }, [meeting, leaveMeeting]);

  // Teardown on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
      if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
      }
      webrtcManagerRef.current?.cleanupAll();
      signalingServiceRef.current?.disconnect();
    };
  }, [localStream]);

  // Local Participant State object for UI
  const localParticipantState: ParticipantState = useMemo(() => ({
    memberId: localUserId,
    name: localUserName,
    avatar: localUserAvatar,
    role: localUserRole,
    designation: currentUser?.designation,
    micEnabled,
    videoEnabled: meeting?.meetingType === 'audio' ? false : videoEnabled,
    isScreenSharing,
    isSpeaking: isLocalSpeaking,
    isHost,
    joinedAt: new Date().toISOString(),
    connectionState: 'connected',
  }), [
    localUserId,
    localUserName,
    localUserAvatar,
    localUserRole,
    currentUser?.designation,
    micEnabled,
    videoEnabled,
    meeting?.meetingType,
    isScreenSharing,
    isLocalSpeaking,
    isHost,
  ]);

  return {
    localStream,
    localParticipantState,
    participants,
    remoteStreams,
    micEnabled,
    videoEnabled,
    isScreenSharing,
    isSpeaking: isLocalSpeaking,
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
