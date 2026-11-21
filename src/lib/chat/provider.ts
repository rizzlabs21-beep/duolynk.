/**
 * Chat transport status.
 *
 * Room chat is delivered by the Nexconn Chat SDK. Access tokens are issued by
 * the `nexconn-token` Edge Function so the App Secret never reaches the browser.
 */

export type ChatTransport = 'nexconn';

export interface ChatProviderStatus {
  transport: ChatTransport;
  label: string;
  live: boolean;
  summary: string;
  missing: string[];
}

export function getChatProviderStatus(): ChatProviderStatus {
  return {
    transport: 'nexconn',
    label: 'Nexconn Chat SDK',
    live: true,
    summary:
      'Messages are delivered by the Nexconn Chat SDK in real time. Only the two room members can read them, and message history is stored by Nexconn instead of the DUOLYNK database.',
    missing: [],
  };
}

export const NEXCON_INTEGRATION_NOTE =
  'Room chat is delivered by the Nexconn Chat SDK. Messages are sent and received in real time and stored by Nexconn, not in the DUOLYNK database.';
