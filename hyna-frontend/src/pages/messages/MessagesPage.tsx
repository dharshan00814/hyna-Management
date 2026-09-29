import { useState, useRef, useEffect } from 'react';
import {
  Globe, Send, Smile, Paperclip, Search, Users, Copy, Check,
  MessageSquare, Sparkles, X, Download, FileText, Image as ImageIcon,
  Flame, ThumbsUp, Heart, Rocket, PartyPopper
} from 'lucide-react';
import { Avatar, LoadingState } from '@/components/ui';
import { cn, formatRelativeTime, formatFileSize } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  getChannels, getChannelMessages, sendMessage, getUsers, getUserById,
  uploadFile, toggleMessageReaction
} from '@/services/api';
import { toast } from 'sonner';
import type { ChatChannel, ChatMessage, User } from '@/types';

const POPULAR_EMOJIS = ['👍', '❤️', '🚀', '🔥', '🎉', '👏', '💯', '👀', '✨', '💡', '😀', '🙌'];

export function MessagesPage() {
  const { currentUser } = useAuthStore();
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [showMembersPanel, setShowMembersPanel] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<{ name: string; url: string; size: number; type: string }[]>([]);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const [usersList, chs] = await Promise.all([getUsers(), getChannels()]);
        if (isMounted) {
          setTeamMembers(usersList);
          setChannels(chs);
          if (chs.length > 0) {
            setSelectedChannel(chs[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load chat data:', err);
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

  // Load messages & subscribe to realtime changes
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
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${selectedChannel}`,
        },
        (payload) => {
          if (isMounted && payload.new) {
            setMessages(prev => prev.map(m => {
              if (m.id === payload.new.id) {
                return {
                  ...m,
                  reactions: payload.new.reactions || [],
                  content: payload.new.content,
                };
              }
              return m;
            }));
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
    if ((!newMessage.trim() && pendingAttachments.length === 0) || !currentUser?.id) return;

    const activeChannelId = selectedChannel || channels[0]?.id || 'ch_global';
    const text = newMessage.trim();
    const attachments = pendingAttachments.map(a => a.url);

    setNewMessage('');
    setPendingAttachments([]);
    setShowEmojiPicker(false);

    try {
      const sent = await sendMessage(
        activeChannelId,
        text,
        currentUser.id,
        attachments,
        attachments.length > 0 && !text ? 'file' : 'text'
      );

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAttachment(true);
    const toastId = toast.loading(`Uploading "${file.name}"...`);

    try {
      const uploaded = await uploadFile(file, 'Chat');
      setPendingAttachments(prev => [
        ...prev,
        {
          name: file.name,
          url: uploaded.url,
          size: file.size,
          type: file.type,
        }
      ]);
      toast.success('File ready to attach!', { id: toastId });
    } catch (err: any) {
      console.error('File upload error:', err);
      toast.error(err?.message || 'Failed to upload attachment', { id: toastId });
    } finally {
      setIsUploadingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!currentUser?.id) return;

    // Optimistic update
    setMessages(prev => prev.map(m => {
      if (m.id !== messageId) return m;
      let reactions = [...(m.reactions || [])];
      const existing = reactions.find(r => r.emoji === emoji);
      if (existing) {
        if (existing.userIds.includes(currentUser.id)) {
          existing.userIds = existing.userIds.filter(id => id !== currentUser.id);
        } else {
          existing.userIds.push(currentUser.id);
        }
      } else {
        reactions.push({ emoji, userIds: [currentUser.id] });
      }
      return { ...m, reactions: reactions.filter(r => r.userIds.length > 0) };
    }));

    try {
      await toggleMessageReaction(messageId, emoji, currentUser.id);
    } catch (err) {
      console.warn('Reaction toggle error:', err);
    }
  };

  const handleCopy = (message: ChatMessage) => {
    navigator.clipboard.writeText(message.content);
    setCopiedMessageId(message.id);
    toast.success('Message copied to clipboard');
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const handleInsertEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  const filteredMessages = messages.filter(m => {
    if (!searchQuery.trim()) return true;
    return m.content.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const channel = channels.find(c => c.id === selectedChannel) || channels[0];

  if (isLoading) return <LoadingState />;

  return (
    <div className="page-container !p-0 sm:!p-6 h-[calc(100vh-4rem)] sm:h-[calc(100vh-6rem)] flex flex-col">
      <div className="card overflow-hidden flex-1 flex flex-col md:flex-row shadow-xl border border-[var(--color-border)] animate-fade-in relative bg-[var(--color-card)]">
        
        {/* Main Chat Hub Area */}
        <div className="flex-1 flex flex-col min-w-0 h-full bg-[var(--color-background)]">
          
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-[var(--color-border)] flex items-center justify-between shrink-0 bg-[var(--color-card)]/90 backdrop-blur-md z-10">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[var(--color-primary)] to-indigo-500 text-white flex items-center justify-center shadow-md">
                  <Globe className="w-5 h-5 animate-pulse" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[var(--color-card)]" title="Live Studio Hub" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold tracking-tight text-[var(--color-foreground)]">Global Chat</h2>
                  <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    Studio Live
                  </span>
                </div>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  Company-wide feed • {teamMembers.length} team members connected
                </p>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-2">
              {/* Search Bar */}
              <div className="relative hidden sm:block w-48 lg:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-[var(--color-input)] bg-[var(--color-muted)]/50 focus:bg-[var(--color-card)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] transition-all"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Toggle Members Panel */}
              <button
                onClick={() => setShowMembersPanel(!showMembersPanel)}
                className={cn(
                  'h-8 px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors',
                  showMembersPanel 
                    ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]' 
                    : 'border-[var(--color-input)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]'
                )}
                title="Toggle Team Roster"
              >
                <Users className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Team</span>
                <span className="px-1.5 py-0.2 rounded-full bg-[var(--color-muted)] text-[10px] font-semibold">
                  {teamMembers.length}
                </span>
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-5">
            {filteredMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 my-auto">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[var(--color-primary)]/20 via-indigo-500/10 to-transparent flex items-center justify-center mb-4 text-[var(--color-primary)] shadow-sm">
                  <Globe className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold tracking-tight text-[var(--color-foreground)]">Welcome to Global Chat</h3>
                <p className="text-xs text-[var(--color-muted-foreground)] max-w-md mt-1.5 leading-relaxed">
                  This is the unified studio channel. Every message posted here is visible to all developers, managers, and executives in real-time.
                </p>

                {/* Quick starter chips */}
                <div className="flex flex-wrap gap-2 justify-center mt-5 max-w-sm">
                  <button 
                    onClick={() => setNewMessage('👋 Hello team!')}
                    className="px-3 py-1.5 rounded-full text-xs bg-[var(--color-card)] hover:bg-[var(--color-muted)] border border-[var(--color-border)] text-[var(--color-foreground)] transition-colors shadow-xs"
                  >
                    👋 Say hello to everyone
                  </button>
                  <button 
                    onClick={() => setNewMessage('🚀 Working on updates today.')}
                    className="px-3 py-1.5 rounded-full text-xs bg-[var(--color-card)] hover:bg-[var(--color-muted)] border border-[var(--color-border)] text-[var(--color-foreground)] transition-colors shadow-xs"
                  >
                    🚀 Share status update
                  </button>
                  <button 
                    onClick={() => setNewMessage('💡 Quick question for the team:')}
                    className="px-3 py-1.5 rounded-full text-xs bg-[var(--color-card)] hover:bg-[var(--color-muted)] border border-[var(--color-border)] text-[var(--color-foreground)] transition-colors shadow-xs"
                  >
                    💡 Ask a question
                  </button>
                </div>
              </div>
            ) : (
              filteredMessages.map((msg, index) => {
                const sender = getUserById(msg.senderId);
                const isOwn = msg.senderId === currentUser?.id;
                const senderName = isOwn ? (currentUser?.name || 'You') : (sender?.name || 'Team Member');
                const senderRole = isOwn ? (currentUser?.role || 'member') : (sender?.role || 'member');
                const senderDesignation = isOwn ? (currentUser?.designation || '') : (sender?.designation || '');

                return (
                  <div
                    key={msg.id}
                    className={cn(
                      'group flex gap-3.5 items-start transition-all hover:bg-[var(--color-card)]/40 -mx-3 px-3 py-2 rounded-xl relative',
                      isOwn && 'flex-row-reverse'
                    )}
                  >
                    {/* Avatar */}
                    <div className="shrink-0 mt-0.5">
                      <Avatar name={senderName} size="md" className="shadow-xs" />
                    </div>

                    {/* Bubble & Metadata */}
                    <div className={cn('flex flex-col max-w-[80%] sm:max-w-[70%]', isOwn && 'items-end')}>
                      {/* Name + Role Badge + Time */}
                      <div className={cn('flex items-center gap-2 mb-1 flex-wrap', isOwn && 'flex-row-reverse')}>
                        <span className="text-xs font-bold text-[var(--color-foreground)]">
                          {senderName}
                        </span>

                        {senderRole === 'admin' ? (
                          <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-sm bg-purple-500/15 text-purple-400 border border-purple-500/30">
                            ADMIN
                          </span>
                        ) : senderRole === 'manager' ? (
                          <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-sm bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            MANAGER
                          </span>
                        ) : (
                          senderDesignation && (
                            <span className="px-1.5 py-0.2 text-[9px] font-medium rounded-sm bg-[var(--color-muted)] text-[var(--color-muted-foreground)]">
                              {senderDesignation}
                            </span>
                          )
                        )}

                        <span className="text-[10px] text-[var(--color-muted-foreground)]">
                          {formatRelativeTime(msg.timestamp)}
                        </span>
                      </div>

                      {/* Content Bubble */}
                      <div
                        className={cn(
                          'px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words shadow-xs relative',
                          isOwn 
                            ? 'bg-[var(--color-primary)] text-white rounded-tr-xs' 
                            : 'bg-[var(--color-card)] text-[var(--color-foreground)] border border-[var(--color-border)] rounded-tl-xs'
                        )}
                      >
                        {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}

                        {/* Attachments preview */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mt-2 space-y-1.5">
                            {msg.attachments.map((attUrl, aIdx) => {
                              const isImg = attUrl.match(/\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i);
                              const fileName = attUrl.split('/').pop()?.split('?')[0] || 'Attachment';

                              return isImg ? (
                                <div key={aIdx} className="overflow-hidden rounded-lg border border-black/10 mt-1">
                                  <a href={attUrl} target="_blank" rel="noopener noreferrer">
                                    <img 
                                      src={attUrl} 
                                      alt="Attachment" 
                                      className="max-h-64 rounded-lg object-cover hover:opacity-90 transition-opacity cursor-pointer" 
                                    />
                                  </a>
                                </div>
                              ) : (
                                <a
                                  key={aIdx}
                                  href={attUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={cn(
                                    'flex items-center gap-2 p-2 rounded-lg text-xs transition-colors',
                                    isOwn 
                                      ? 'bg-black/20 hover:bg-black/30 text-white' 
                                      : 'bg-[var(--color-muted)] hover:bg-[var(--color-muted)]/80 text-[var(--color-foreground)]'
                                  )}
                                >
                                  <FileText className="w-4 h-4 shrink-0" />
                                  <span className="truncate max-w-xs">{fileName}</span>
                                  <Download className="w-3.5 h-3.5 ml-auto opacity-70" />
                                </a>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Reactions bar */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className={cn('flex flex-wrap gap-1 mt-1.5', isOwn && 'justify-end')}>
                          {msg.reactions.map((react, rIdx) => {
                            const hasReacted = currentUser?.id ? react.userIds.includes(currentUser.id) : false;
                            return (
                              <button
                                key={rIdx}
                                onClick={() => handleReaction(msg.id, react.emoji)}
                                className={cn(
                                  'h-5 px-1.5 rounded-full text-xs flex items-center gap-1 border transition-colors',
                                  hasReacted 
                                    ? 'bg-[var(--color-primary)]/15 border-[var(--color-primary)]/40 text-[var(--color-primary)] font-semibold' 
                                    : 'bg-[var(--color-card)] border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]'
                                )}
                              >
                                <span>{react.emoji}</span>
                                <span className="text-[10px]">{react.userIds.length}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Hover action toolbar */}
                    <div
                      className={cn(
                        'opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-[var(--color-card)] border border-[var(--color-border)] shadow-md rounded-lg p-1 absolute top-2',
                        isOwn ? 'left-4' : 'right-4'
                      )}
                    >
                      <button
                        onClick={() => handleReaction(msg.id, '👍')}
                        className="p-1 rounded hover:bg-[var(--color-muted)] text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                        title="React 👍"
                      >
                        👍
                      </button>
                      <button
                        onClick={() => handleReaction(msg.id, '❤️')}
                        className="p-1 rounded hover:bg-[var(--color-muted)] text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                        title="React ❤️"
                      >
                        ❤️
                      </button>
                      <button
                        onClick={() => handleReaction(msg.id, '🚀')}
                        className="p-1 rounded hover:bg-[var(--color-muted)] text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                        title="React 🚀"
                      >
                        🚀
                      </button>
                      <button
                        onClick={() => handleReaction(msg.id, '🔥')}
                        className="p-1 rounded hover:bg-[var(--color-muted)] text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                        title="React 🔥"
                      >
                        🔥
                      </button>
                      <div className="w-px h-3 bg-[var(--color-border)] mx-0.5" />
                      <button
                        onClick={() => handleCopy(msg)}
                        className="p-1 rounded hover:bg-[var(--color-muted)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                        title="Copy message"
                      >
                        {copiedMessageId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Pending Attachments Banner */}
          {pendingAttachments.length > 0 && (
            <div className="px-5 py-2 border-t border-[var(--color-border)] bg-[var(--color-muted)]/40 flex items-center gap-2 overflow-x-auto">
              <span className="text-xs font-medium text-[var(--color-muted-foreground)]">Attached:</span>
              {pendingAttachments.map((att, idx) => (
                <div key={idx} className="flex items-center gap-1.5 bg-[var(--color-card)] px-2.5 py-1 rounded-lg border border-[var(--color-border)] text-xs">
                  <FileText className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                  <span className="font-medium truncate max-w-[140px]">{att.name}</span>
                  <button
                    onClick={() => setPendingAttachments(prev => prev.filter((_, i) => i !== idx))}
                    className="text-[var(--color-muted-foreground)] hover:text-[var(--color-destructive)] ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Floating Message Input Bar */}
          <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-card)] relative">
            
            {/* Quick Emoji Picker Popover */}
            {showEmojiPicker && (
              <div className="absolute bottom-16 left-4 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-2.5 shadow-2xl flex flex-wrap gap-1.5 max-w-xs z-50 animate-slide-up">
                {POPULAR_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleInsertEmoji(emoji)}
                    className="w-8 h-8 rounded-lg hover:bg-[var(--color-muted)] text-base flex items-center justify-center transition-transform hover:scale-120"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2 bg-[var(--color-muted)]/50 focus-within:bg-[var(--color-card)] border border-[var(--color-input)] focus-within:border-[var(--color-primary)]/50 focus-within:ring-2 focus-within:ring-[var(--color-primary)]/10 rounded-2xl p-2 transition-all shadow-inner">
              
              {/* Paperclip / File Upload */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAttachment}
                className="p-2 rounded-xl text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors shrink-0"
                title="Attach file or image"
              >
                <Paperclip className={cn('w-4 h-4', isUploadingAttachment && 'animate-spin')} />
              </button>

              {/* Emoji Picker Button */}
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 rounded-xl text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors shrink-0"
                title="Add emoji"
              >
                <Smile className="w-4 h-4" />
              </button>

              {/* Text Input */}
              <textarea
                ref={textareaRef}
                rows={1}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Message everyone in Global Chat..."
                className="flex-1 max-h-32 min-h-[36px] py-1.5 px-2 bg-transparent text-sm resize-none focus:outline-none text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)]/70"
              />

              {/* Send Button */}
              <button
                type="button"
                onClick={handleSend}
                disabled={!newMessage.trim() && pendingAttachments.length === 0}
                className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0',
                  newMessage.trim() || pendingAttachments.length > 0
                    ? 'bg-[var(--color-primary)] text-white shadow-md hover:opacity-90 active:scale-95 cursor-pointer'
                    : 'bg-transparent text-[var(--color-muted-foreground)] opacity-40 cursor-not-allowed'
                )}
                title="Send message (Enter)"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between px-2 pt-1.5 text-[10px] text-[var(--color-muted-foreground)]">
              <span>Press <kbd className="px-1 py-0.5 rounded bg-[var(--color-muted)] font-mono text-[9px]">Enter</kbd> to send, <kbd className="px-1 py-0.5 rounded bg-[var(--color-muted)] font-mono text-[9px]">Shift + Enter</kbd> for newline</span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live synchronized
              </span>
            </div>
          </div>
        </div>

        {/* Collapsible Studio Team Roster Side Panel */}
        {showMembersPanel && (
          <div className="w-72 border-l border-[var(--color-border)] bg-[var(--color-card)] hidden lg:flex flex-col shrink-0 animate-fade-in">
            {/* Panel Header */}
            <div className="px-4 py-3.5 border-b border-[var(--color-border)] flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                  Studio Team ({teamMembers.length})
                </h3>
              </div>
              <button
                onClick={() => setShowMembersPanel(false)}
                className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] p-1 rounded-md"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Members List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1 divide-y divide-[var(--color-border)]/20">
              {teamMembers.map(member => {
                const isCurrentUser = member.id === currentUser?.id;
                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--color-muted)]/50 transition-colors group"
                  >
                    <div className="relative shrink-0">
                      <Avatar name={member.name} size="md" />
                      <div 
                        className={cn(
                          'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--color-card)]',
                          member.status === 'active' || isCurrentUser ? 'bg-emerald-500' : 'bg-slate-400'
                        )}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold truncate text-[var(--color-foreground)]">
                          {member.name}
                        </span>
                        {isCurrentUser && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-[var(--color-primary)]/15 text-[var(--color-primary)] font-medium">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--color-muted-foreground)] truncate">
                        {member.designation || member.department || 'Engineer'}
                      </p>
                    </div>

                    {member.role === 'admin' ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-purple-500/10 text-purple-400">
                        ADMIN
                      </span>
                    ) : member.role === 'manager' ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-amber-500/10 text-amber-400">
                        MGR
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* Quick Studio Info Footer */}
            <div className="p-3 border-t border-[var(--color-border)] bg-[var(--color-muted)]/20 text-center">
              <p className="text-[11px] text-[var(--color-muted-foreground)] flex items-center justify-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                <span>All team members share this room</span>
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
