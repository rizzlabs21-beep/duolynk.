import {
  AreaCode,
  BaseChannel,
  ChannelHandler,
  DirectChannel,
  DirectChannelIdentifier,
  Helper,
  LogLevel,
  MessageHandler,
  NCEngine,
  SendTextMessageParams,
  type Message as NexconnMessage,
} from '@nexconn/chat';
import { supabase } from '@/db/supabase';
import type { ChatMessage } from '@/types/types';

const APP_KEY = import.meta.env['VITE_NEXCONN_APP_KEY'] as string | undefined;

let initialized = false;
let connectPromise: Promise<string> | null = null;
let connectedUserId: string | null = null;
let handlerRegistered = false;

const listeners = new Map<string, Set<(message: ChatMessage, roomId: string | null) => void>>();
const typingListeners = new Map<string, Set<(typing: boolean) => void>>();

/** Nexconn user IDs are the Supabase UUID without hyphens. */
export function toNexconnId(uuid: string): string {
  return uuid.replace(/-/g, '');
}

function metaOf(message: NexconnMessage<Record<string, unknown>>, key: string): string | null {
  const metadata = message.metadata;
  if (!metadata) return null;
  if (typeof metadata.get === 'function') return metadata.get(key) ?? null;
  const record = metadata as unknown as Record<string, string>;
  return record[key] ?? null;
}

function toChatMessage(message: NexconnMessage<Record<string, unknown>>): ChatMessage | null {
  const content = message.content as
    | {
        text?: unknown;
        remoteUrl?: unknown;
        thumbnailBase64?: unknown;
        imageUri?: unknown;
        content?: unknown;
      }
    | undefined;

  const base = {
    id: message.messageId,
    senderId: message.senderUserId,
    createdAt: new Date(message.sentTime).toISOString(),
  };

  const sticker = metaOf(message, 'sticker');
  if (sticker) return { ...base, body: sticker, kind: 'sticker' };

  // The Nexconn SDK delivers image messages as `remoteUrl` (+ optional
  // `thumbnailBase64`). Older payloads used `imageUri`, so both are accepted —
  // without this the receiver silently dropped every image.
  if (content && typeof content.remoteUrl === 'string' && content.remoteUrl.length > 0) {
    return { ...base, body: '', kind: 'image', mediaUrl: content.remoteUrl };
  }
  if (content && typeof content.imageUri === 'string' && content.imageUri.length > 0) {
    return { ...base, body: '', kind: 'image', mediaUrl: content.imageUri };
  }
  if (content && typeof content.text === 'string') {
    return { ...base, body: content.text, kind: 'text' };
  }
  if (content && typeof content.content === 'string' && content.content.length > 0) {
    return {
      ...base,
      body: '',
      kind: 'image',
      mediaUrl: `data:image/jpeg;base64,${content.content}`,
    };
  }
  return null;
}

function roomTagOf(message: NexconnMessage<Record<string, unknown>>): string | null {
  return metaOf(message, 'roomId');
}

function ensureHandler() {
  if (handlerRegistered) return;
  NCEngine.addMessageHandler(
    'duolynk-room-chat',
    new MessageHandler({
      onMessageReceived({ messages }) {
        for (const raw of messages) {
          const mapped = toChatMessage(raw as NexconnMessage<Record<string, unknown>>);
          if (!mapped) continue;
          const channelId = raw.channelIdentifier?.channelId ?? '';
          const set = listeners.get(channelId);
          if (!set) continue;
          const tag = roomTagOf(raw as NexconnMessage<Record<string, unknown>>);
          for (const listener of set) listener(mapped, tag);
        }
      },
    }),
  );
  NCEngine.addChannelHandler(
    'duolynk-room-typing',
    new ChannelHandler({
      onTypingStatusChanged(event) {
        const channelId = event.channelIdentifier?.channelId ?? '';
        const set = typingListeners.get(channelId);
        if (!set) return;
        const typing = Array.isArray(event.userTypingStatus) && event.userTypingStatus.length > 0;
        for (const listener of set) listener(typing);
      },
    }),
  );
  handlerRegistered = true;
}

async function requestToken(): Promise<{ token: string; userId: string }> {
  const { data, error } = await supabase.functions.invoke('nexconn-token', { method: 'POST' });
  if (error) {
    const detail = await error.context?.text?.().catch(() => '');
    throw new Error(detail || error.message || 'NEXCONN_TOKEN_FAILED');
  }
  const payload = data as { token?: string; userId?: string } | null;
  if (!payload?.token) throw new Error('NEXCONN_TOKEN_FAILED');
  return { token: payload.token, userId: payload.userId ?? '' };
}

export async function ensureChatConnected(): Promise<string> {
  if (connectedUserId) return connectedUserId;
  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    if (!APP_KEY) throw new Error('NEXCONN_APP_KEY_MISSING');

    if (!initialized) {
      NCEngine.initialize({ appKey: APP_KEY, areaCode: AreaCode.SG, logLevel: LogLevel.WARN });
      initialized = true;
    }
    ensureHandler();

    const { token, userId } = await requestToken();
    const result = await NCEngine.connect({ token });
    if (!result.isOk) {
      throw new Error(`NEXCONN_CONNECT_FAILED:${result.code}`);
    }
    connectedUserId = result.data?.userId ?? userId;
    return connectedUserId;
  })().catch((error) => {
    connectPromise = null;
    throw error;
  });

  return connectPromise;
}

