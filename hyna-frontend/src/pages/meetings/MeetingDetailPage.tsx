import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Video } from 'lucide-react';
import { Button, Avatar, Badge, EmptyState, LoadingState } from '@/components/ui';
import { cn, formatDate, formatTime } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import { getMeeting, getUsers, getUserById } from '@/services/api';
import type { Meeting } from '@/types';

export function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentRole, effectiveRole } = useAuthStore();
  const prefix = effectiveRole === 'member' ? '/member' : effectiveRole === 'manager' ? '/manager' : '/admin';
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [isLoading, setIsLoading] = useState(true);


  useEffect(() => {
    let isMounted = true;
    async function load() {
      if (!id) return;
      try {
        await getUsers();
        const m = await getMeeting(id);
        if (isMounted && m) setMeeting(m);
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, [id]);

  if (isLoading) return <LoadingState />;

  if (!meeting) {
    return (
      <div className="page-container">
        <EmptyState title="Meeting not found" action={<Button onClick={() => navigate(`${prefix}/meetings`)}>Go Back</Button>} />
      </div>
    );
  }

  const host = getUserById(meeting.hostId);

  const handleJoinMeeting = () => {
    let roomId = meeting.id;
    if (meeting.meetingLink) {
      const parts = meeting.meetingLink.split('/');
      const last = parts[parts.length - 1];
      if (last) roomId = last;
    }
    navigate(`/meeting/${roomId}`);
  };

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
              <div><span className="text-[var(--color-muted-foreground)]">Host</span><br /><div className="flex items-center gap-2 mt-1">{host && <Avatar name={host.name} size="xs" />}<span className="font-medium">{host?.name || 'Host'}</span></div></div>
              <div><span className="text-[var(--color-muted-foreground)]">Type</span><br /><span className="font-medium capitalize">{meeting.type}</span></div>
            </div>
            {meeting.meetingLink && (
              <Button className="w-full sm:w-auto" onClick={handleJoinMeeting}>
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
