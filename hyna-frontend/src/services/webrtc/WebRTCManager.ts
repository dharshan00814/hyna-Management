import { Device } from 'mediasoup-client';
import { io, Socket } from 'socket.io-client';

export interface WebRTCEventCallbacks {
  onRemoteStream: (peerId: string, stream: MediaStream) => void;
  onRemoteStreamRemoved: (peerId: string) => void;
  onPeerConnectionStateChange: (peerId: string, state: string) => void;
  onIceCandidate: (targetPeerId: string, candidate: RTCIceCandidate) => void;
  onError: (error: Error, context: string) => void;
}

export const DEFAULT_RTC_CONFIG = { iceServers: [] };

export class WebRTCManager {
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  
  private socket: Socket;
  private device: Device;
  private sendTransport: any = null;
  private recvTransport: any = null;
  
  private producers: Map<string, any> = new Map();
  private consumers: Map<string, any> = new Map();
  private remoteStreams: Map<string, MediaStream> = new Map();
  
  private callbacks: WebRTCEventCallbacks;
  private localUserId: string;

  constructor(localUserId: string, callbacks: WebRTCEventCallbacks, config?: any) {
    this.localUserId = localUserId;
    this.callbacks = callbacks;
    this.device = new Device();
    
    // In dev, use localhost:5050. In prod, env var.
    const SFU_URL = import.meta.env.VITE_SFU_SERVER_URL || 'http://localhost:5050';
    this.socket = io(SFU_URL, { transports: ['websocket'] });
  }

  // --- Initialization ---

  public async connectSFU(roomId: string, user: any, micEnabled: boolean, videoEnabled: boolean) {
    return new Promise<void>((resolve, reject) => {
      this.socket.on('connect', async () => {
        try {
          this.callbacks.onPeerConnectionStateChange('server', 'connected');
          
          this.socket.emit('join-room', { roomId, user, micEnabled, videoEnabled });
          
          // Wait for room join to init Mediasoup
          this.socket.once('room-joined', async (data) => {
            await this.initMediasoup();
            resolve();
          });
        } catch (err) {
          reject(err);
        }
      });

      this.socket.on('connect_error', (err) => {
        this.callbacks.onPeerConnectionStateChange('server', 'failed');
        this.callbacks.onError(err, 'socket connect');
      });

      this.socket.on('disconnect', () => {
        this.callbacks.onPeerConnectionStateChange('server', 'disconnected');
      });

      this.socket.on('new-producer', async ({ producerId, socketId, userId, kind }) => {
        if (userId === this.localUserId) return; // Don't consume own
        await this.consumeRemote(producerId, userId);
      });
      
      this.socket.on('participant_left', ({ socketId, userId }) => {
         this.removePeer(userId);
      });
    });
  }

