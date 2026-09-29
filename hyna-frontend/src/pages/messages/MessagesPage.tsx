import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import EmojiPicker from 'emoji-picker-react';
import { Globe, Send, Smile, Paperclip } from 'lucide-react';
import { Avatar, LoadingState } from '@/components/ui';
import { cn, formatRelativeTime } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import { getChannelMessages, sendMessage, getUsers } from '@/services/api';
import type { ChatMessage, User } from '@/types';

export function MessagesPage() {
  const { currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [activeChat, setActiveChat] = useState<string>('globe');
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const usrs = await getUsers();
        if (isMounted) {
          // Exclude the currently logged-in user from the direct messages list
          setUsers(usrs.filter(u => u.id !== currentUser?.id));
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, [currentUser]);

  useEffect(() => {
    let isMounted = true;
    if (!activeChat || !currentUser?.id) return;

    const fetchMessages = async () => {
      try {
        const msgs = await getChannelMessages(activeChat, currentUser.id);
        if (isMounted) setMessages(msgs);
      } catch (err) {
        console.error(err);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000); // 3-second fetch interval for real-time feel

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeChat, currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeChat]);

  const handleSend = async () => {
    if (!newMessage.trim() || !activeChat || !currentUser?.id) return;
    const text = newMessage.trim();
    
    // OPTIMISTIC UI: create a temporary message
    const tempMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      channelId: activeChat,
      senderId: currentUser.id,
      content: text,
      timestamp: new Date().toISOString(),
      type: 'text',
      attachments: [],
      reactions: [],
    };
    
    // Immediately update UI and clear input
    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');
    setShowEmojiPicker(false);
    
    try {
      const sent = await sendMessage(activeChat, text, currentUser.id);
      // Replace the temp message with the real one returned from DB
      setMessages(prev => prev.map(m => m.id === tempMessage.id ? sent : m));
    } catch (err: any) {
      console.error('Failed to send message:', err);
      // Revert Optimistic UI
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
      setNewMessage(text); // Put text back into input
      toast.error(err?.message || 'Failed to send message to database.');
    }
  };

  const onEmojiClick = (emojiObject: any) => {
    setNewMessage(prev => {
      const nextStr = prev + emojiObject.emoji;
      // Programmatically return focus to the input field so Enter key works and focus trap is broken
      // setTimeout waits for React to finish rendering the updated input value before selecting
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          const length = nextStr.length;
          inputRef.current.setSelectionRange(length, length);
        }
      }, 0);
      return nextStr;
    });
  };

  const activeUser = users.find(u => u.id === activeChat);

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
            <div className="px-3 py-1 text-[11px] font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">Public</div>
            <button
              onClick={() => setActiveChat('globe')}
              className={cn(
                'flex items-center gap-2.5 w-full px-3 py-2 text-sm transition-colors rounded-md mx-1',
                activeChat === 'globe' ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium' : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]',
              )}
              style={{ width: 'calc(100% - 8px)' }}
            >
              <Globe className="w-4 h-4 shrink-0" />
              <span className="truncate">🌐 Globe Chat</span>
            </button>

            <div className="px-3 py-1 mt-3 text-[11px] font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">Direct Messages</div>
            {users.map(user => (
              <button
                key={user.id}
                onClick={() => setActiveChat(user.id)}
                className={cn(
                  'flex items-center gap-2.5 w-full px-3 py-2 text-sm transition-colors rounded-md mx-1',
                  activeChat === user.id ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium' : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]',
                )}
                style={{ width: 'calc(100% - 8px)' }}
              >
                <Avatar name={user.name} src={user.avatar} size="xs" />
                <span className="truncate">{user.name}</span>
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
              value={activeChat}
              onChange={(e) => setActiveChat(e.target.value)}
              className="md:hidden h-8 px-2 rounded border border-[var(--color-input)] bg-[var(--color-background)] text-sm"
            >
              <option value="globe">🌐 Globe Chat</option>
              {users.map(u => <option key={u.id} value={u.id}>💬 {u.name}</option>)}
            </select>
            <div className="hidden md:block">
              {activeChat === 'globe' ? (
                <>
                  <h3 className="text-sm font-semibold">🌐 Globe Chat</h3>
                  <p className="text-xs text-[var(--color-muted-foreground)]">All workspace members</p>
                </>
              ) : (
                <>
                  <h3 className="text-sm font-semibold">{activeUser?.name || 'Member'}</h3>
                  <p className="text-xs text-[var(--color-muted-foreground)]">{activeUser?.role || 'Direct Message'}</p>
                </>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12 text-sm text-[var(--color-muted-foreground)]">
                No messages yet. Say hello! 👋
              </div>
            ) : (
              messages.map(msg => {
                // Find sender in users array, or if it's our own message, use currentUser context
                const sender = users.find(u => u.id === msg.senderId) || (currentUser?.id === msg.senderId ? currentUser : null);
                const isOwn = msg.senderId === currentUser?.id;
                return (
                  <div key={msg.id} className={cn('flex gap-3', isOwn && 'flex-row-reverse')}>
                    <Avatar name={sender?.name || 'User'} src={sender?.avatar} size="sm" />
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
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault(); // Prevent accidental form submissions or default behavior
                    handleSend();
                  }
                }}
                placeholder={activeChat === 'globe' ? "Message Globe Chat..." : `Message ${activeUser?.name || '...'}`}
                className="flex-1 h-9 px-3 rounded-lg border border-[var(--color-input)] bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
              />
              <div className="relative">
                <button 
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2 rounded-lg text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
                >
                  <Smile className="w-4 h-4" />
                </button>
                {showEmojiPicker && (
                  <div className="absolute bottom-12 right-0 z-50 shadow-xl rounded-lg">
                    <EmojiPicker onEmojiClick={onEmojiClick} theme="dark" />
                  </div>
                )}
              </div>
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
