import { useState, useRef, useEffect } from 'react';
import { Globe, Send, Smile, Paperclip } from 'lucide-react';
import { Avatar, LoadingState } from '@/components/ui';
import { cn, formatRelativeTime } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getChannels, getChannelMessages, sendMessage, getUserById } from '@/services/api';
import { toast } from 'sonner';
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
        const chs = await getChannels();
        if (isMounted) {
          setChannels(chs);
          if (chs.length > 0) {
            setSelectedChannel(chs[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load global chat:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, []);

  // Ensure a channel is always selected
  useEffect(() => {
    if (channels.length > 0 && (!selectedChannel || !channels.some(c => c.id === selectedChannel))) {
      setSelectedChannel(channels[0].id);
    }
  }, [channels, selectedChannel]);

  // Load messages & subscribe to realtime changes for selectedChannel
  useEffect(() => {
    if (!selectedChannel) return;
    let isMounted = true;

    getChannelMessages(selectedChannel).then((msgs) => {
      if (isMounted) setMessages(msgs);
    });

    if (!isSupabaseConfigured()) {
      return () => { isMounted = false; };
    }

    const channelSub = supabase
      .channel(`chat_messages_${selectedChannel}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${selectedChannel}`,
        },
        (payload) => {
          if (isMounted && payload.new) {
            const incoming: ChatMessage = {
              id: payload.new.id,
              channelId: payload.new.channel_id,
              senderId: payload.new.sender_id,
              content: payload.new.content,
              timestamp: payload.new.created_at || new Date().toISOString(),
              type: payload.new.type || 'text',
              attachments: payload.new.attachments || [],
              reactions: payload.new.reactions || [],
            };

            setMessages(prev => {
              if (prev.some(m => m.id === incoming.id)) return prev;
              return [...prev, incoming];
            });
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channelSub);
    };
  }, [selectedChannel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, selectedChannel]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    const activeChannelId = selectedChannel || channels[0]?.id || 'ch_global';
    const senderId = currentUser?.id;

    if (!senderId) {
      toast.error('You must be signed in to send messages.');
      return;
    }

    const text = newMessage.trim();
    setNewMessage('');

    try {
      const sent = await sendMessage(activeChannelId, text, senderId);
      setMessages(prev => {
        if (prev.some(m => m.id === sent.id)) return prev;
        return [...prev, sent];
      });
    } catch (err: any) {
      console.error('Failed to send message:', err);
      toast.error(err?.message || 'Failed to send message');
      setNewMessage(text);
    }
  };

  const channel = channels.find(c => c.id === selectedChannel) || channels[0];

  if (isLoading) return <LoadingState />;

  return (
    <div className="page-container !p-0 sm:!p-6">
      <div className="card overflow-hidden h-[calc(100vh-8rem)] sm:h-[calc(100vh-10rem)] flex animate-fade-in relative">
        {/* Channel sidebar */}
        <div className="w-64 border-r border-[var(--color-border)] hidden md:flex flex-col shrink-0 bg-[var(--color-card)]">
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-semibold">Messages</h2>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            <div className="px-3 py-1 flex items-center justify-between text-[11px] font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">
              <span>Channels</span>
            </div>
            {channels.map(ch => {
              const isSelected = (selectedChannel || channels[0]?.id) === ch.id;
              return (
                <button
                  key={ch.id}
                  onClick={() => setSelectedChannel(ch.id)}
                  className={cn(
                    'flex items-center gap-2.5 w-full px-3 py-2.5 text-sm transition-colors rounded-md mx-1',
                    isSelected 
                      ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium shadow-xs' 
                      : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]',
                  )}
                  style={{ width: 'calc(100% - 8px)' }}
                >
                  <Globe className="w-4 h-4 shrink-0 text-[var(--color-primary)]" />
                  <span className="truncate font-medium">{ch.name === 'global-chat' ? 'global-chat' : ch.name}</span>
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-primary)]/15 text-[var(--color-primary)] font-medium">
                    All
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0 bg-[var(--color-background)]">
          {/* Channel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] shrink-0 bg-[var(--color-card)]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--color-primary)]/15 text-[var(--color-primary)] flex items-center justify-center">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  Global Chat
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 font-semibold border border-emerald-500/30">
                    All Studio Members
                  </span>
                </h3>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  Universal conversation channel for all developers, managers, and admins
                </p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-[var(--color-muted-foreground)]">
                <div className="w-12 h-12 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center mb-3">
                  <Globe className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-[var(--color-foreground)]">Welcome to Global Chat!</p>
                <p className="text-xs max-w-sm mt-1 text-[var(--color-muted-foreground)]">
                  This is the single open chat room for the entire studio. Everyone can read and participate in the conversation. Say hello to the team! 👋
                </p>
              </div>
            ) : (
              messages.map(msg => {
                const sender = getUserById(msg.senderId);
                const isOwn = msg.senderId === currentUser?.id;
                return (
                  <div key={msg.id} className={cn('flex gap-3', isOwn && 'flex-row-reverse')}>
                    <Avatar name={sender?.name || (isOwn ? currentUser?.name || 'You' : 'User')} size="sm" />
                    <div className={cn('max-w-[70%]', isOwn && 'text-right')}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium">{sender?.name || (isOwn ? currentUser?.name || 'You' : 'User')}</span>
                        <span className="text-[11px] text-[var(--color-muted-foreground)]">{formatRelativeTime(msg.timestamp)}</span>
                      </div>
                      <div className={cn(
                        'inline-block px-3 py-2 rounded-xl text-sm text-left break-words',
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
          <div className="px-4 py-3 border-t border-[var(--color-border)] bg-[var(--color-card)]">
            <div className="flex items-center gap-2">
              <button 
                type="button" 
                className="p-2 rounded-lg text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
                title="Attach file"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Message everyone in Global Chat..."
                className="flex-1 h-9 px-3 rounded-lg border border-[var(--color-input)] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
              />
              <button 
                type="button" 
                className="p-2 rounded-lg text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
                title="Add emoji"
              >
                <Smile className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={!newMessage.trim()}
                title="Send message"
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  newMessage.trim() 
                    ? 'text-[var(--color-primary)] bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 cursor-pointer' 
                    : 'text-[var(--color-muted-foreground)] opacity-50 cursor-not-allowed',
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
