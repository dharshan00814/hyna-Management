// ============================================================
// Hyna Studio Management - Pre-Join Meeting Screen
// Device Diagnostics, Camera/Microphone Testing, and Permissions
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { 
  Video, VideoOff, Mic, MicOff, Volume2, Settings, 
  AlertCircle, ShieldAlert, CheckCircle2, ArrowLeft, Loader2, Sparkles
} from 'lucide-react';
import { Button, Avatar, Badge } from '@/components/ui';
import type { Meeting, MediaDeviceOption } from '@/types/meeting';
import type { User } from '@/types';
import { formatDate, formatTime } from '@/lib/utils';

export interface PreJoinScreenProps {
  meeting: Meeting | null;
  currentUser: User | null;
  guestName?: string;
  onGuestNameChange?: (name: string) => void;
  cameras: MediaDeviceOption[];
  microphones: MediaDeviceOption[];
  speakers: MediaDeviceOption[];
  selectedCameraId: string;
  selectedMicrophoneId: string;
  selectedSpeakerId: string;
  localStream: MediaStream | null;
  permissionError: string | null;
  isAudioOnly: boolean;
  videoEnabled?: boolean;
  audioEnabled?: boolean;
  onSelectCamera: (deviceId: string) => void;
  onSelectMicrophone: (deviceId: string) => void;
  onSelectSpeaker: (deviceId: string) => void;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onJoinMeeting: () => void;
  onCancel: () => void;
}

