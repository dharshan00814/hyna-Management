// ============================================================
// Hyna Studio Management - WebRTC Group Call Manager
// Dedicated PeerConnectionManager for Mesh Video & Audio Calls
// Standard W3C WebRTC with STUN + Free OpenRelay TURN Fallback
// ============================================================

export interface WebRTCEventCallbacks {
  onRemoteStream: (peerId: string, stream: MediaStream) => void;
  onRemoteStreamUpdate?: (peerId: string, stream: MediaStream) => void;
  onRemoteStreamRemoved: (peerId: string) => void;
  onPeerConnectionStateChange: (peerId: string, state: RTCPeerConnectionState) => void;
  onIceCandidate: (targetPeerId: string, candidate: RTCIceCandidate) => void;
  onError: (error: Error, context: string) => void;
}

export const DEFAULT_RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:openrelay.metered.ca:80' },
    // Public OpenRelay TURN fallback for users behind symmetric NATs / strict firewalls
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 10,
};

export class WebRTCManager {
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private peerConnections = new Map<string, RTCPeerConnection>();
  private remoteStreams = new Map<string, MediaStream>();
  private pendingCandidates = new Map<string, RTCIceCandidateInit[]>();
  private callbacks: WebRTCEventCallbacks;
  private rtcConfig: RTCConfiguration;
  private localUserId: string;

  constructor(localUserId: string, callbacks: WebRTCEventCallbacks, config?: RTCConfiguration) {
    this.localUserId = localUserId;
    this.callbacks = callbacks;
    this.rtcConfig = config || DEFAULT_RTC_CONFIG;
  }

  // Set the local MediaStream (camera & microphone)
  public setLocalStream(stream: MediaStream | null) {
    this.localStream = stream;

    // Attach local tracks to all active peer connections
    if (stream) {
      this.peerConnections.forEach((pc, peerId) => {
        const senders = pc.getSenders();
        stream.getTracks().forEach(track => {
          const existingSender = senders.find(s => s.track?.kind === track.kind);
          if (existingSender) {
            existingSender.replaceTrack(track).catch(err => {
              this.callbacks.onError(err, `replaceTrack for ${peerId}`);
            });
          } else {
            try {
              pc.addTrack(track, stream);
            } catch (e) {
              console.warn(`[WebRTC] AddTrack warning for ${peerId}:`, e);
            }
          }
        });
      });
    }
  }

  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  public hasPeerConnection(peerId: string): boolean {
    const pc = this.peerConnections.get(peerId);
    return Boolean(pc && pc.signalingState !== 'closed');
  }

