import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Official Nexconn Platform Chat API host for the Singapore data center.
// The App Secret is only ever sent to this documented host.
const NEXCONN_API_BASE = 'https://api.sg-light-api.com';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

async function sha1Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader) return json({ error: 'AUTH_REQUIRED' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) return json({ error: 'AUTH_REQUIRED' }, 401);

    const appKey = Deno.env.get('NEXCONN_APP_KEY');
    const appSecret = Deno.env.get('NEXCONN_APP_SECRET');
    if (!appKey || !appSecret) return json({ error: 'NEXCONN_NOT_CONFIGURED' }, 500);

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle();

    // Nexconn user IDs are restricted to a safe character set, so the UUID
    // hyphens are removed. The client applies the same transform.
    const nexconnUserId = user.id.replace(/-/g, '');
    const displayName =
      (profile?.display_name as string | undefined) ?? user.email?.split('@')[0] ?? 'DUOLYNK user';

    const nonce = String(Math.floor(Math.random() * 1_000_000_000));
    const timestamp = String(Date.now());
    const signature = await sha1Hex(`${appSecret}${nonce}${timestamp}`);

    const response = await fetch(`${NEXCONN_API_BASE}/v4/auth/access-token/issue`, {
      method: 'POST',
      headers: {
        'App-Key': appKey,
        Nonce: nonce,
        Timestamp: timestamp,
        Signature: signature,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId: nexconnUserId, name: displayName }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { code?: number; result?: { accessToken?: string; userId?: string }; errorMessage?: string }
      | null;

    if (!response.ok || !payload || payload.code !== 0 || !payload.result?.accessToken) {
      return json(
        {
          error: 'NEXCONN_TOKEN_FAILED',
          detail: payload?.errorMessage ?? `HTTP ${response.status}`,
        },
        502,
      );
    }

    return json({
      token: payload.result.accessToken,
      userId: payload.result.userId ?? nexconnUserId,
    });
  } catch (error) {
    return json(
      { error: 'NEXCONN_TOKEN_ERROR', detail: error instanceof Error ? error.message : 'unknown' },
      500,
    );
  }
});
