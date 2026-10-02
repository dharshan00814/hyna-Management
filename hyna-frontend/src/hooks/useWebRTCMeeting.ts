import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { WebRTCManager } from '@/services/webrtc/WebRTCManager';
import { updateMeetingStatus } from '@/services/meetingService';
import { toast } from 'sonner';
import type { Meeting, ParticipantState } from '@/types/meeting';
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
  meeting, currentUser, isHost, initialMicEnabled = true, initialVideoEnabled = true,
  selectedCameraId, selectedMicrophoneId, onMeetingEndedByHost,
}: UseWebRTCMeetingProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [micEnabled, setMicEnabled] = useState<boolean>(initialMicEnabled);
  const [videoEnabled, setVideoEnabled] = useState<boolean>(meeting?.meetingType === 'audio' ? false : initialVideoEnabled);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [isLocalSpeaking, setIsLocalSpeaking] = useState<boolean>(false);

  const [participants, setParticipants] = useState<Map<string, ParticipantState>>(new Map());
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [overallConnectionState, setOverallConnectionState] = useState<'connecting' | 'connected' | 'reconnecting' | 'disconnected'>('connecting');
  const [pinnedParticipantId, setPinnedParticipantId] = useState<string | null>(null);

  const webrtcManagerRef = useRef<WebRTCManager | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const localUserId = currentUser?.id || '';
  const localUserName = currentUser?.name || '';
  const localUserAvatar = currentUser?.avatar || '';
  const localUserRole = currentUser?.designation || currentUser?.role || '';

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
      audioCtx.createMediaStreamSource(stream).connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const checkAudioLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        setIsLocalSpeaking((sum / dataArray.length) > 18);
        animFrameRef.current = requestAnimationFrame(checkAudioLevel);
      };
      checkAudioLevel();
    } catch (e) {
      console.warn('[useWebRTCMeeting] Audio analyser setup failed:', e);
    }
  }, []);

  const startMeetingSession = useCallback(async (initialVideo?: boolean, initialAudio?: boolean, preExistingStream?: MediaStream | null) => {
    if (!meeting) return;
    if (!currentUser || !currentUser.id) {
      toast.error('Authentication required. Please sign in to join meetings.');
      setOverallConnectionState('disconnected');
      return;
    }
    const isAudioOnly = meeting.meetingType === 'audio';
    const activeVideo = typeof initialVideo === 'boolean' ? (!isAudioOnly && initialVideo) : (!isAudioOnly && videoEnabled);
    const activeAudio = typeof initialAudio === 'boolean' ? initialAudio : micEnabled;

    setVideoEnabled(activeVideo);
    setMicEnabled(activeAudio);

    try {
      let stream = preExistingStream;
      if (stream) {
        // Clone the stream to force Chromium to bind a new video frame buffer
        // when moving a hardware stream from one <video> tag to another
        stream = new MediaStream(stream.getTracks());
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, ...(selectedMicrophoneId ? { deviceId: { exact: selectedMicrophoneId } } : {}) },
          video: activeVideo ? { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 }, ...(selectedCameraId ? { deviceId: { exact: selectedCameraId } } : {}) } : false,
        });
      }
      
      setLocalStream(stream);
      stream.getAudioTracks().forEach(t => t.enabled = activeAudio);
      stream.getVideoTracks().forEach(t => t.enabled = activeVideo);
      setupSpeechDetection(stream);

      const manager = new WebRTCManager(currentUser.id, {
        onRemoteStream: (peerId, remoteStream) => setRemoteStreams(prev => new Map(prev).set(peerId, remoteStream)),
        onRemoteStreamUpdate: (peerId, remoteStream) => {
          // Force a new map reference so React re-renders with the updated stream tracks
          setRemoteStreams(prev => new Map(prev).set(peerId, remoteStream));
        },
        onRemoteStreamRemoved: (peerId) => setRemoteStreams(prev => { const next = new Map(prev); next.delete(peerId); return next; }),
        onPeerConnectionStateChange: (peerId, state) => {
          if (peerId === 'server') {
            if (state === 'connected') setOverallConnectionState('connected');
            else if (state === 'disconnected' || state === 'failed') setOverallConnectionState('reconnecting');
          }
        },
        onIceCandidate: () => {},
        onError: (err, ctx) => console.error(`[WebRTC Error in ${ctx}]:`, err),
      });

      manager.setLocalStream(stream);
      webrtcManagerRef.current = manager;

      const roomKey = meeting.meetingRoomId || meeting.id;
      const userPayload = { userId: currentUser.id, name: currentUser.name, avatar: currentUser.avatar, role: currentUser.role, designation: currentUser.designation };
      
      const socket = manager.getSocket();

      socket.on('room-joined', (data) => {
        const newMap = new Map<string, ParticipantState>();
        for (const p of data.participants) {
          newMap.set(p.socketId, {
            memberId: p.userId, name: p.name, avatar: p.avatar, role: p.role, designation: p.designation,
            micEnabled: p.micEnabled, videoEnabled: p.videoEnabled, isScreenSharing: p.isScreenSharing,
            isSpeaking: p.isSpeaking, isHost: p.isHost, joinedAt: p.joinedAt, connectionState: 'connected'
          });
        }
        setParticipants(newMap);
      });

      socket.on('participant_joined', (p) => {
        setParticipants(prev => {
          const next = new Map(prev);
          next.set(p.socketId, {
            memberId: p.userId, name: p.name, avatar: p.avatar, role: p.role, designation: p.designation,
            micEnabled: p.micEnabled, videoEnabled: p.videoEnabled, isScreenSharing: p.isScreenSharing,
            isSpeaking: p.isSpeaking, isHost: p.isHost, joinedAt: p.joinedAt, connectionState: 'connected'
          });
          return next;
        });
      });

      socket.on('participant-media-changed', (data) => {
        setParticipants(prev => {
          const next = new Map(prev);
          const p = next.get(data.socketId);
          if (p) next.set(data.socketId, { ...p, micEnabled: data.micEnabled, videoEnabled: data.videoEnabled, isScreenSharing: data.isScreenSharing });
          return next;
        });
      });

      socket.on('participant-speaking-changed', (data) => {
        setParticipants(prev => {
          const next = new Map(prev);
          const p = next.get(data.socketId);
          if (p) next.set(data.socketId, { ...p, isSpeaking: data.isSpeaking });
          return next;
        });
      });

      socket.on('participant_left', (data) => {
        setParticipants(prev => { const next = new Map(prev); next.delete(data.socketId); return next; });
      });

      socket.on('forced-mute', () => {
        setMicEnabled(false);
        manager.setAudioEnabled(false);
        toast.info('You were muted by the host.');
      });

      socket.on('removed-by-host', () => {
        leaveMeeting();
        toast.error('You have been removed from the meeting by the host.');
      });

      socket.on('meeting-ended', () => {
        if (onMeetingEndedByHost) onMeetingEndedByHost();
      });

      await manager.connectMesh(roomKey, userPayload, activeAudio, activeVideo);
      if (meeting.status === 'scheduled') updateMeetingStatus(meeting.id, 'live').catch(() => {});
    } catch (err) {
      console.error(err);
      setOverallConnectionState('disconnected');
    }
  }, [meeting, localUserId, localUserName, micEnabled, videoEnabled, isHost, selectedCameraId, selectedMicrophoneId, setupSpeechDetection, onMeetingEndedByHost]);

  useEffect(() => {
    if (webrtcManagerRef.current && overallConnectionState === 'connected') {
      webrtcManagerRef.current.getSocket().emit('speaking-change', { isSpeaking: isLocalSpeaking });
    }
  }, [isLocalSpeaking, overallConnectionState]);

  const toggleMute = useCallback(() => {
    const nextState = !micEnabled;
    setMicEnabled(nextState);
    webrtcManagerRef.current?.setAudioEnabled(nextState);
    webrtcManagerRef.current?.getSocket().emit('media-toggle', { micEnabled: nextState, videoEnabled, isScreenSharing });
  }, [micEnabled, videoEnabled, isScreenSharing]);

  const toggleCamera = useCallback(async () => {
    if (meeting?.meetingType === 'audio') return;
    const nextState = !videoEnabled;
    if (!nextState) {
      setVideoEnabled(false);
      if (localStream) {
        localStream.getVideoTracks().forEach(t => { t.stop(); localStream.removeTrack(t); });
      }
      await webrtcManagerRef.current?.replaceVideoTrack(null);
      webrtcManagerRef.current?.getSocket().emit('media-toggle', { micEnabled, videoEnabled: false, isScreenSharing });
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 }, ...(selectedCameraId ? { deviceId: { exact: selectedCameraId } } : {}) }, audio: false });
        const newVideoTrack = stream.getVideoTracks()[0];
        if (newVideoTrack && localStream) {
          // Create a completely new stream object so React and the HTMLVideoElement detect the change
          const newStream = new MediaStream([
            ...localStream.getAudioTracks(),
            newVideoTrack
          ]);
          
          setLocalStream(newStream);
          webrtcManagerRef.current?.setLocalStream(newStream);
          
          // Force renegotiation for the new track
          await webrtcManagerRef.current?.replaceVideoTrack(newVideoTrack);
        }
        setVideoEnabled(true);
        webrtcManagerRef.current?.getSocket().emit('media-toggle', { micEnabled, videoEnabled: true, isScreenSharing });
      } catch (err) {
        toast.error('Unable to access camera device.');
      }
    }
  }, [meeting?.meetingType, videoEnabled, micEnabled, isScreenSharing, localStream, selectedCameraId]);

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      await webrtcManagerRef.current?.stopScreenShare();
      setIsScreenSharing(false);
      webrtcManagerRef.current?.getSocket().emit('media-toggle', { micEnabled, videoEnabled, isScreenSharing: false });
    } else {
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        setIsScreenSharing(true);
        await webrtcManagerRef.current?.startScreenShare(displayStream);
        displayStream.getVideoTracks()[0].onended = () => {
          webrtcManagerRef.current?.stopScreenShare();
          setIsScreenSharing(false);
          webrtcManagerRef.current?.getSocket().emit('media-toggle', { micEnabled, videoEnabled, isScreenSharing: false });
        };
        webrtcManagerRef.current?.getSocket().emit('media-toggle', { micEnabled, videoEnabled, isScreenSharing: true });
      } catch (err: any) {
        if (err.name !== 'NotAllowedError') console.error(err);
      }
    }
  }, [isScreenSharing, micEnabled, videoEnabled]);

  const leaveMeeting = useCallback(async () => {
    if (localStream) { localStream.getTracks().forEach(t => t.stop()); setLocalStream(null); }
    webrtcManagerRef.current?.cleanupAll();
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
    setOverallConnectionState('disconnected');
  }, [localStream]);

  const endMeetingForEveryone = useCallback(async () => {
    if (!meeting) return;
    webrtcManagerRef.current?.getSocket().emit('host-end-meeting');
    await updateMeetingStatus(meeting.id, 'completed');
    await leaveMeeting();
  }, [meeting, leaveMeeting]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
      webrtcManagerRef.current?.cleanupAll();
    };
  }, []);

  const localParticipantState: ParticipantState = useMemo(() => ({
    memberId: localUserId, name: localUserName, avatar: localUserAvatar, role: localUserRole, designation: currentUser?.designation,
    micEnabled, videoEnabled: meeting?.meetingType === 'audio' ? false : videoEnabled, isScreenSharing, isSpeaking: isLocalSpeaking,
    isHost, joinedAt: new Date().toISOString(), connectionState: 'connected',
  }), [localUserId, localUserName, localUserAvatar, localUserRole, currentUser?.designation, micEnabled, videoEnabled, meeting?.meetingType, isScreenSharing, isLocalSpeaking, isHost]);

  return {
    localStream, localParticipantState, participants, remoteStreams, micEnabled, videoEnabled, isScreenSharing, isSpeaking: isLocalSpeaking,
    overallConnectionState, pinnedParticipantId, startMeetingSession, toggleMute, toggleCamera, toggleScreenShare, setPinnedParticipantId, leaveMeeting, endMeetingForEveryone,
  };
}
