import { io, Socket } from 'socket.io-client';

export interface WebRTCEventCallbacks {
  onRemoteStream: (peerId: string, stream: MediaStream) => void;
  onRemoteStreamUpdate?: (peerId: string, stream: MediaStream) => void;
  onRemoteStreamRemoved: (peerId: string) => void;
  onPeerConnectionStateChange: (peerId: string, state: string) => void;
  onIceCandidate: (targetPeerId: string, candidate: RTCIceCandidate) => void;
  onError: (error: Error, context: string) => void;
}

const turnUrls = import.meta.env.VITE_TURN_URL;
const turnUsername = import.meta.env.VITE_TURN_USERNAME;
const turnCredential = import.meta.env.VITE_TURN_PASSWORD || import.meta.env.VITE_TURN_CREDENTIAL;

export const DEFAULT_RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    ...(turnUrls ? [{
      urls: turnUrls.split(','),
      username: turnUsername,
      credential: turnCredential,
    }] : [])
  ],
  iceCandidatePoolSize: 10,
};

export class WebRTCManager {
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  
  private socket: Socket;
  
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private peerUserIdMap: Map<string, string> = new Map(); // socketId -> userId
  private remoteStreams: Map<string, MediaStream> = new Map();
  private pendingCandidates: Map<string, RTCIceCandidateInit[]> = new Map();
  
  // Perfect Negotiation State Maps
  private makingOfferMap: Map<string, boolean> = new Map();
  private ignoreOfferMap: Map<string, boolean> = new Map();
  
  private callbacks: WebRTCEventCallbacks;
  private localUserId: string;

