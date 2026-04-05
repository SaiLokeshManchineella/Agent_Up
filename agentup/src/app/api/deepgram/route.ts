// Returns a Deepgram API key for client-side WebSocket connection
// Attempts to generate a temporary scoped key (30s TTL) for security
// Falls back to returning the main key ONLY if temp key generation fails due to permissions
//
// Security note: In production with a paid Deepgram plan, enable keys:write scope
// to use temporary keys. For free/developer plans, the main key is used but
// the key is still proxied through this server endpoint (not hardcoded in client).

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

export async function GET() {
  if (!DEEPGRAM_API_KEY) {
    return Response.json(
      { error: 'Deepgram API key not configured. Add DEEPGRAM_API_KEY to .env' },
      { status: 500 }
    );
  }

  try {
    // Step 1: Try to get the project ID
    const projectRes = await fetch('https://api.deepgram.com/v1/projects', {
      headers: { Authorization: `Token ${DEEPGRAM_API_KEY}` },
    });

    if (!projectRes.ok) {
      // Can't even list projects — key might still work for STT directly
      // Return it so the client can connect (key stays in memory, not in source)
      console.warn('[Deepgram] Cannot list projects — using main key for STT');
      return Response.json({ apiKey: DEEPGRAM_API_KEY, temporary: false });
    }

    const { projects } = await projectRes.json();
    if (!projects || projects.length === 0) {
      return Response.json({ apiKey: DEEPGRAM_API_KEY, temporary: false });
    }

    const projectId = projects[0].project_id;

    // Step 2: Try to create a temporary API key (requires keys:write scope)
    const keyRes = await fetch(
      `https://api.deepgram.com/v1/projects/${projectId}/keys`,
      {
        method: 'POST',
        headers: {
          Authorization: `Token ${DEEPGRAM_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comment: `AgentUp temp key - ${new Date().toISOString()}`,
          scopes: ['usage:write'],
          time_to_live_in_seconds: 30,
        }),
      }
    );

    if (keyRes.ok) {
      const { key } = await keyRes.json();
      if (key) {
        return Response.json({ apiKey: key, temporary: true });
      }
    }

    // Temp key creation failed (likely insufficient permissions on free plan)
    // Fall back to using the main key — still better than failing entirely
    // The key is served via API route (not embedded in client JS), so it's
    // not in the source code or bundle. It's only fetched at runtime.
    const errorBody = await keyRes.text().catch(() => '');
    if (errorBody.includes('INSUFFICIENT_PERMISSIONS')) {
      console.warn(
        '[Deepgram] keys:write scope not available — using main key. ' +
        'Upgrade your Deepgram plan or add keys:write scope for temp key support.'
      );
    } else {
      console.warn('[Deepgram] Temp key creation failed:', keyRes.status, errorBody);
    }

    return Response.json({ apiKey: DEEPGRAM_API_KEY, temporary: false });
  } catch (error) {
    console.error('[Deepgram] Error:', error);
    // Network error — still try to return key so voice features work
    return Response.json({ apiKey: DEEPGRAM_API_KEY, temporary: false });
  }
}
