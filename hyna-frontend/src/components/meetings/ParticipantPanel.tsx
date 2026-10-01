// ============================================================
// Hyna Studio Management - In-Meeting Participants Panel
// Active Peer List, Role Indicators, and Media Status
// ============================================================

import React, { useState } from 'react';
import { X, Search, Mic, MicOff, Video, VideoOff, Crown, Shield } from 'lucide-react';
import { Avatar } from '@/components/ui';
import type { ParticipantState } from '@/types/meeting';

export interface ParticipantPanelProps {
  localParticipant: ParticipantState;
  participants: Map<string, ParticipantState>;
  onClose: () => void;
}

export function ParticipantPanel({
  localParticipant,
  participants,
  onClose,
}: ParticipantPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const allList: { participant: ParticipantState; isLocal: boolean }[] = [
    { participant: localParticipant, isLocal: true },
  ];

  participants.forEach(p => {
    allList.push({ participant: p, isLocal: false });
  });

  const filtered = allList.filter(item =>
    item.participant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.participant.designation || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-80 h-full bg-[#141419] border-l border-white/10 flex flex-col z-20 shadow-2xl">
      {/* Panel Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm text-white">Participants</h3>
          <p className="text-[11px] text-white/50">{allList.length} in this call</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-white/10">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search participants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Participants List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filtered.map(({ participant, isLocal }) => (
          <div
            key={participant.memberId}
            className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0 mr-2">
              <div className="relative">
                <Avatar
                  name={participant.name}
                  src={participant.avatar}
                  className="w-8 h-8 text-xs font-semibold border border-white/10"
                />
                {participant.isSpeaking && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-[#141419]" />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-white truncate">
                    {isLocal ? `${participant.name} (You)` : participant.name}
                  </span>
                  {participant.isHost && (
                    <span title="Meeting Host" className="inline-flex items-center">
                      <Crown className="w-3 h-3 text-amber-400 shrink-0" />
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-white/40 truncate block">
                  {participant.designation || participant.role}
                </span>
              </div>
            </div>

            {/* Media status indicators */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className={`p-1 rounded-md ${
                  participant.micEnabled
                    ? 'text-white/70'
                    : 'text-red-400 bg-red-500/10'
                }`}
                title={participant.micEnabled ? 'Microphone active' : 'Microphone muted'}
              >
                {participant.micEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
              </span>

              <span
                className={`p-1 rounded-md ${
                  participant.videoEnabled
                    ? 'text-white/70'
                    : 'text-white/30'
                }`}
                title={participant.videoEnabled ? 'Camera on' : 'Camera off'}
              >
                {participant.videoEnabled ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