export function isChatConnected(): boolean {
  return Boolean(connectedUserId);
}

export async function disconnectChat(): Promise<void> {
  if (!connectedUserId) return;
  await NCEngine.disconnect();
  connectedUserId = null;
  connectPromise = null;
}

export function subscribeRoomMessages(
  partnerId: string,
  roomId: string,
  onMessage: (message: ChatMessage) => void,
): () => void {
  const key = toNexconnId(partnerId);
  const set = listeners.get(key) ?? new Set();
  const wrapped = (message: ChatMessage, tag: string | null) => {
    if (tag !== null && tag !== roomId) return;
    onMessage(message);
  };
  set.add(wrapped);
  listeners.set(key, set);

  return () => {
    set.delete(wrapped);
    if (set.size === 0) listeners.delete(key);
  };
}

/** Best-effort typing signal — failures are silent by design. */
export async function sendTypingStatus(partnerId: string): Promise<void> {
  try {
    await ensureChatConnected();
    const channel = new DirectChannel(toNexconnId(partnerId));
    await channel.sendTypingStatus('RC:TxtMsg');
  } catch {
    // Typing indicators are decorative; never surface an error for them.
  }
}

export function subscribeTyping(
  partnerId: string,
  onTyping: (typing: boolean) => void,
): () => void {
  const key = toNexconnId(partnerId);
  const set = typingListeners.get(key) ?? new Set();
  set.add(onTyping);
  typingListeners.set(key, set);

  return () => {
    set.delete(onTyping);
    if (set.size === 0) typingListeners.delete(key);
  };
}

export async function loadRoomHistory(
  partnerId: string,
  roomId: string,
  pageSize = 50,
): Promise<ChatMessage[]> {
  await ensureChatConnected();

  const query = BaseChannel.createMessagesQuery({
    channelIdentifier: new DirectChannelIdentifier(toNexconnId(partnerId)),
    isAscending: true,
    pageSize,
  });

  const result = await query.loadNextPage();
  if (!result.isOk) throw new Error(`NEXCONN_HISTORY_FAILED:${result.code}`);

  const rows = (result.data?.data ?? []) as NexconnMessage<Record<string, unknown>>[];
  return rows
    .filter((row) => {
      const tag = roomTagOf(row);
      return tag === null || tag === roomId;
    })
    .map(toChatMessage)
    .filter((message): message is ChatMessage => message !== null);
}

export async function loadLatestMessage(
  partnerId: string,
  roomId: string,
): Promise<ChatMessage | null> {
  await ensureChatConnected();

  const query = BaseChannel.createMessagesQuery({
    channelIdentifier: new DirectChannelIdentifier(toNexconnId(partnerId)),
    isAscending: false,
    pageSize: 10,
  });

  const result = await query.loadNextPage();
  if (!result.isOk) return null;

  const rows = (result.data?.data ?? []) as NexconnMessage<Record<string, unknown>>[];
  const match = rows.find((row) => {
    const tag = roomTagOf(row);
    return tag === null || tag === roomId;
  });
  return match ? toChatMessage(match) : null;
}

export async function sendRoomMessage(
  partnerId: string,
  roomId: string,
  body: string,
): Promise<ChatMessage> {
  await ensureChatConnected();

  const channel = new DirectChannel(toNexconnId(partnerId));
  const params = new SendTextMessageParams({ text: body });
  params.metadata = { roomId };

  const result = await channel.sendMessage(params);
  if (!result.isOk || !result.data) {
    throw new Error(`NEXCONN_SEND_FAILED:${result.code}`);
  }

  const mapped = toChatMessage(result.data as unknown as NexconnMessage<Record<string, unknown>>);
  if (!mapped) throw new Error('NEXCONN_SEND_FAILED');
  return mapped;
}

export async function sendRoomSticker(
  partnerId: string,
  roomId: string,
  sticker: string,
): Promise<ChatMessage> {
  await ensureChatConnected();

  const channel = new DirectChannel(toNexconnId(partnerId));
  const params = new SendTextMessageParams({ text: sticker });
  params.metadata = { roomId, sticker };

  const result = await channel.sendMessage(params);
  if (!result.isOk || !result.data) {
    throw new Error(`NEXCONN_SEND_FAILED:${result.code}`);
  }

  const mapped = toChatMessage(result.data as unknown as NexconnMessage<Record<string, unknown>>);
  if (!mapped) throw new Error('NEXCONN_SEND_FAILED');
  return mapped;
}

export async function sendRoomImage(
  partnerId: string,
  roomId: string,
  file: File,
): Promise<ChatMessage> {
  await ensureChatConnected();

  const channel = new DirectChannel(toNexconnId(partnerId));
  const created = await Helper.createSendImageMessageParams(file);
  if (!created.isOk || !created.data) {
    throw new Error(`NEXCONN_SEND_FAILED:${created.code}`);
  }

  const params = created.data;
  params.metadata = { roomId };

  const result = await channel.sendMediaMessage(params);
  if (!result.isOk || !result.data) {
    throw new Error(`NEXCONN_SEND_FAILED:${result.code}`);
  }

  const mapped = toChatMessage(result.data as unknown as NexconnMessage<Record<string, unknown>>);
  if (mapped) return mapped;

  return {
    id: `local-${Date.now()}`,
    senderId: connectedUserId ?? '',
    body: '',
    kind: 'image',
    mediaUrl: URL.createObjectURL(file),
    createdAt: new Date().toISOString(),
  };
}