  // Create or retrieve an RTCPeerConnection for a remote peer
  public getOrCreatePeerConnection(peerId: string): RTCPeerConnection {
    let pc = this.peerConnections.get(peerId);
    if (pc && pc.signalingState !== 'closed') {
      return pc;
    }

    pc = new RTCPeerConnection(this.rtcConfig);
    this.peerConnections.set(peerId, pc);

    // Add local tracks to new peer connection
    const currentStream = this.screenStream || this.localStream;
    if (currentStream) {
      currentStream.getTracks().forEach(track => {
        try {
          pc?.addTrack(track, currentStream);
        } catch (e) {
          console.warn(`[WebRTC] Failed to add track for peer ${peerId}:`, e);
        }
      });
    }

    // Handle ICE Candidates generated locally
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.callbacks.onIceCandidate(peerId, event.candidate);
      }
    };

    // Monitor Connection State
    pc.onconnectionstatechange = () => {
      const state = pc?.connectionState || 'disconnected';
      console.log(`[WebRTC] Peer ${peerId} connectionState changed to:`, state);
      this.callbacks.onPeerConnectionStateChange(peerId, state);

      if (state === 'failed') {
        console.warn(`[WebRTC] Connection with ${peerId} failed. Attempting ICE restart.`);
        this.restartIce(peerId).catch(err => {
          this.callbacks.onError(err, `restartIce for ${peerId}`);
        });
      } else if (state === 'closed') {
        this.cleanupPeer(peerId);
      }
    };

    // Handle incoming Remote Media Tracks (Video & Audio)
    pc.ontrack = (event) => {
      console.log(`[WebRTC] Incoming track from ${peerId}: kind=${event.track.kind}, id=${event.track.id}`);

      let remoteStream = this.remoteStreams.get(peerId);
      if (!remoteStream) {
        remoteStream = new MediaStream();
        this.remoteStreams.set(peerId, remoteStream);
      }

      // Add the track directly to remoteStream if not already present
      if (event.track) {
        const existingTrack = remoteStream.getTracks().find(t => t.kind === event.track.kind);
        if (existingTrack && existingTrack.id !== event.track.id) {
          remoteStream.removeTrack(existingTrack);
        }
        if (!remoteStream.getTracks().some(t => t.id === event.track.id)) {
          remoteStream.addTrack(event.track);
        }
      }

      // Also incorporate any other tracks in event.streams if available
      if (event.streams && event.streams[0]) {
        event.streams[0].getTracks().forEach(track => {
          if (!remoteStream!.getTracks().some(t => t.id === track.id)) {
            remoteStream!.addTrack(track);
          }
        });
      }

      // Create a fresh MediaStream wrapper so React detects reference changes and triggers UI updates
      const updatedStream = new MediaStream(remoteStream.getTracks());
      this.remoteStreams.set(peerId, updatedStream);

      // Notify callbacks with the updated remote stream
      this.callbacks.onRemoteStream(peerId, updatedStream);
      if (this.callbacks.onRemoteStreamUpdate) {
        this.callbacks.onRemoteStreamUpdate(peerId, updatedStream);
      }

      // Listen for unmute/mute events on remote track to trigger React re-renders
      event.track.onunmute = () => {
        if (this.callbacks.onRemoteStreamUpdate) {
          const fresh = new MediaStream(remoteStream!.getTracks());
          this.callbacks.onRemoteStreamUpdate(peerId, fresh);
        }
      };

      // Track ended handler
      event.track.onended = () => {
        if (remoteStream && remoteStream.getTracks().length === 0) {
          this.callbacks.onRemoteStreamRemoved(peerId);
        }
      };
    };

    return pc;
  }

  // Create an OFFER to send to a remote peer
  public async createOffer(peerId: string, iceRestart = false): Promise<RTCSessionDescriptionInit> {
    const pc = this.getOrCreatePeerConnection(peerId);
    const offer = await pc.createOffer({
      iceRestart,
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await pc.setLocalDescription(offer);
    return offer;
  }

  // Handle an OFFER received from a remote peer and create an ANSWER
  public async handleOffer(peerId: string, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit | null> {
    const pc = this.getOrCreatePeerConnection(peerId);

    // Offer collision resolution (Polite vs. Impolite pattern)
    if (pc.signalingState !== 'stable') {
      const isPolite = this.localUserId < peerId;
      if (isPolite) {
        console.log(`[WebRTC] Collision detected. Polite peer rolling back local offer for ${peerId}`);
        try {
          await pc.setLocalDescription({ type: 'rollback' } as any);
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
        } catch (e) {
          console.warn(`[WebRTC] Rollback error for ${peerId}:`, e);
          return null;
        }
      } else {
        // Impolite peer ignores the remote offer; the polite peer will answer our local offer
        console.log(`[WebRTC] Collision detected. Impolite peer ignoring remote offer from ${peerId}`);
        return null;
      }
    } else {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
    }

    // Process any queued candidates that arrived before remoteDescription
    await this.processPendingCandidates(peerId);

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return answer;
  }

  // Handle an ANSWER received from a remote peer
  public async handleAnswer(peerId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const pc = this.peerConnections.get(peerId);
    if (!pc) {
      console.warn(`[WebRTC] Received answer for non-existent peer: ${peerId}`);
      return;
    }

    if (pc.signalingState === 'have-local-offer' && answer.type === 'answer') {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      await this.processPendingCandidates(peerId);
    } else {
      console.warn(`[WebRTC] Ignored answer from ${peerId} (signalingState: ${pc.signalingState}, answerType: ${answer.type})`);
    }
  }

  // Add an ICE candidate received from a remote peer
  public async addIceCandidate(peerId: string, candidateInit: RTCIceCandidateInit): Promise<void> {
    if (!candidateInit || !candidateInit.candidate) return;
    const pc = this.peerConnections.get(peerId);

    // If peer connection exists and remote description is already set, add directly
    if (pc && pc.remoteDescription && pc.remoteDescription.type) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidateInit));
      } catch (err) {
        console.warn(`[WebRTC] Failed to add ICE candidate for ${peerId}:`, err);
      }
    } else {
      // Otherwise queue the candidate until setRemoteDescription completes
      const queue = this.pendingCandidates.get(peerId) || [];
      queue.push(candidateInit);
      this.pendingCandidates.set(peerId, queue);
    }
  }

  private async processPendingCandidates(peerId: string): Promise<void> {
    const pc = this.peerConnections.get(peerId);
    const queue = this.pendingCandidates.get(peerId);
    if (!pc || !queue || queue.length === 0) return;

    for (const cand of queue) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch (err) {
        console.warn(`[WebRTC] Error applying queued ICE candidate for ${peerId}:`, err);
      }
    }
    this.pendingCandidates.delete(peerId);
  }

  // ICE restart for reconnection
  public async restartIce(peerId: string): Promise<RTCSessionDescriptionInit | null> {
    try {
      return await this.createOffer(peerId, true);
    } catch (err) {
      this.callbacks.onError(err as Error, `restartIce failed for ${peerId}`);
      return null;
    }
  }

  // Screen Sharing
  public async startScreenShare(displayStream: MediaStream): Promise<void> {
    this.screenStream = displayStream;
    const screenVideoTrack = displayStream.getVideoTracks()[0];
    if (!screenVideoTrack) return;

    // When screen track ends (e.g., user clicks "Stop Sharing" on browser banner)
    screenVideoTrack.onended = () => {
      this.stopScreenShare();
    };

    // Replace video sender track on all active connections
    for (const [peerId, pc] of this.peerConnections) {
      const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (videoSender) {
        await videoSender.replaceTrack(screenVideoTrack).catch(err => {
          this.callbacks.onError(err, `Screen share replaceTrack for ${peerId}`);
        });
      }
    }
  }

  public async stopScreenShare(): Promise<void> {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(t => t.stop());
      this.screenStream = null;
    }

    const cameraVideoTrack = this.localStream?.getVideoTracks()[0] || null;

    // Restore camera video track on all active connections
    for (const [peerId, pc] of this.peerConnections) {
      const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (videoSender && cameraVideoTrack) {
        await videoSender.replaceTrack(cameraVideoTrack).catch(err => {
          this.callbacks.onError(err, `Restore camera replaceTrack for ${peerId}`);
        });
      }
    }
  }

  // Media Mute / Unmute Real-Time Control
  public setAudioEnabled(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  public setVideoEnabled(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  // Replace video track across all active peer connections
  public async replaceVideoTrack(newTrack: MediaStreamTrack | null): Promise<void> {
    for (const [peerId, pc] of this.peerConnections) {
      const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (videoSender) {
        await videoSender.replaceTrack(newTrack).catch(err => {
          this.callbacks.onError(err, `replaceVideoTrack for ${peerId}`);
        });
      }
    }
  }

  // Cleanup a single peer
  public cleanupPeer(peerId: string): void {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.close();
      this.peerConnections.delete(peerId);
    }
    this.remoteStreams.delete(peerId);
    this.pendingCandidates.delete(peerId);
    this.callbacks.onRemoteStreamRemoved(peerId);
  }

  // Teardown everything on meeting leave or component unmount
  public cleanupAll(): void {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(t => t.stop());
      this.screenStream = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }

    this.peerConnections.forEach((pc) => {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.close();
    });
    this.peerConnections.clear();
    this.remoteStreams.clear();
    this.pendingCandidates.clear();
  }
}