  constructor(localUserId: string, callbacks: WebRTCEventCallbacks) {
    this.localUserId = localUserId;
    this.callbacks = callbacks;
    
    // Resolve signaling server URL dynamically from environment or fallback
    const hostname = (typeof window !== 'undefined' && window.location && window.location.hostname) ? window.location.hostname : 'localhost';
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.');
    const defaultServerUrl = isLocal 
      ? `http://${hostname}:5050` 
      : `https://${hostname}`;
      
    const SERVER_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_SFU_SERVER_URL || defaultServerUrl;
    this.socket = io(SERVER_URL, {
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    // Comprehensive Socket.IO Connection Diagnostic & State Listeners
    this.socket.on('connect', () => {
      console.log('[Socket.IO] CONNECTED:', this.socket.id);
      this.callbacks.onPeerConnectionStateChange('server', 'connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket.IO] DISCONNECTED:', reason);
      this.callbacks.onPeerConnectionStateChange('server', 'disconnected');
    });

    this.socket.on('connect_error', (error: any) => {
      console.error('[Socket.IO] CONNECT ERROR:', {
        message: error?.message,
        description: error?.description,
        type: error?.type,
      });
      this.callbacks.onPeerConnectionStateChange('server', 'failed');
      this.callbacks.onError(error, 'socket connect');
    });

    this.socket.io.on('reconnect_attempt', (attempt) => {
      console.log('[Socket.IO] RECONNECT ATTEMPT:', attempt);
    });

    this.socket.io.on('reconnect', (attempt) => {
      console.log('[Socket.IO] RECONNECTED after attempt:', attempt);
      this.callbacks.onPeerConnectionStateChange('server', 'connected');
    });
  }

  // Determine deterministic negotiation role (Polite vs Impolite)
  private isPolitePeer(peerSocketId: string, peerUserId?: string): boolean {
    const remoteId = peerUserId || this.peerUserIdMap.get(peerSocketId) || peerSocketId;
    return this.localUserId > remoteId;
  }

  // --- Initialization & Room Signaling ---

  public async connectMesh(roomId: string, user: any, micEnabled: boolean, videoEnabled: boolean) {
    return new Promise<void>((resolve, reject) => {
      // Remove any lingering listeners from previous connections
      this.socket.off('room-joined');
      this.socket.off('offer');
      this.socket.off('answer');
      this.socket.off('ice-candidate');
      this.socket.off('participant_joined');
      this.socket.off('participant_left');

      const joinRoom = () => {
        try {
          this.callbacks.onPeerConnectionStateChange('server', 'connected');
          
          this.socket.emit('join-room', { roomId, user, micEnabled, videoEnabled });
          this.socket.once('room-joined', (data) => {
            // Newly joined participant creates offers to all existing room participants
            if (data.participants && Array.isArray(data.participants)) {
              data.participants.forEach((p: any) => {
                if (p.socketId) {
                  this.peerUserIdMap.set(p.socketId, p.userId);
                  this.createOffer(p.socketId, p.userId).then(offer => {
                    if (offer) {
                      this.socket.emit('offer', { target: p.socketId, sdp: offer });
                    }
                  }).catch(err => console.error('[WebRTC] Error creating proactive offer:', err));
                }
              });
            }
            resolve();
          });
        } catch (err) {
          reject(err);
        }
      };

      if (this.socket.connected) {
        joinRoom();
      } else {
        this.socket.once('connect', joinRoom);
      }

      // Handle incoming WebRTC signaling events
      this.socket.on('offer', async ({ callerSocketId, sdp }) => {
        try {
          const answer = await this.handleOffer(callerSocketId, sdp);
          if (answer) {
            this.socket.emit('answer', { target: callerSocketId, sdp: answer });
          }
        } catch (err) {
          console.error('[WebRTC] Error handling offer:', err);
        }
      });

      this.socket.on('answer', async ({ responderSocketId, sdp }) => {
        try {
          await this.handleAnswer(responderSocketId, sdp);
        } catch (err) {
          console.error('[WebRTC] Error handling answer:', err);
        }
      });

      this.socket.on('ice-candidate', async ({ senderSocketId, candidate }) => {
        try {
          await this.addIceCandidate(senderSocketId, candidate);
        } catch (err) {
          console.error('[WebRTC] Error handling ice candidate:', err);
        }
      });

      this.socket.on('participant_joined', (participant) => {
        if (participant?.socketId) {
          this.peerUserIdMap.set(participant.socketId, participant.userId);
          // Register peer connection in advance so we're ready to receive their offer
          this.getOrCreatePeerConnection(participant.socketId, participant.userId);
        }
      });

      this.socket.on('participant_left', ({ socketId }) => {
        this.cleanupPeer(socketId);
      });
    });
  }

  // --- WebRTC Peer Connection Core ---

  public getOrCreatePeerConnection(peerSocketId: string, peerUserId?: string): RTCPeerConnection {
    if (peerUserId) {
      this.peerUserIdMap.set(peerSocketId, peerUserId);
    }

    if (this.peerConnections.has(peerSocketId)) {
      return this.peerConnections.get(peerSocketId)!;
    }

    const pc = new RTCPeerConnection(DEFAULT_RTC_CONFIG);
    this.peerConnections.set(peerSocketId, pc);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('ice-candidate', {
          target: peerSocketId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    // Perfect negotiation handler for dynamic changes
    pc.onnegotiationneeded = async () => {
      try {
        this.makingOfferMap.set(peerSocketId, true);
        const offer = await pc.createOffer();
        if (pc.signalingState !== 'stable') return;
        await pc.setLocalDescription(offer);
        this.socket.emit('offer', { target: peerSocketId, sdp: pc.localDescription });
      } catch (err) {
        console.error('[WebRTC] Error during negotiation for', peerSocketId, err);
      } finally {
        this.makingOfferMap.set(peerSocketId, false);
      }
    };

    pc.onconnectionstatechange = () => {
      this.callbacks.onPeerConnectionStateChange(peerSocketId, pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.cleanupPeer(peerSocketId);
      }
    };

    pc.ontrack = (event) => {
      let stream = this.remoteStreams.get(peerSocketId);

      if (!stream) {
        stream = event.streams && event.streams.length > 0 ? event.streams[0] : new MediaStream();
        this.remoteStreams.set(peerSocketId, stream);
      }

      if (!stream.getTracks().find(t => t.id === event.track.id)) {
        stream.addTrack(event.track);
      }

      // Create a fresh MediaStream wrapper so React detects reference changes and triggers UI updates
      const updatedStream = new MediaStream(stream.getTracks());
      this.remoteStreams.set(peerSocketId, updatedStream);

      // Trigger both callbacks
      this.callbacks.onRemoteStream(peerSocketId, updatedStream);
      if (this.callbacks.onRemoteStreamUpdate) {
        this.callbacks.onRemoteStreamUpdate(peerSocketId, updatedStream);
      }
    };

    // Add local tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    return pc;
  }

  public async createOffer(peerSocketId: string, peerUserId?: string): Promise<RTCSessionDescriptionInit | null> {
    try {
      const pc = this.getOrCreatePeerConnection(peerSocketId, peerUserId);
      this.makingOfferMap.set(peerSocketId, true);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      return offer;
    } catch (err) {
      this.callbacks.onError(err as Error, `createOffer to ${peerSocketId}`);
      return null;
    } finally {
      this.makingOfferMap.set(peerSocketId, false);
    }
  }

  public async handleOffer(peerSocketId: string, offer: RTCSessionDescriptionInit, peerUserId?: string): Promise<RTCSessionDescriptionInit | null> {
    try {
      const pc = this.getOrCreatePeerConnection(peerSocketId, peerUserId);
      const isPolite = this.isPolitePeer(peerSocketId, peerUserId);
      const isMakingOffer = this.makingOfferMap.get(peerSocketId) || false;

      const offerCollision = (offer.type === 'offer') && (isMakingOffer || pc.signalingState !== 'stable');

      this.ignoreOfferMap.set(peerSocketId, !isPolite && offerCollision);

      if (this.ignoreOfferMap.get(peerSocketId)) {
        console.log(`[WebRTC] Collision detected: Impolite peer ignoring offer from ${peerSocketId}`);
        return null;
      }

      if (offerCollision && isPolite) {
        console.log(`[WebRTC] Collision detected: Polite peer rolling back offer for ${peerSocketId}`);
        await Promise.all([
          pc.setLocalDescription({ type: 'rollback' }),
          pc.setRemoteDescription(offer)
        ]);
      } else {
        await pc.setRemoteDescription(offer);
      }

      await this.processPendingCandidates(peerSocketId);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      return answer;
    } catch (err) {
      this.callbacks.onError(err as Error, `handleOffer from ${peerSocketId}`);
      return null;
    }
  }

  public async handleAnswer(peerSocketId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    try {
      const pc = this.peerConnections.get(peerSocketId);
      if (!pc) return;

      if (this.ignoreOfferMap.get(peerSocketId)) {
        this.ignoreOfferMap.set(peerSocketId, false);
        return;
      }

      if (pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(answer);
        await this.processPendingCandidates(peerSocketId);
      }
    } catch (err) {
      this.callbacks.onError(err as Error, `handleAnswer from ${peerSocketId}`);
    }
  }

  public async addIceCandidate(peerSocketId: string, candidateInit: RTCIceCandidateInit): Promise<void> {
    try {
      const pc = this.peerConnections.get(peerSocketId);
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        await pc.addIceCandidate(new RTCIceCandidate(candidateInit));
      } else {
        const queue = this.pendingCandidates.get(peerSocketId) || [];
        queue.push(candidateInit);
        this.pendingCandidates.set(peerSocketId, queue);
      }
    } catch (err) {
      if (!this.ignoreOfferMap.get(peerSocketId)) {
        console.warn(`[WebRTC] Failed to add ICE candidate for ${peerSocketId}`, err);
      }
    }
  }

  private async processPendingCandidates(peerSocketId: string) {
    const pc = this.peerConnections.get(peerSocketId);
    if (!pc || !pc.remoteDescription) return;

    const queue = this.pendingCandidates.get(peerSocketId);
    if (queue && queue.length > 0) {
      for (const candidate of queue) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn(`[WebRTC] Failed to add queued ICE candidate for ${peerSocketId}`, err);
        }
      }
      this.pendingCandidates.delete(peerSocketId);
    }
  }

  // --- Local Stream & Media Control Methods ---

  public setLocalStream(stream: MediaStream | null) {
    this.localStream = stream;
    if (stream) {
      this.peerConnections.forEach(pc => {
        stream.getTracks().forEach(track => {
          const sender = pc.getSenders().find(s => s.track?.kind === track.kind);
          if (sender) {
            sender.replaceTrack(track).catch(e => console.warn(e));
          } else {
            pc.addTrack(track, stream);
          }
        });
      });
    }
  }

  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  public async startScreenShare(displayStream: MediaStream): Promise<void> {
    this.screenStream = displayStream;
    const track = displayStream.getVideoTracks()[0];
    if (!track) return;
    
    this.peerConnections.forEach(pc => {
      const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (videoSender) {
        videoSender.replaceTrack(track).catch(console.warn);
      } else if (this.localStream) {
        pc.addTrack(track, this.localStream);
      }
    });

    track.onended = () => {
      this.stopScreenShare();
    };
  }

  public async stopScreenShare(): Promise<void> {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(t => t.stop());
      this.screenStream = null;
    }
    const cameraTrack = this.localStream?.getVideoTracks()[0];
    this.peerConnections.forEach(pc => {
      const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (videoSender) {
        if (cameraTrack) {
          videoSender.replaceTrack(cameraTrack).catch(console.warn);
        } else {
          pc.removeTrack(videoSender);
        }
      }
    });
  }