export function PreJoinScreen({
  meeting,
  currentUser,
  guestName,
  onGuestNameChange,
  cameras,
  microphones,
  speakers,
  selectedCameraId,
  selectedMicrophoneId,
  selectedSpeakerId,
  localStream,
  permissionError,
  isAudioOnly,
  videoEnabled = true,
  audioEnabled = true,
  onSelectCamera,
  onSelectMicrophone,
  onSelectSpeaker,
  onToggleVideo,
  onToggleAudio,
  onJoinMeeting,
  onCancel,
}: PreJoinScreenProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [micVolume, setMicVolume] = useState<number>(0);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  const isVideoEnabled = !isAudioOnly && videoEnabled && Boolean(localStream?.getVideoTracks().length);
  const isAudioEnabled = audioEnabled && Boolean(localStream?.getAudioTracks().length);

  // Attach local stream to video preview element
  useEffect(() => {
    if (videoRef.current && localStream && !isAudioOnly && isVideoEnabled) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream, isAudioOnly, isVideoEnabled]);

  // Audio volume visualizer in pre-join screen
  useEffect(() => {
    if (!localStream || !isAudioEnabled) {
      setMicVolume(0);
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      const source = audioCtx.createMediaStreamSource(localStream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let animId: number;

      const updateMeter = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setMicVolume(Math.min(100, Math.round((avg / 128) * 100)));
        animId = requestAnimationFrame(updateMeter);
      };

      updateMeter();

      return () => {
        cancelAnimationFrame(animId);
        audioCtx.close().catch(() => {});
      };
    } catch (e) {
      console.warn('Pre-join audio meter error:', e);
    }
  }, [localStream, isAudioEnabled]);

  return (
    <div className="min-h-screen w-full bg-[#0a0a0c] text-white flex flex-col justify-between p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
            <span className="font-bold text-sm tracking-wider">H</span>
          </div>
          <div>
            <h2 className="font-semibold text-sm tracking-wide">Hyna Management</h2>
            <p className="text-xs text-white/50">Ready to join your team meeting</p>
          </div>
        </div>

        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onCancel}
          className="text-white/70 hover:text-white hover:bg-white/10 text-xs"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Cancel & Exit
        </Button>
      </div>

      {/* Main Container */}
      <div className="max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 my-auto py-6">
        {/* Left: Video / Audio Preview */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="relative w-full aspect-video bg-[#141419] rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center">
            {isVideoEnabled && localStream ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
            ) : (
              <div className="flex flex-col items-center gap-4 text-center p-6">
                <Avatar 
                  name={currentUser?.name || 'Team Member'} 
                  src={currentUser?.avatar} 
                  className="w-24 h-24 text-2xl font-bold bg-gradient-to-tr from-indigo-600 to-indigo-800 border-2 border-white/20 shadow-xl"
                />
                <div>
                  <p className="font-medium text-base text-white/90">{currentUser?.name || 'You'}</p>
                  <p className="text-xs text-white/50">{currentUser?.designation || 'Software Engineer'}</p>
                  {isAudioOnly ? (
                    <Badge variant="secondary" className="mt-2 text-xs bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
                      Audio-Only Meeting
                    </Badge>
                  ) : (
                    <span className="text-xs text-white/40 mt-1 block">Camera is turned off</span>
                  )}
                </div>
              </div>
            )}

            {/* Mic Level indicator */}
            {isAudioEnabled && (
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                <Mic className="w-3.5 h-3.5 text-emerald-400" />
                <div className="w-16 h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-400 transition-all duration-75"
                    style={{ width: `${micVolume}%` }}
                  />
                </div>
              </div>
            )}

            {/* Media quick controls on preview */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/70 backdrop-blur-md p-2 rounded-full border border-white/10 shadow-xl">
              <button
                type="button"
                onClick={onToggleAudio}
                className={`p-3 rounded-full transition-all ${
                  isAudioEnabled 
                    ? 'bg-white/10 text-white hover:bg-white/20' 
                    : 'bg-red-500/90 text-white hover:bg-red-600'
                }`}
                title={isAudioEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
              >
                {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>

              {!isAudioOnly && (
                <button
                  type="button"
                  onClick={onToggleVideo}
                  className={`p-3 rounded-full transition-all ${
                    isVideoEnabled 
                      ? 'bg-white/10 text-white hover:bg-white/20' 
                      : 'bg-red-500/90 text-white hover:bg-red-600'
                  }`}
                  title={isVideoEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
                >
                  {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                className={`p-3 rounded-full transition-all ${
                  showSettings ? 'bg-indigo-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                title="Device Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Permission error warning */}
          {permissionError && (
            <div className="mt-4 w-full bg-red-500/10 border border-red-500/30 rounded-xl p-3.5 flex items-start gap-3 text-red-200">
              <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <p className="font-semibold text-red-300">Permission Required</p>
                <p className="mt-0.5">{permissionError}</p>
                <p className="mt-1 text-white/50">
                  Tip: Look for the camera/lock icon in your browser address bar and choose "Allow".
                </p>
              </div>
            </div>
          )}

          {/* Device Settings Panel */}
          {showSettings && (
            <div className="mt-4 w-full bg-[#18181f] border border-white/10 rounded-xl p-4 space-y-3.5 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="text-xs font-semibold uppercase tracking-wider text-white/60">Audio & Video Devices</span>
                <button onClick={() => setShowSettings(false)} className="text-xs text-white/40 hover:text-white">Close</button>
              </div>

              {!isAudioOnly && (
                <div>
                  <label className="text-xs text-white/70 block mb-1">Camera</label>
                  <select
                    value={selectedCameraId}
                    onChange={(e) => onSelectCamera(e.target.value)}
                    className="w-full text-xs bg-black/40 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    {cameras.map(c => (
                      <option key={c.deviceId} value={c.deviceId} className="bg-neutral-900 text-white">
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs text-white/70 block mb-1">Microphone</label>
                <select
                  value={selectedMicrophoneId}
                  onChange={(e) => onSelectMicrophone(e.target.value)}
                  className="w-full text-xs bg-black/40 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  {microphones.map(m => (
                    <option key={m.deviceId} value={m.deviceId} className="bg-neutral-900 text-white">
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              {speakers.length > 0 && (
                <div>
                  <label className="text-xs text-white/70 block mb-1">Speaker</label>
                  <select
                    value={selectedSpeakerId}
                    onChange={(e) => onSelectSpeaker(e.target.value)}
                    className="w-full text-xs bg-black/40 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    {speakers.map(s => (
                      <option key={s.deviceId} value={s.deviceId} className="bg-neutral-900 text-white">
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Meeting Details & Join Action */}
        <div className="lg:col-span-5 flex flex-col justify-center bg-[#131317] border border-white/10 rounded-2xl p-6 lg:p-8 shadow-xl">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Session
              </span>
              <span className="text-xs text-white/40 uppercase tracking-wider font-semibold">
                {meeting?.meetingType === 'audio' ? 'Group Audio Call' : 'Group Video Call'}
              </span>
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                {meeting?.title || 'Team Meeting'}
              </h1>
              {meeting?.description && (
                <p className="text-xs text-white/60 mt-1.5 line-clamp-2">
                  {meeting.description}
                </p>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-white/10 text-xs text-white/70">
              <div className="flex items-center justify-between">
                <span className="text-white/40">Date & Time</span>
                <span className="font-medium text-white/90">
                  {meeting?.date ? formatDate(meeting.date) : 'Today'} • {meeting?.startTime ? formatTime(meeting.startTime) : 'Now'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/40">Total Invited</span>
                <span className="font-medium text-white/90">
                  {meeting?.participantIds?.length || 1} team members
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/40">Meeting Type</span>
                <span className="font-medium text-white/90 capitalize">
                  {meeting?.type || 'team'}
                </span>
              </div>
            </div>

            {currentUser ? (
              <div className="p-3.5 bg-white/5 rounded-xl border border-white/5 text-xs text-white/60 space-y-1">
                <p className="font-medium text-white/80">Joining as:</p>
                <div className="flex items-center gap-2 pt-1">
                  <Avatar 
                    name={currentUser.name} 
                    src={currentUser.avatar} 
                    className="w-6 h-6 text-[10px]" 
                  />
                  <span className="font-medium text-white">{currentUser.name}</span>
                  <span className="text-white/40">({currentUser.designation || currentUser.role})</span>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 text-xs text-white/60 space-y-2">
                <label className="font-medium text-white/80 block">Joining as Guest:</label>
                <input
                  type="text"
                  value={guestName || ''}
                  onChange={(e) => onGuestNameChange?.(e.target.value)}
                  placeholder="Enter your name (e.g. Alex)"
                  className="w-full text-xs bg-black/40 border border-white/10 rounded-lg p-2.5 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}

            <div className="pt-4 space-y-3">
              <Button
                variant="primary"
                size="lg"
                onClick={onJoinMeeting}
                className="w-full py-6 text-sm font-semibold rounded-xl bg-white text-black hover:bg-white/90 shadow-xl transition-all"
              >
                Join Meeting Now
              </Button>

              <p className="text-[11px] text-center text-white/40">
                Attendance will automatically be recorded for your work report.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-5xl mx-auto w-full text-center">
        <p className="text-[11px] text-white/30">
          Hyna Studio Secure Peer-to-Peer Media Network • Supabase Realtime Signaling
        </p>
      </div>
    </div>
  );
}
