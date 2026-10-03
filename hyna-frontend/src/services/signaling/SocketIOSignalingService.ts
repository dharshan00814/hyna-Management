// ============================================================
// Hyna Studio Management - Socket.IO WebRTC Signaling Service
// Low-latency WebSocket signaling, host enforcement, room presence
// ============================================================

import { io, Socket } from 'socket.io-client';

export interface SignalingUser {
  userId: string;
  name: string;
  avatar?: string;
  role?: string;
  designation?: string;
}

export interface SocketIOSignalingCallbacks {
  onRoomJoined: (data: {
    roomId: string;
    isHost: boolean;
    hostId: string;
    status: string;
    allowScreenShare: boolean;
    participants: any[];
    yourParticipantInfo: any;
  }) => void;
  onParticipantJoined: (participant: any) => void;
  onParticipantLeft: (data: { socketId: string; userId: string; name: string }) => void;
  onOffer: (callerSocketId: string, sdp: RTCSessionDescriptionInit) => void;
  onAnswer: (responderSocketId: string, sdp: RTCSessionDescriptionInit) => void;
  onIceCandidate: (senderSocketId: string, candidate: RTCIceCandidateInit) => void;
  onParticipantMediaChanged: (data: {
    socketId: string;
    userId: string;
    micEnabled: boolean;
    videoEnabled: boolean;
    isScreenSharing: boolean;
  }) => void;
  onParticipantSpeakingChanged: (data: { socketId: string; userId: string; isSpeaking: boolean }) => void;
  onReceiveMessage: (msg: any) => void;
  onForcedMute: (data: { by: string }) => void;
  onRemovedByHost: (data: { reason: string }) => void;
  onMeetingEnded: (data: { by: string; message: string }) => void;
  onScreenSharePermissionChanged: (data: { allowScreenShare: boolean; by?: string }) => void;
  onError: (err: any) => void;
  onConnectionStateChange: (state: 'connecting' | 'connected' | 'reconnecting' | 'disconnected') => void;
}

export class SocketIOSignalingService {
  private socket: Socket | null = null;
  private serverUrl: string;
  private callbacks: SocketIOSignalingCallbacks;
  private currentRoomId: string = '';
  private currentUser: SignalingUser | null = null;

