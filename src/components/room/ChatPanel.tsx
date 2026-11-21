import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  CheckCheck,
  ImagePlus,
  Loader2,
  MessageCircle,
  RefreshCw,
  Send,
  Smile,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import {
  ensureChatConnected,
  loadRoomHistory,
  sendRoomImage,
  sendRoomMessage,
  sendRoomSticker,
  sendTypingStatus,
  subscribeRoomMessages,
  subscribeTyping,
  toNexconnId,
} from '@/lib/chat/nexconn';
import { formatDayLabel, formatRelative, formatTime, initialsOf, isOnline } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ChatMessage, RoomMemberWithProfile } from '@/types/types';

const STICKERS = ['💖', '🥰', '😘', '🤗', '😍', '🌹', '💌', '🧸', '✨', '🎉', '😴', '🍕', '☕', '🌙', '🐣', '💫'];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

interface ChatPanelProps {
  roomId: string;
  userId: string;
  members: RoomMemberWithProfile[];
  expired: boolean;
  className?: string;
}

function chatErrorText(raw: string): string {
  if (raw.includes('NEXCONN_APP_KEY_MISSING')) return 'Chat is not configured yet.';
  if (raw.includes('NEXCONN_TOKEN')) return 'Could not sign you in to chat. Please try again.';
  if (raw.includes('NEXCONN_CONNECT_FAILED')) return 'Could not reach the chat service. Please try again.';
  if (raw.includes('NEXCONN_HISTORY_FAILED')) return 'Could not load earlier messages.';
  if (raw.includes('NEXCONN_SEND_FAILED')) return 'Your message could not be sent.';
  return 'Chat is unavailable right now.';
}

