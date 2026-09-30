// ============================================================
// Hyna Studio Management - WebRTC Group Call Manager
// Dedicated PeerConnectionManager for Mesh Video & Audio Calls
// Designed so the media layer can easily be replaced with an SFU
// ============================================================

export interface WebRTCEventCallbacks {
  onRemoteStream: (peerId: string, stream: MediaStream) => void;
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
    { urls: 'stun:stun.cloudflare.com:3478' },
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
            pc.addTrack(track, stream);
          }
        });
      });
    }
  }

  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  // Create an RTCPeerConnection for a remote peer
  private getOrCreatePeerConnection(peerId: string): RTCPeerConnection {
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

    // Handle incoming Remote Media Tracks
    pc.ontrack = (event) => {
      let remoteStream = this.remoteStreams.get(peerId);
      if (!remoteStream) {
        remoteStream = new MediaStream();
        this.remoteStreams.set(peerId, remoteStream);
      }

      event.streams[0]?.getTracks().forEach(track => {
        if (!remoteStream?.getTracks().some(t => t.id === track.id)) {
          remoteStream?.addTrack(track);
        }
      });

      // Notify callback with the remote stream
      this.callbacks.onRemoteStream(peerId, remoteStream);

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
  public async handleOffer(peerId: string, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    const pc = this.getOrCreatePeerConnection(peerId);

    // If there is an offer collision in have-local-offer state
    if (pc.signalingState !== 'stable') {
      if (this.localUserId < peerId) {
        // We are polite: rollback local offer to accept remote offer
        await Promise.all([
          pc.setLocalDescription({ type: 'rollback' } as any).catch(() => {}),
          pc.setRemoteDescription(new RTCSessionDescription(offer)),
        ]);
      } else {
        // We are impolite: ignore remote offer
        return pc.localDescription!;
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

    if (pc.signalingState === 'have-local-offer') {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      await this.processPendingCandidates(peerId);
    }
  }

  // Add an ICE candidate received from a remote peer
  public async addIceCandidate(peerId: string, candidateInit: RTCIceCandidateInit): Promise<void> {
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
    // Stop screen share tracks
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(t => t.stop());
      this.screenStream = null;
    }

    // Stop local media tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }

    // Close all peer connections
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
