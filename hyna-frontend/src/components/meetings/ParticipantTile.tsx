// ============================================================
// Hyna Studio Management - Participant Tile Component
// Video Stream Rendering, Avatar Fallback, Speaking & Audio Badges
// ============================================================

import React, { useRef, useEffect } from 'react';
import { Mic, MicOff, Video, VideoOff, Pin, PinOff, Radio, MonitorUp } from 'lucide-react';
import { Avatar } from '@/components/ui';
import type { ParticipantState } from '@/types/meeting';

export interface ParticipantTileProps {
  participant: ParticipantState;
  stream: MediaStream | null;
  isLocal: boolean;
  isPinned?: boolean;
  onTogglePin?: (memberId: string) => void;
}

export function ParticipantTile({
  participant,
  stream,
  isLocal,
  isPinned = false,
  onTogglePin,
}: ParticipantTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const hasVideoStream = Boolean(
    stream && 
    stream.getVideoTracks().length > 0 && 
    (participant.videoEnabled || participant.isScreenSharing)
  );

  // Attach stream to video tag
  useEffect(() => {
    if (videoRef.current) {
      if (stream && hasVideoStream) {
        videoRef.current.srcObject = stream;
      } else {
        videoRef.current.srcObject = null;
      }
    }
  }, [stream, participant.videoEnabled, participant.isScreenSharing, hasVideoStream]);

  return (
    <div
      className={`relative w-full h-full min-h-[180px] bg-[#121217] rounded-2xl overflow-hidden border transition-all duration-200 select-none shadow-lg group ${
        participant.isSpeaking
          ? 'border-emerald-500 ring-2 ring-emerald-500/40'
          : 'border-white/10 hover:border-white/20'
      }`}
    >
      {/* Video Stream Element */}
      {hasVideoStream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal} // Always mute local video element to avoid audio feedback
          className={`w-full h-full object-cover ${isLocal && !participant.isScreenSharing ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        /* Avatar Placeholder when camera is disabled or audio meeting */
        <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-b from-[#181820] to-[#101014]">
          <div className="relative">
            <Avatar
              name={participant.name}
              src={participant.avatar}
              className={`w-20 h-20 text-2xl font-bold border-2 transition-all ${
                participant.isSpeaking
                  ? 'border-emerald-400 scale-105 shadow-xl shadow-emerald-500/20'
                  : 'border-white/10'
              }`}
            />
            {participant.isSpeaking && (
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-[#121217]" />
              </span>
            )}
          </div>
          <span className="mt-3 text-sm font-medium text-white/90 truncate max-w-[80%]">
            {participant.name}
          </span>
          <span className="text-[11px] text-white/40 truncate max-w-[80%]">
            {participant.designation || participant.role}
          </span>
          {!participant.videoEnabled && (
            <span className="mt-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-white/5 border border-white/10 text-white/50 flex items-center gap-1.5 shadow-sm">
              <VideoOff className="w-3 h-3 text-red-400" />
              Camera is off
            </span>
          )}
        </div>
      )}

      {/* Top Left: Status Badges (Host / Screen Sharing / Reconnecting) */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
        {participant.isHost && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 backdrop-blur-md text-white border border-white/15">
            Host
          </span>
        )}

        {participant.isScreenSharing && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/20 backdrop-blur-md text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
            <MonitorUp className="w-3 h-3" />
            Screen
          </span>
        )}

        {participant.connectionState === 'connecting' && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 backdrop-blur-md text-amber-300 border border-amber-500/30">
            Connecting...
          </span>
        )}

        {(participant.connectionState === 'disconnected' || participant.connectionState === 'failed') && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/20 backdrop-blur-md text-red-300 border border-red-500/30">
            Reconnecting...
          </span>
        )}
      </div>

      {/* Top Right: Pin Toggle Action */}
      {onTogglePin && (
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button
            type="button"
            onClick={() => onTogglePin(participant.memberId)}
            className={`p-1.5 rounded-lg backdrop-blur-md transition-all ${
              isPinned ? 'bg-white text-black' : 'bg-black/60 text-white/80 hover:text-white'
            }`}
            title={isPinned ? 'Unpin' : 'Pin to dominant view'}
          >
            {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {/* Bottom Bar: Participant Name & Media Icons */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-1.5 truncate mr-2">
          <span className="text-xs font-medium text-white truncate drop-shadow-sm">
            {isLocal ? `${participant.name} (You)` : participant.name}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Mic State Icon */}
          <div
            className={`p-1 rounded-full ${
              participant.micEnabled
                ? participant.isSpeaking 
                  ? 'bg-emerald-500/80 text-white' 
                  : 'bg-black/50 text-white/70'
                : 'bg-red-500/80 text-white'
            }`}
            title={participant.micEnabled ? 'Microphone On' : 'Microphone Muted'}
          >
            {participant.micEnabled ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
          </div>

          {/* Video State Icon */}
          {!participant.videoEnabled && (
            <div className="p-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/30" title="Camera Off">
              <VideoOff className="w-3 h-3" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