  public setAudioEnabled(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(t => t.enabled = enabled);
    }
  }

  public setVideoEnabled(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(t => t.enabled = enabled);
    }
  }

  public async replaceVideoTrack(newTrack: MediaStreamTrack | null): Promise<void> {
    this.peerConnections.forEach(pc => {
      const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (videoSender) {
        if (newTrack) {
          videoSender.replaceTrack(newTrack).catch(console.warn);
        } else {
          pc.removeTrack(videoSender);
        }
      } else if (newTrack && this.localStream) {
        pc.addTrack(newTrack, this.localStream);
      }
    });
  }

  public cleanupPeer(peerId: string): void {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerId);
    }
    this.peerUserIdMap.delete(peerId);
    this.makingOfferMap.delete(peerId);
    this.ignoreOfferMap.delete(peerId);
    this.pendingCandidates.delete(peerId);
    this.remoteStreams.delete(peerId);
    this.callbacks.onRemoteStreamRemoved(peerId);
  }

  public getSocket() {
    return this.socket;
  }

  public cleanupAll(): void {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(t => t.stop());
      this.screenStream = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }
    
    this.peerConnections.forEach(pc => pc.close());
    this.peerConnections.clear();
    this.peerUserIdMap.clear();
    this.makingOfferMap.clear();
    this.ignoreOfferMap.clear();
    this.pendingCandidates.clear();
    this.remoteStreams.clear();
    this.socket?.disconnect();
  }
}