export function ChatPanel({ roomId, userId, members, expired, className }: ChatPanelProps) {
  const partner = members.find((member) => member.user_id !== userId) ?? null;
  const partnerId = partner?.user_id ?? null;
  const partnerName = partner?.profile?.display_name ?? 'Partner';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [stickerOpen, setStickerOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const typingSentAt = useRef(0);
  const typingTimer = useRef<number | null>(null);

  const nameOf = useCallback(
    (id: string) => {
      const key = toNexconnId(id);
      return (
        members.find((member) => toNexconnId(member.user_id) === key)?.profile?.display_name ??
        'Partner'
      );
    },
    [members],
  );

  const load = useCallback(async () => {
    if (!partnerId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      await ensureChatConnected();
      const data = await loadRoomHistory(partnerId, roomId);
      setMessages(data);
      setError(null);
    } catch (loadError) {
      setError(chatErrorText(loadError instanceof Error ? loadError.message : ''));
    } finally {
      setLoading(false);
    }
  }, [partnerId, roomId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!partnerId) return;
    return subscribeRoomMessages(partnerId, roomId, (incoming) => {
      setMessages((current) =>
        current.some((message) => message.id === incoming.id) ? current : [...current, incoming],
      );
    });
  }, [partnerId, roomId]);

  useEffect(() => {
    if (!partnerId) return;
    return subscribeTyping(partnerId, (typing) => {
      setPartnerTyping(typing);
      if (typingTimer.current) window.clearTimeout(typingTimer.current);
      if (typing) {
        typingTimer.current = window.setTimeout(() => setPartnerTyping(false), 4000);
      }
    });
  }, [partnerId]);

  useEffect(
    () => () => {
      if (typingTimer.current) window.clearTimeout(typingTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (atBottom) bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, atBottom, partnerTyping]);

  const onScroll = () => {
    const node = scrollRef.current;
    if (!node) return;
    setAtBottom(node.scrollHeight - node.scrollTop - node.clientHeight < 80);
  };

  const emitTyping = () => {
    if (!partnerId) return;
    const now = Date.now();
    if (now - typingSentAt.current < 2500) return;
    typingSentAt.current = now;
    void sendTypingStatus(partnerId);
  };

  const append = (message: ChatMessage) => {
    setMessages((current) =>
      current.some((item) => item.id === message.id) ? current : [...current, message],
    );
    setAtBottom(true);
  };

  const submit = async () => {
    const body = draft.trim();
    if (!body || sending || !partnerId) return;
    setSending(true);
    try {
      append(await sendRoomMessage(partnerId, roomId, body));
      setDraft('');
    } catch (sendError) {
      toast.error(chatErrorText(sendError instanceof Error ? sendError.message : ''));
    } finally {
      setSending(false);
    }
  };

  const sendSticker = async (sticker: string) => {
    if (!partnerId || sending) return;
    setStickerOpen(false);
    setSending(true);
    try {
      append(await sendRoomSticker(partnerId, roomId, sticker));
    } catch (sendError) {
      toast.error(chatErrorText(sendError instanceof Error ? sendError.message : ''));
    } finally {
      setSending(false);
    }
  };

  const pickImage = async (file: File | undefined) => {
    if (!file || !partnerId) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error('That image is larger than 8 MB.');
      return;
    }
    setUploading(true);
    try {
      append(await sendRoomImage(partnerId, roomId, file));
    } catch (sendError) {
      toast.error(chatErrorText(sendError instanceof Error ? sendError.message : ''));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const online = partner ? isOnline(partner.last_seen_at) : false;
  const statusLabel = !partnerId
    ? 'Chat opens when they join'
    : partnerTyping
      ? `${partnerName} is typing…`
      : online
        ? 'Online now'
        : partner?.last_seen_at
          ? `Last seen ${formatRelative(partner.last_seen_at)}`
          : 'Offline';

  let lastDay = '';

  return (
    <section
      className={cn(
        'flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-card',
        className,
      )}
    >
      <header className="flex shrink-0 items-center gap-2.5 border-b border-border bg-gradient-to-r from-primary/10 via-secondary/15 to-accent/10 px-3 py-2.5 md:px-4 md:py-3">
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card font-display text-[11px] font-bold text-foreground shadow-sm md:h-10 md:w-10">
          {initialsOf(partnerName)}
          <span
            className={cn(
              'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card',
              online ? 'bg-primary' : 'bg-muted-foreground/40',
            )}
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-bold leading-tight text-foreground md:text-base">
            {partnerId ? partnerName : 'Waiting for your partner'}
          </p>
          <p
            className={cn(
              'truncate text-[11px]',
              partnerTyping ? 'font-semibold text-primary' : 'text-muted-foreground',
            )}
          >
            {statusLabel}
          </p>
        </div>
        <span className="hidden shrink-0 rounded-full bg-card/80 px-2.5 py-1 text-[11px] font-bold text-muted-foreground sm:inline">
          {messages.length} {messages.length === 1 ? 'message' : 'messages'}
        </span>
      </header>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="relative min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_1px_1px,hsl(var(--primary)/0.07)_1px,transparent_0)] bg-[length:20px_20px]"
      >
        <div className="space-y-2.5 px-3 py-4 md:px-4">
          {!partnerId ? (
            <div className="py-12 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/30 text-secondary-foreground">
                <MessageCircle className="h-6 w-6" />
              </span>
              <p className="mt-3 font-display text-base font-bold text-foreground">
                Waiting for your partner
              </p>
              <p className="mx-auto mt-1 max-w-xs text-pretty text-sm text-muted-foreground">
                Chat opens as soon as your partner joins this room with the code.
              </p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="mx-auto max-w-sm rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-4 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 h-9 rounded-full"
                onClick={() => void load()}
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Try again
              </Button>
            </div>
          ) : messages.length === 0 ? (
            <div className="py-12 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                <Sparkles className="h-6 w-6" />
              </span>
              <p className="mt-3 font-display text-base font-bold text-foreground">No messages yet</p>
              <p className="mx-auto mt-1 max-w-xs text-pretty text-sm text-muted-foreground">
                Say the first thing. Your partner will see it the moment you send it.
              </p>
            </div>
          ) : (
            messages.map((message) => {
              const mine = toNexconnId(message.senderId) === toNexconnId(userId);
              const day = formatDayLabel(message.createdAt);
              const showDay = day !== lastDay;
              lastDay = day;

              return (
                <div key={message.id}>
                  {showDay ? (
                    <div className="my-4 flex items-center gap-3">
                      <span className="h-px flex-1 bg-border" />
                      <span className="rounded-full bg-card px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground shadow-sm">
                        {day}
                      </span>
                      <span className="h-px flex-1 bg-border" />
                    </div>
                  ) : null}

                  <div className={cn('flex items-end gap-2', mine ? 'justify-end' : 'justify-start')}>
                    {!mine ? (
                      <span className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary/40 font-display text-[10px] font-bold text-secondary-foreground">
                        {initialsOf(nameOf(message.senderId))}
                      </span>
                    ) : null}

                    <div
                      className={cn(
                        'flex max-w-[82%] min-w-0 flex-col md:max-w-[70%]',
                        mine ? 'items-end' : 'items-start',
                      )}
                    >
                      {!mine ? (
                        <p className="mb-1 px-1 text-[11px] font-semibold text-muted-foreground">
                          {nameOf(message.senderId)}
                        </p>
                      ) : null}

                      {message.kind === 'image' && message.mediaUrl ? (
                        <a
                          href={message.mediaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block overflow-hidden rounded-2xl border border-border bg-muted shadow-sm"
                        >
                          <img
                            src={message.mediaUrl}
                            alt="Shared photo"
                            loading="lazy"
                            className="max-h-64 w-auto max-w-full object-cover"
                          />
                        </a>
                      ) : message.kind === 'sticker' ? (
                        <p className="text-5xl leading-none" aria-label="Sticker">
                          {message.body}
                        </p>
                      ) : (
                        <div
                          className={cn(
                            'px-3.5 py-2.5 text-sm leading-relaxed shadow-sm transition-all',
                            mine
                              ? 'rounded-3xl rounded-br-md bg-gradient-to-br from-primary to-primary/85 text-primary-foreground'
                              : 'rounded-3xl rounded-bl-md border border-border bg-card text-foreground',
                          )}
                        >
                          <p className="whitespace-pre-wrap break-words">{message.body}</p>
                        </div>
                      )}

                      <div
                        className={cn(
                          'mt-1 flex items-center gap-1 px-1',
                          mine ? 'flex-row-reverse' : '',
                        )}
                      >
                        <span className="text-[10px] text-muted-foreground">
                          {formatTime(message.createdAt)}
                        </span>
                        {mine ? <CheckCheck className="h-3 w-3 text-primary/70" /> : null}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {partnerTyping && partnerId ? (
            <div className="flex items-end gap-2">
              <span className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary/40 font-display text-[10px] font-bold text-secondary-foreground">
                {initialsOf(partnerName)}
              </span>
              <div className="flex items-center gap-1 rounded-3xl rounded-bl-md border border-border bg-card px-3.5 py-3 shadow-sm">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
              </div>
            </div>
          ) : null}

          <div ref={bottomRef} />
        </div>

        {!atBottom && messages.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              setAtBottom(true);
              bottomRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
            }}
            className="sticky bottom-3 left-1/2 z-10 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-card text-primary shadow-card"
            aria-label="Jump to latest message"
          >
            <ArrowDown className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-border bg-card p-2 md:p-3">
        {expired ? (
          <p className="rounded-2xl bg-muted px-3 py-2.5 text-center text-sm text-muted-foreground">
            This room has closed. Messages are read-only.
          </p>
        ) : (
          <div className="flex items-end gap-1 rounded-3xl border border-border bg-muted/40 p-1.5 focus-within:border-primary/40 focus-within:bg-card">
            <Popover open={stickerOpen} onOpenChange={setStickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
                  aria-label="Send a sticker"
                  disabled={!partnerId}
                >
                  <Smile className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent side="top" align="start" className="w-64 p-2">
                <p className="px-1 pb-1.5 text-[11px] font-bold text-muted-foreground">Stickers</p>
                <div className="grid grid-cols-4 gap-1">
                  {STICKERS.map((sticker) => (
                    <button
                      key={sticker}
                      type="button"
                      onClick={() => void sendSticker(sticker)}
                      className="flex h-12 items-center justify-center rounded-xl text-2xl transition-colors hover:bg-muted"
                      aria-label={`Send ${sticker}`}
                    >
                      {sticker}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
              aria-label="Send a photo"
              disabled={!partnerId || uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ImagePlus className="h-5 w-5" />
              )}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => void pickImage(event.target.files?.[0])}
            />

            <Textarea
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                emitTyping();
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void submit();
                }
              }}
              placeholder={partnerId ? `Message ${partnerName}…` : 'Waiting for your partner…'}
              rows={1}
              maxLength={2000}
              disabled={!partnerId}
              className="max-h-28 min-h-10 flex-1 resize-none border-0 bg-transparent px-2 py-2.5 text-base shadow-none focus-visible:ring-0"
            />
            <Button
              size="icon"
              className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-primary to-primary/85 shadow-glow"
              onClick={() => void submit()}
              disabled={sending || !partnerId || draft.trim().length === 0}
              aria-label="Send message"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        )}
        {!expired && partnerId ? (
          <p className="mt-1.5 px-2 text-[10px] text-muted-foreground">
            Enter sends · Shift + Enter adds a line
          </p>
        ) : null}
      </div>
    </section>
  );
}