  constructor(callbacks: SocketIOSignalingCallbacks, serverUrlOverride?: string) {
    this.callbacks = callbacks;
    const envUrl = import.meta.env.VITE_WEBRTC_SERVER_URL;
    if (serverUrlOverride) {
      this.serverUrl = serverUrlOverride;
    } else if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
      this.serverUrl = envUrl.trim();
    } else if (typeof window !== 'undefined') {
      this.serverUrl = `${window.location.protocol}//${window.location.hostname}:5050`;
    } else {
      this.serverUrl = 'http://localhost:5050';
    }
  }

  public async connect({
    roomId,
    user,
    micEnabled = true,
    videoEnabled = true,
  }: {
    roomId: string;
    user: SignalingUser;
    micEnabled?: boolean;
    videoEnabled?: boolean;
  }): Promise<void> {
    this.currentRoomId = roomId;
    this.currentUser = user;

    if (this.socket) {
      this.disconnect();
    }

    this.callbacks.onConnectionStateChange('connecting');

    return new Promise((resolve, reject) => {
      let isSettled = false;

      const connectionTimeout = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          this.callbacks.onConnectionStateChange('disconnected');
          reject(new Error(`Connection to signaling server at ${this.serverUrl} timed out.`));
        }
      }, 7000);

      try {
        const socket = io(this.serverUrl, {
          path: '/socket.io/',
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 10000,
        });

        this.socket = socket;

        socket.on('connect', () => {
          console.log('[SocketIOSignaling] Connected to signaling server with socket ID:', socket.id);
          this.callbacks.onConnectionStateChange('connected');

          // Join the room
          socket.emit('join-room', {
            roomId,
            user,
            micEnabled,
            videoEnabled,
          });
        });

        socket.on('room-joined', (data) => {
          console.log('[SocketIOSignaling] room-joined received:', data);
          if (!isSettled) {
            isSettled = true;
            clearTimeout(connectionTimeout);
            resolve();
          }
          this.callbacks.onRoomJoined(data);
        });

        socket.on('participant_joined', (participant) => {
          console.log('[SocketIOSignaling] participant_joined:', participant);
          this.callbacks.onParticipantJoined(participant);
        });

        socket.on('participant_left', (data) => {
          console.log('[SocketIOSignaling] participant_left:', data);
          this.callbacks.onParticipantLeft(data);
        });

        socket.on('offer', ({ callerSocketId, sdp }) => {
          this.callbacks.onOffer(callerSocketId, sdp);
        });

        socket.on('answer', ({ responderSocketId, sdp }) => {
          this.callbacks.onAnswer(responderSocketId, sdp);
        });

        socket.on('ice-candidate', ({ senderSocketId, candidate }) => {
          this.callbacks.onIceCandidate(senderSocketId, candidate);
        });

        socket.on('participant-media-changed', (data) => {
          this.callbacks.onParticipantMediaChanged(data);
        });

        socket.on('participant-speaking-changed', (data) => {
          this.callbacks.onParticipantSpeakingChanged(data);
        });

        socket.on('receive-message', (msg) => {
          this.callbacks.onReceiveMessage(msg);
        });

        socket.on('forced-mute', (data) => {
          this.callbacks.onForcedMute(data);
        });

        socket.on('removed-by-host', (data) => {
          this.callbacks.onRemovedByHost(data);
        });

        socket.on('meeting-ended', (data) => {
          this.callbacks.onMeetingEnded(data);
        });

        socket.on('screenshare-permission-changed', (data) => {
          this.callbacks.onScreenSharePermissionChanged(data);
        });

        socket.on('connect_error', (err) => {
          console.warn('[SocketIOSignaling] connect_error:', err.message);
          this.callbacks.onConnectionStateChange('reconnecting');
          if (!isSettled) {
            isSettled = true;
            clearTimeout(connectionTimeout);
            reject(err);
          }
        });

        socket.on('disconnect', (reason) => {
          console.log('[SocketIOSignaling] Disconnected:', reason);
          this.callbacks.onConnectionStateChange('disconnected');
        });

        socket.on('error', (err) => {
          console.error('[SocketIOSignaling] server error:', err);
          this.callbacks.onError(err);
        });

      } catch (err) {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(connectionTimeout);
          reject(err);
        }
      }
    });
  }

  public sendOffer(targetSocketId: string, sdp: RTCSessionDescriptionInit): void {
    if (this.socket?.connected) {
      this.socket.emit('offer', { target: targetSocketId, sdp });
    }
  }

  public sendAnswer(targetSocketId: string, sdp: RTCSessionDescriptionInit): void {
    if (this.socket?.connected) {
      this.socket.emit('answer', { target: targetSocketId, sdp });
    }
  }

  public sendIceCandidate(targetSocketId: string, candidate: RTCIceCandidateInit): void {
    if (this.socket?.connected) {
      this.socket.emit('ice-candidate', { target: targetSocketId, candidate });
    }
  }

  public sendMediaToggle({
    micEnabled,
    videoEnabled,
    isScreenSharing,
  }: {
    micEnabled?: boolean;
    videoEnabled?: boolean;
    isScreenSharing?: boolean;
  }): void {
    if (this.socket?.connected) {
      this.socket.emit('media-toggle', { micEnabled, videoEnabled, isScreenSharing });
    }
  }

  public sendSpeakingChange(isSpeaking: boolean): void {
    if (this.socket?.connected) {
      this.socket.emit('speaking-change', { isSpeaking });
    }
  }

  public sendMessage(messagePayload: {
    meetingId: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    senderRole?: string;
    message: string;
  }): void {
    if (this.socket?.connected) {
      this.socket.emit('send-message', messagePayload);
    }
  }

  // Host Controls
  public muteParticipant(targetSocketId: string, targetUserId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('host-mute-participant', { targetSocketId, targetUserId });
    }
  }

  public muteAllParticipants(): void {
    if (this.socket?.connected) {
      this.socket.emit('host-mute-all');
    }
  }

  public removeParticipant(targetSocketId: string, targetUserId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('host-remove-participant', { targetSocketId, targetUserId });
    }
  }

  public toggleScreenSharePermission(allowed: boolean): void {
    if (this.socket?.connected) {
      this.socket.emit('host-toggle-screenshare-permission', { allowed });
    }
  }

  public endMeeting(): void {
    if (this.socket?.connected) {
      this.socket.emit('host-end-meeting');
    }
  }

  public isConnected(): boolean {
    return Boolean(this.socket?.connected);
  }

  public getSocketId(): string | null {
    return this.socket?.id || null;
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.callbacks.onConnectionStateChange('disconnected');
  }
}
