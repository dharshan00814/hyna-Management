import { io, Socket } from 'socket.io-client';

export interface WebRTCEventCallbacks {
  onRemoteStream: (peerId: string, stream: MediaStream) => void;
  onRemoteStreamUpdate?: (peerId: string, stream: MediaStream) => void;
  onRemoteStreamRemoved: (peerId: string) => void;
  onPeerConnectionStateChange: (peerId: string, state: string) => void;
  onIceCandidate: (targetPeerId: string, candidate: RTCIceCandidate) => void;
  onError: (error: Error, context: string) => void;
}

export const DEFAULT_RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  iceCandidatePoolSize: 10,
};

export class WebRTCManager {
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  
  private socket: Socket;
  
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private remoteStreams: Map<string, MediaStream> = new Map();
  private pendingCandidates: Map<string, RTCIceCandidateInit[]> = new Map();
  
  private callbacks: WebRTCEventCallbacks;
  private localUserId: string;

  constructor(localUserId: string, callbacks: WebRTCEventCallbacks) {
    this.localUserId = localUserId;
    this.callbacks = callbacks;
    
    // Dynamically fallback to the current hostname so LAN testing works on mobile
    const defaultServerUrl = window.location.protocol === 'https:' 
      ? `https://${window.location.hostname}:5050` 
      : `http://${window.location.hostname}:5050`;
      
    const SERVER_URL = import.meta.env.VITE_SFU_SERVER_URL || defaultServerUrl;
    this.socket = io(SERVER_URL, { transports: ['websocket'] });
  }

  // --- Initialization ---

  public async connectMesh(roomId: string, user: any, micEnabled: boolean, videoEnabled: boolean) {
    return new Promise<void>((resolve, reject) => {
      const joinRoom = () => {
        try {
          this.callbacks.onPeerConnectionStateChange('server', 'connected');
          
          this.socket.emit('join-room', { roomId, user, micEnabled, videoEnabled });
          this.socket.once('room-joined', (data) => {
            // Proactively initiate connections to all existing participants
            if (data.participants && Array.isArray(data.participants)) {
              data.participants.forEach((p: any) => {
                this.createOffer(p.socketId).then(offer => {
                  if (offer) {
                    this.socket.emit('offer', { target: p.socketId, sdp: offer });
                  }
                }).catch(err => console.error('[WebRTC] Error creating proactive offer:', err));
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
        this.socket.on('connect', joinRoom);
      }

      this.socket.on('connect_error', (err) => {
        this.callbacks.onPeerConnectionStateChange('server', 'failed');
        this.callbacks.onError(err, 'socket connect');
        reject(err);
      });

      this.socket.on('disconnect', () => {
        this.callbacks.onPeerConnectionStateChange('server', 'disconnected');
      });

      // Handle incoming WebRTC signaling
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

      // When a new participant joins, they will proactively send an offer.
      // We just log it here or perform any non-offer setups if needed.
      this.socket.on('participant_joined', (participant) => {
        console.log(`[WebRTC] Participant joined: ${participant.userId}. Waiting for their offer.`);
      });

      this.socket.on('participant_left', ({ socketId }) => {
        this.cleanupPeer(socketId);
      });
    });
  }

  // --- WebRTC Mesh Logic ---

  public getOrCreatePeerConnection(peerSocketId: string): RTCPeerConnection {
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

    pc.onnegotiationneeded = async () => {
      try {
        if (pc.signalingState !== 'stable') return;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this.socket.emit('offer', { target: peerSocketId, sdp: pc.localDescription });
      } catch (err) {
        console.error('[WebRTC] Error during negotiation for', peerSocketId, err);
      }
    };

    pc.onconnectionstatechange = () => {
      this.callbacks.onPeerConnectionStateChange(peerSocketId, pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.cleanupPeer(peerSocketId);
      }
    };

    pc.ontrack = (event) => {
      // Use the remote stream provided by the browser, or create one if it doesn't exist
      let stream = event.streams && event.streams[0];
      if (!stream) {
        stream = new MediaStream([event.track]);
      }

      this.remoteStreams.set(peerSocketId, stream);
      
      // Always trigger onRemoteStreamUpdate so React replaces the old stream reference
      if (this.callbacks.onRemoteStreamUpdate) {
        this.callbacks.onRemoteStreamUpdate(peerSocketId, stream);
      }
    };

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    return pc;
  }

  public async createOffer(peerSocketId: string): Promise<RTCSessionDescriptionInit | null> {
    try {
      const pc = this.getOrCreatePeerConnection(peerSocketId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      return offer;
    } catch (err) {
      this.callbacks.onError(err as Error, `createOffer to ${peerSocketId}`);
      return null;
    }
  }

  public async handleOffer(peerSocketId: string, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit | null> {
    try {
      const pc = this.getOrCreatePeerConnection(peerSocketId);

      if (pc.signalingState !== 'stable') {
        if (this.socket.id < peerSocketId) {
          await Promise.all([
            pc.setLocalDescription({ type: 'rollback' }),
            pc.setRemoteDescription(new RTCSessionDescription(offer))
          ]);
        } else {
          return null;
        }
      } else {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
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
      if (pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
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
      console.warn(`[WebRTC] Failed to add ICE candidate for ${peerSocketId}`, err);
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

  // --- Original Interface Methods ---

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
      if (videoSender) videoSender.replaceTrack(track).catch(console.warn);
    });
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
    this.pendingCandidates.clear();
    this.remoteStreams.clear();
    this.socket?.disconnect();
  }
}
