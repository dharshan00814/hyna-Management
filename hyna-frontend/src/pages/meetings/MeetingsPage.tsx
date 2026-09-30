import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Clock, Video, Users, Check, Copy, ExternalLink, Link2 } from 'lucide-react';
import { Button, Avatar, Badge, Modal, Input, Textarea, Select, EmptyState, LoadingState } from '@/components/ui';
import { cn, formatDate, formatTime } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import { getMeetings, createMeeting, getUsers, getUserById } from '@/services/api';
import { toast } from 'sonner';
import type { Meeting, MeetingType, User } from '@/types';

export function MeetingsPage() {
  const navigate = useNavigate();
  const { currentRole, currentUser, effectiveRole } = useAuthStore();
  const prefix = effectiveRole === 'member' ? '/member' : effectiveRole === 'manager' ? '/manager' : '/admin';
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');

  const [createdLink, setCreatedLink] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showLinkOption, setShowLinkOption] = useState(false);

  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    type: 'team' as MeetingType,
    startTime: '10:00',
    endTime: '11:00',
    meetingLink: '',
  });

  const loadData = async () => {
    try {
      const usersList = await getUsers();
      setAllUsers(usersList);
      const ms = await getMeetings();
      setMeetings(ms);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateMeeting = async () => {
    if (!newMeeting.title.trim()) {
      toast.error('Please enter a meeting title');
      return;
    }
    try {
      const hostId = currentUser?.id || 'u1';
      const participants = Array.from(new Set([hostId, ...selectedParticipantIds]));
      const finalMeetingLink = newMeeting.meetingLink.trim();

      const created = await createMeeting({
        ...newMeeting,
        meetingLink: finalMeetingLink,
        hostId,
        participantIds: participants,
      });
      setMeetings(prev => [...prev, created]);
      setCreatedLink(finalMeetingLink);
      setShowCreate(false);
      if (finalMeetingLink) {
        setShowSuccess(true);
      }
      setSelectedParticipantIds([]);
      setNewMeeting({
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        type: 'team',
        startTime: '10:00',
        endTime: '11:00',
        meetingLink: '',
      });
      toast.success('Meeting created successfully!');
    } catch (err) {
      toast.error('Failed to create meeting');
    }
  };


  const todayStr = new Date().toISOString().split('T')[0];
  const userMeetings = currentRole === 'member'
    ? meetings.filter(m => m.participantIds.includes(currentUser?.id || ''))
    : meetings;

  const filtered = userMeetings.filter(m => {
    if (filter === 'upcoming') return m.date >= todayStr;
    if (filter === 'past') return m.date < todayStr;
    return true;
  }).sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));

  if (isLoading) return <LoadingState />;

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Meetings</h1>
          <p className="page-description">{filtered.length} meetings</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 p-1 rounded-lg bg-[var(--color-muted)]">
            {(['upcoming', 'past', 'all'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn('px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors', filter === f ? 'bg-[var(--color-card)] shadow-sm' : 'text-[var(--color-muted-foreground)]')}
              >
                {f}
              </button>
            ))}
          </div>
          {currentRole !== 'member' && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-1" /> New Meeting
            </Button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No meetings" description="No meetings to display." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((meeting, idx) => {
            const host = getUserById(meeting.hostId);
            const isToday = meeting.date === todayStr;
            return (
              <div
                key={meeting.id}
                className={cn('card p-5 card-hover cursor-pointer animate-slide-up', `stagger-${Math.min(idx + 1, 5)}`)}
                onClick={() => navigate(`${prefix}/meetings/${meeting.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold">{meeting.title}</h3>
                    <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5 capitalize">{meeting.type} meeting</p>
                  </div>
                  <Badge className={isToday ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-[var(--color-muted)] text-[var(--color-foreground)]'}>
                    {isToday ? 'Today' : formatDate(meeting.date)}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)] mb-3">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatTime(meeting.startTime)} - {formatTime(meeting.endTime)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)] mb-3">
                  <Users className="w-3.5 h-3.5" />
                  <span>{meeting.participantIds.length} participants</span>
                  {meeting.isRecurring && <Badge className="bg-[var(--color-muted)] text-[var(--color-muted-foreground)]">Recurring</Badge>}
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--color-border)]">
                  <div className="flex items-center gap-2">
                    {host && <Avatar name={host.name} size="xs" />}
                    <span className="text-xs text-[var(--color-muted-foreground)]">{host?.name || 'Host'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {meeting.meetingLink && meeting.meetingLink.includes('meet.google.com') && (
                      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] py-0 px-1.5 font-normal">
                        Google Meet
                      </Badge>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        if (meeting.meetingLink && (meeting.meetingLink.startsWith('http://') || meeting.meetingLink.startsWith('https://'))) {
                          window.open(meeting.meetingLink, '_blank', 'noopener,noreferrer');
                        } else {
                          navigate(`${prefix}/meetings/${meeting.id}`);
                        }
                      }}
                      className={cn(
                        "text-xs h-7",
                        meeting.meetingLink?.includes('meet.google.com') && "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                      )}
                    >
                      <Video className="w-3.5 h-3.5 mr-1" />
                      {meeting.meetingLink?.includes('meet.google.com') ? 'Google Meet' : 'Join'}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="New Meeting"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreateMeeting}>Create Meeting</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Meeting Title"
            placeholder="e.g., Weekly Team Meeting"
            value={newMeeting.title}
            onChange={(e) => setNewMeeting(m => ({ ...m, title: e.target.value }))}
            autoFocus
          />

          {/* ADD MEETING LINK (GOOGLE MEET) SECTION - PROMINENT AT TOP */}
          <div className="p-4 rounded-xl border-2 border-indigo-500/20 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                <Link2 className="w-4 h-4 text-indigo-600" /> Add Meeting Link (Google Meet)
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-white dark:bg-zinc-800 hover:bg-emerald-50 shrink-0 font-medium"
                onClick={() => window.open('https://meet.google.com/new', '_blank')}
              >
                <ExternalLink className="w-3.5 h-3.5 text-emerald-600" /> Create Google Meet Link
              </Button>
            </div>
            <Input
              placeholder="Paste Google Meet link: https://meet.google.com/abc-defg-hij"
              value={newMeeting.meetingLink}
              onChange={(e) => setNewMeeting(m => ({ ...m, meetingLink: e.target.value }))}
              className="bg-white dark:bg-zinc-900 border-indigo-200 dark:border-indigo-900/50 text-xs font-mono"
            />
            <div className="flex items-center justify-between text-[11px] text-[var(--color-muted-foreground)]">
              <span>Paste your Google Meet link here, or click <strong>Create Google Meet Link</strong> to start one.</span>
              {newMeeting.meetingLink && newMeeting.meetingLink.includes('meet.google.com') && (
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] py-0 font-medium">
                  Google Meet
                </Badge>
              )}
            </div>
          </div>

          <Textarea
            label="Description"
            placeholder="Meeting agenda..."
            rows={2}
            value={newMeeting.description}
            onChange={(e) => setNewMeeting(m => ({ ...m, description: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date"
              type="date"
              value={newMeeting.date}
              onChange={(e) => setNewMeeting(m => ({ ...m, date: e.target.value }))}
            />
            <Select
              label="Type"
              value={newMeeting.type}
              onChange={(val) => setNewMeeting(m => ({ ...m, type: val as MeetingType }))}
              options={[
                { value: 'team', label: 'Team' },
                { value: 'standup', label: 'Standup' },
                { value: 'review', label: 'Review' },
                { value: 'planning', label: 'Planning' },
                { value: 'one-on-one', label: '1:1' },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Time"
              type="time"
              value={newMeeting.startTime}
              onChange={(e) => setNewMeeting(m => ({ ...m, startTime: e.target.value }))}
            />
            <Input
              label="End Time"
              type="time"
              value={newMeeting.endTime}
              onChange={(e) => setNewMeeting(m => ({ ...m, endTime: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-muted-foreground)] mb-2">
              Invite Team Members ({selectedParticipantIds.length} selected)
            </label>
            <div className="max-h-44 overflow-y-auto border border-[var(--color-border)] rounded-lg p-2 space-y-1.5 bg-[var(--color-background)]">
              {allUsers.filter(u => u.id !== currentUser?.id).length === 0 ? (
                <p className="text-xs text-[var(--color-muted-foreground)] p-2">No other members found.</p>
              ) : (
                allUsers.filter(u => u.id !== currentUser?.id).map(user => {
                  const isSelected = selectedParticipantIds.includes(user.id);
                  return (
                    <div
                      key={user.id}
                      onClick={() => {
                        setSelectedParticipantIds(prev => 
                          isSelected ? prev.filter(id => id !== user.id) : [...prev, user.id]
                        );
                      }}
                      className={cn(
                        'flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors text-xs',
                        isSelected ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200' : 'hover:bg-[var(--color-muted)]'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar name={user.name} size="xs" />
                        <div className="truncate">
                          <p className="font-medium truncate">{user.name}</p>
                          <p className="text-[10px] text-[var(--color-muted-foreground)] truncate">{user.designation || user.role}</p>
                        </div>
                      </div>
                      <div className={cn(
                        'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                        isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-400'
                      )}>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        title="Meeting Created Successfully"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowSuccess(false)}>Done</Button>
            <Button onClick={() => {
              if (createdLink.startsWith('http://') || createdLink.startsWith('https://')) {
                window.open(createdLink, '_blank', 'noopener,noreferrer');
              } else if (createdLink) {
                const roomId = createdLink.split('/').pop();
                navigate(`/meeting/${roomId}`);
              }
              setShowSuccess(false);
            }}>
              {createdLink.includes('meet.google.com') ? 'Open Google Meet' : 'Start Meeting'}
            </Button>
          </>
        }
      >
        <div className="space-y-6 text-center">
          <div className="mx-auto w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-4">
            <Video className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-medium">Your meeting is ready</h3>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Share this link with participants to invite them to the meeting.
          </p>
          <div className="flex items-center gap-2 mt-4 p-2 bg-[var(--color-muted)] rounded-lg border border-[var(--color-border)]">
            <input 
              type="text" 
              readOnly 
              value={createdLink} 
              className="flex-1 bg-transparent border-none focus:outline-none text-sm px-2"
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                navigator.clipboard.writeText(createdLink);
                toast.success('Link copied to clipboard');
              }}
            >
              <Copy className="w-4 h-4 mr-1" /> Copy
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
