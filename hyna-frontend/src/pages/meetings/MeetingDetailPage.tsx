import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Users, Video, Mic, MicOff, VideoOff, Monitor, Phone, MessageSquare } from 'lucide-react';
import { Button, Avatar, AvatarGroup, Badge, EmptyState } from '@/components/ui';
import { cn, formatDate, formatTime } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import { mockMeetings, getUserById } from '@/mock/data';

export function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentRole } = useAuthStore();
  const prefix = currentRole === 'member' ? '/member' : '/admin';
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  const meeting = mockMeetings.find(m => m.id === id);
  if (!meeting) return <div className="page-container"><EmptyState title="Meeting not found" action={<Button onClick={() => navigate(`${prefix}/meetings`)}>Go Back</Button>} /></div>;

  const host = getUserById(meeting.hostId);

  if (showVideoCall) {
    return (
      <div className="fixed inset-0 z-50 bg-zinc-900 flex flex-col">
        <div className="flex items-center justify-between px-6 py-3 bg-zinc-800">
          <div className="flex items-center gap-3">
            <h2 className="text-white text-sm font-medium">{meeting.title}</h2>
            <Badge className="bg-red-500 text-white animate-pulse-soft">Live</Badge>
          </div>
          <div className="flex items-center gap-2 text-zinc-400 text-sm">
            <Clock className="w-4 h-4" />
            <span>7:42</span>
          </div>
        </div>
        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-2 p-4">
          {meeting.participantIds.slice(0, 6).map((pId, idx) => {
            const participant = getUserById(pId);
            return (
              <div key={pId} className="relative rounded-xl bg-zinc-800 flex items-center justify-center overflow-hidden">
                <Avatar name={participant?.name || ''} size="xl" />
                <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md">
                  {participant?.name?.split(' ')[0]}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-center gap-3 py-4 bg-zinc-800">
          <button onClick={() => setMicOn(!micOn)} className={cn('w-12 h-12 rounded-full flex items-center justify-center transition-colors', micOn ? 'bg-zinc-700 text-white hover:bg-zinc-600' : 'bg-red-500 text-white')}>
            {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>
          <button onClick={() => setCamOn(!camOn)} className={cn('w-12 h-12 rounded-full flex items-center justify-center transition-colors', camOn ? 'bg-zinc-700 text-white hover:bg-zinc-600' : 'bg-red-500 text-white')}>
            {camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>
          <button className="w-12 h-12 rounded-full bg-zinc-700 text-white flex items-center justify-center hover:bg-zinc-600"><Monitor className="w-5 h-5" /></button>
          <button className="w-12 h-12 rounded-full bg-zinc-700 text-white flex items-center justify-center hover:bg-zinc-600"><MessageSquare className="w-5 h-5" /></button>
          <button onClick={() => setShowVideoCall(false)} className="w-12 h-12 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"><Phone className="w-5 h-5 rotate-[135deg]" /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <button onClick={() => navigate(`${prefix}/meetings`)} className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Meetings
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-xl font-semibold">{meeting.title}</h1>
                <p className="text-sm text-[var(--color-muted-foreground)] mt-1 capitalize">{meeting.type} meeting</p>
              </div>
              <Badge className={cn(meeting.status === 'scheduled' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-[var(--color-muted)]')}>{meeting.status}</Badge>
            </div>
            <p className="text-sm text-[var(--color-muted-foreground)] mb-4">{meeting.description}</p>
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div><span className="text-[var(--color-muted-foreground)]">Date</span><br /><span className="font-medium">{formatDate(meeting.date)}</span></div>
              <div><span className="text-[var(--color-muted-foreground)]">Time</span><br /><span className="font-medium">{formatTime(meeting.startTime)} - {formatTime(meeting.endTime)}</span></div>
              <div><span className="text-[var(--color-muted-foreground)]">Host</span><br /><div className="flex items-center gap-2 mt-1">{host && <Avatar name={host.name} size="xs" />}<span className="font-medium">{host?.name}</span></div></div>
              <div><span className="text-[var(--color-muted-foreground)]">Type</span><br /><span className="font-medium capitalize">{meeting.type}</span></div>
            </div>
            {meeting.meetingLink && (
              <Button className="w-full sm:w-auto" onClick={() => setShowVideoCall(true)}>
                <Video className="w-4 h-4 mr-2" /> Join Meeting
              </Button>
            )}
          </div>

          <div className="card p-6">
            <h2 className="text-base font-semibold mb-4">Meeting Notes</h2>
            <EmptyState title="No notes yet" description="Meeting notes will appear here during or after the meeting." />
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-base font-semibold mb-4">Participants ({meeting.participantIds.length})</h2>
            <div className="space-y-2">
              {meeting.participantIds.map(pId => {
                const participant = getUserById(pId);
                if (!participant) return null;
                return (
                  <div key={pId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-muted)] transition-colors">
                    <Avatar name={participant.name} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{participant.name}</p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">{pId === meeting.hostId ? 'Host' : participant.designation}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