  private request(type: string, data: any = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      this.socket.emit(type, data, (res: any) => {
        if (res?.error) reject(new Error(res.error));
        else resolve(res);
      });
    });
  }

  private async initMediasoup() {
    const rtpCapabilities = await this.request('getRouterRtpCapabilities');
    await this.device.load({ routerRtpCapabilities: rtpCapabilities });

    // Send Transport
    const sendTransportInfo = await this.request('createWebRtcTransport');
    this.sendTransport = this.device.createSendTransport(sendTransportInfo);

    this.sendTransport.on('connect', async ({ dtlsParameters }: any, callback: any, errback: any) => {
      try {
        await this.request('connectWebRtcTransport', { transportId: this.sendTransport.id, dtlsParameters });
        callback();
      } catch (err) { errback(err); }
    });

    this.sendTransport.on('produce', async (parameters: any, callback: any, errback: any) => {
      try {
        const { id } = await this.request('produce', {
          transportId: this.sendTransport.id,
          kind: parameters.kind,
          rtpParameters: parameters.rtpParameters
        });
        callback({ id });
      } catch (err) { errback(err); }
    });

    // Recv Transport
    const recvTransportInfo = await this.request('createWebRtcTransport');
    this.recvTransport = this.device.createRecvTransport(recvTransportInfo);

    this.recvTransport.on('connect', async ({ dtlsParameters }: any, callback: any, errback: any) => {
      try {
        await this.request('connectWebRtcTransport', { transportId: this.recvTransport.id, dtlsParameters });
        callback();
      } catch (err) { errback(err); }
    });

    // Publish current local tracks
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        await this.produceTrack(track);
      }
    }
  }

  // --- Producers (Sending Media) ---

  private async produceTrack(track: MediaStreamTrack) {
    if (!this.sendTransport) return;
    try {
      const producer = await this.sendTransport.produce({ track });
      this.producers.set(track.kind, producer);

      producer.on('trackended', () => {
        producer.close();
        this.producers.delete(track.kind);
      });
      producer.on('transportclose', () => {
        this.producers.delete(track.kind);
      });
    } catch (err) {
      this.callbacks.onError(err as Error, 'produceTrack');
    }
  }

  // --- Consumers (Receiving Media) ---

  private async consumeRemote(producerId: string, peerUserId: string) {
    try {
      const { id, kind, rtpParameters } = await this.request('consume', {
        producerId,
        rtpCapabilities: this.device.rtpCapabilities,
        transportId: this.recvTransport.id
      });

      const consumer = await this.recvTransport.consume({
        id, producerId, kind, rtpParameters
      });
      
      this.consumers.set(consumer.id, consumer);

      let stream = this.remoteStreams.get(peerUserId);
      if (!stream) {
        stream = new MediaStream();
        this.remoteStreams.set(peerUserId, stream);
        this.callbacks.onRemoteStream(peerUserId, stream);
      }
      stream.addTrack(consumer.track);

      await this.request('resume', { consumerId: consumer.id });
    } catch (err) {
      this.callbacks.onError(err as Error, 'consumeRemote');
    }
  }

  // --- Original Interface Methods ---

  public setLocalStream(stream: MediaStream | null) {
    this.localStream = stream;
    if (stream && this.sendTransport) {
      // If transport exists, produce these tracks
      stream.getTracks().forEach(track => {
        if (!this.producers.has(track.kind)) {
          this.produceTrack(track);
        } else {
          // Replace track
          const producer = this.producers.get(track.kind);
          producer?.replaceTrack({ track }).catch((e:any) => console.warn(e));
        }
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
    
    // Replace the video producer's track
    const videoProducer = this.producers.get('video');
    if (videoProducer) {
      await videoProducer.replaceTrack({ track });
    } else {
      await this.produceTrack(track);
    }
    
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
    const videoProducer = this.producers.get('video');
    
    if (videoProducer) {
      if (cameraTrack) {
        await videoProducer.replaceTrack({ track: cameraTrack });
      } else {
        videoProducer.close();
        this.producers.delete('video');
      }
    }
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
    const videoProducer = this.producers.get('video');
    if (videoProducer) {
      if (newTrack) {
        await videoProducer.replaceTrack({ track: newTrack });
      } else {
        videoProducer.close();
        this.producers.delete('video');
      }
    } else if (newTrack) {
      await this.produceTrack(newTrack);
    }
  }

  private removePeer(peerUserId: string) {
    this.remoteStreams.delete(peerUserId);
    this.callbacks.onRemoteStreamRemoved(peerUserId);
  }

  public cleanupPeer(peerId: string): void {
    this.removePeer(peerId);
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
    
    for (const p of this.producers.values()) p.close();
    this.producers.clear();
    
    for (const c of this.consumers.values()) c.close();
    this.consumers.clear();
    
    this.sendTransport?.close();
    this.recvTransport?.close();
    this.socket?.disconnect();
  }

  // Stubs for mesh methods no longer needed by Mediasoup
  public async createOffer(peerId: string): Promise<any> { return null; }
  public async handleOffer(peerId: string, offer: any): Promise<any> { return null; }
  public async handleAnswer(peerId: string, answer: any): Promise<void> {}
  public async addIceCandidate(peerId: string, candidate: any): Promise<void> {}
  public async restartIce(peerId: string): Promise<any> { return null; }
}
