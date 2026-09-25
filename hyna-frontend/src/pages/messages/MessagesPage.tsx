import { useState, useRef, useEffect } from 'react';
import { Hash, FolderOpen, User as UserIcon, Send, Smile, Paperclip } from 'lucide-react';
import { Avatar, LoadingState } from '@/components/ui';
import { cn, formatRelativeTime } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import { getChannels, getChannelMessages, sendMessage, getUsers, getUserById } from '@/services/api';
import type { ChatChannel, ChatMessage } from '@/types';

export function MessagesPage() {
  const { currentUser } = useAuthStore();
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        await getUsers();
        const chs = await getChannels();
        if (isMounted) {
          setChannels(chs);
          if (chs.length > 0) {
            setSelectedChannel(chs[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (!selectedChannel) return;
    getChannelMessages(selectedChannel).then((msgs) => {
      if (isMounted) setMessages(msgs);
    });
    return () => { isMounted = false; };
  }, [selectedChannel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, selectedChannel]);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedChannel || !currentUser?.id) return;
    const text = newMessage.trim();
    setNewMessage('');
    try {
      const sent = await sendMessage(selectedChannel, text, currentUser.id);
      setMessages(prev => [...prev, sent]);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const channel = channels.find(c => c.id === selectedChannel);

  const channelIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    hash: Hash,
    code: Hash,
    palette: Hash,
    megaphone: Hash,
    folder: FolderOpen,
    user: UserIcon,
  };

  if (isLoading) return <LoadingState />;

  return (
    <div className="page-container !p-0 sm:!p-6">
      <div className="card overflow-hidden h-[calc(100vh-8rem)] sm:h-[calc(100vh-10rem)] flex animate-fade-in">
        {/* Channel sidebar */}
        <div className="w-64 border-r border-[var(--color-border)] hidden md:flex flex-col shrink-0">
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-semibold">Messages</h2>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            <div className="px-3 py-1 text-[11px] font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">Channels</div>
            {channels.filter(c => c.type !== 'direct').map(ch => {
              const Icon = channelIcons[ch.icon || 'hash'] || Hash;
              return (
                <button
                  key={ch.id}
                  onClick={() => setSelectedChannel(ch.id)}
                  className={cn(
                    'flex items-center gap-2.5 w-full px-3 py-2 text-sm transition-colors rounded-md mx-1',
                    selectedChannel === ch.id ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium' : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]',
                  )}
                  style={{ width: 'calc(100% - 8px)' }}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{ch.name}</span>
                  {ch.unreadCount > 0 && (
                    <span className="ml-auto bg-[var(--color-primary)] text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full">{ch.unreadCount}</span>
                  )}
                </button>
              );
            })}
            <div className="px-3 py-1 mt-3 text-[11px] font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">Direct Messages</div>
            {channels.filter(c => c.type === 'direct').map(ch => (
              <button
                key={ch.id}
                onClick={() => setSelectedChannel(ch.id)}
                className={cn(
                  'flex items-center gap-2.5 w-full px-3 py-2 text-sm transition-colors rounded-md mx-1',
                  selectedChannel === ch.id ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium' : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]',
                )}
                style={{ width: 'calc(100% - 8px)' }}
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">{ch.name}</span>
                {ch.unreadCount > 0 && (
                  <span className="ml-auto bg-[var(--color-primary)] text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full">{ch.unreadCount}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Channel header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] shrink-0">
            {/* Mobile channel selector */}
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="md:hidden h-8 px-2 rounded border border-[var(--color-input)] bg-[var(--color-background)] text-sm"
            >
              {channels.map(ch => <option key={ch.id} value={ch.id}>{ch.type === 'direct' ? '💬 ' : '# '}{ch.name}</option>)}
            </select>
            <div className="hidden md:block">
              <h3 className="text-sm font-semibold"># {channel?.name || 'Channel'}</h3>
              <p className="text-xs text-[var(--color-muted-foreground)]">{channel?.memberIds.length || 0} members</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12 text-sm text-[var(--color-muted-foreground)]">
                No messages in this channel yet. Say hello! 👋
              </div>
            ) : (
              messages.map(msg => {
                const sender = getUserById(msg.senderId);
                const isOwn = msg.senderId === currentUser?.id;
                return (
                  <div key={msg.id} className={cn('flex gap-3', isOwn && 'flex-row-reverse')}>
                    <Avatar name={sender?.name || ''} size="sm" />
                    <div className={cn('max-w-[70%]', isOwn && 'text-right')}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium">{sender?.name || 'User'}</span>
                        <span className="text-[11px] text-[var(--color-muted-foreground)]">{formatRelativeTime(msg.timestamp)}</span>
                      </div>
                      <div className={cn(
                        'inline-block px-3 py-2 rounded-xl text-sm text-left',
                        isOwn ? 'bg-[var(--color-primary)] text-white rounded-tr-sm' : 'bg-[var(--color-muted)] rounded-tl-sm',
                      )}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message input */}
          <div className="px-4 py-3 border-t border-[var(--color-border)]">
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-lg text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors">
                <Paperclip className="w-4 h-4" />
              </button>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type a message..."
                className="flex-1 h-9 px-3 rounded-lg border border-[var(--color-input)] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
              />
              <button className="p-2 rounded-lg text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors">
                <Smile className="w-4 h-4" />
              </button>
              <button
                onClick={handleSend}
                disabled={!newMessage.trim()}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  newMessage.trim() ? 'text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10' : 'text-[var(--color-muted-foreground)]',
                )}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
