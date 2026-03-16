const CLIENT_ID = 'Iv1.b507a08c87ecfe98'

interface DeviceCodeResponse {
  device_code: string
  user_code: string
  verification_uri: string
  interval: number
  expires_in: number
}

interface PollResult {
  status: 'pending' | 'expired' | 'token'
  token?: string
}

interface CopilotToken {
  token: string
  expires_at: number
}

// Cached Copilot token + refresh lock
let cachedToken: CopilotToken | null = null
let refreshPromise: Promise<string> | null = null

export async function requestDeviceCode(): Promise<DeviceCodeResponse> {
  const res = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ client_id: CLIENT_ID, scope: 'read:user' }),
  })
  if (!res.ok) {
    throw new Error(`Device code request failed: ${res.status}`)
  }
  return res.json()
}

export async function pollForToken(deviceCode: string): Promise<PollResult> {
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      device_code: deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    }),
  })
  if (!res.ok) {
    throw new Error(`Token poll failed: ${res.status}`)
  }
  const data = await res.json()

  if (data.access_token) {
    return { status: 'token', token: data.access_token }
  }
  if (data.error === 'authorization_pending' || data.error === 'slow_down') {
    return { status: 'pending' }
  }
  if (data.error === 'expired_token') {
    return { status: 'expired' }
  }
  throw new Error(data.error_description || data.error || 'Unknown OAuth error')
}

export async function getCopilotToken(githubToken: string): Promise<string> {
  // Return cached token if still valid (with 5-minute buffer)
  if (cachedToken && Date.now() / 1000 < cachedToken.expires_at - 300) {
    return cachedToken.token
  }

  // Dedup concurrent refreshes
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    try {
      const res = await fetch('https://api.github.com/copilot_internal/v2/token', {
        headers: {
          Authorization: `token ${githubToken}`,
          'User-Agent': 'Manubot',
        },
      })
      if (res.status === 403) {
        throw new Error('No active GitHub Copilot subscription found for this account.')
      }
      if (!res.ok) {
        throw new Error(`Copilot token exchange failed: ${res.status}`)
      }
      const data = await res.json()
      cachedToken = { token: data.token, expires_at: data.expires_at }
      return data.token
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

export function clearCopilotTokenCache(): void {
  cachedToken = null
}
