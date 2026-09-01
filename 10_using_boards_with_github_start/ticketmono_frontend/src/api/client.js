import { getAccessToken } from './tokenStorage'

// Fall back to the local Django dev server if the env variable is not set.
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'

// These are set once by AuthProvider after it mounts.
// The client itself has no React dependency — it just calls these callbacks
// when it needs to refresh a token or force a logout.
let _onTokenRefresh = null
let _onLogout = null

// If several requests fail with 401 at the same moment, we only want to
// call the refresh endpoint once. Storing the in-flight promise here means
// every waiting request shares the same result instead of each firing its own.
let _refreshPromise = null

// Called by AuthProvider so the client knows how to silently refresh tokens
// and how to log the user out when a refresh is no longer possible.
export function setAuthCallbacks({ onTokenRefresh, onLogout }) {
  _onTokenRefresh = onTokenRefresh
  _onLogout = onLogout
}

async function apiClient(endpoint, options = {}) {
  // Read the token at call time, not at module load time.
  // This ensures we always use the latest stored value, not a stale closure.
  const accessToken = getAccessToken()

  const headers = {
    'Content-Type': 'application/json',
    // Spread any headers the caller explicitly provided.
    ...options.headers,
    // Only attach the Authorization header if the user is actually logged in.
    // Anonymous requests (e.g. login, register) go through without a token.
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  }

  let res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers })

  // A 401 means the access token has expired. We only attempt a silent refresh
  // if both conditions are true:
  //   1. A refresh callback has been registered (AuthProvider is mounted).
  //   2. There is actually a token in storage — if there isn't, the 401 came
  //      from an anonymous request hitting a protected endpoint, which we
  //      should not silently retry.
  if (res.status === 401 && _onTokenRefresh && getAccessToken()) {
    try {
      // Deduplicate: if _refreshPromise already exists, another request got
      // here first and the refresh is already in flight. We await the same
      // promise so only one POST /auth/token/refresh/ is ever sent.
      if (!_refreshPromise) {
        _refreshPromise = _onTokenRefresh().finally(() => {
          // Clear the shared promise once the refresh settles so the next
          // expiry cycle can start fresh.
          _refreshPromise = null
        })
      }
      const newAccessToken = await _refreshPromise

      // Retry the original request with the new token.
      // We rebuild the headers object so the stale token is replaced.
      res = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers: { ...headers, Authorization: `Bearer ${newAccessToken}` },
      })
    } catch {
      // The refresh itself failed (expired refresh token, network error, etc.).
      // Force a full logout so the user is sent back to the login page.
      _onLogout?.()
    }
  }

  // Always return the Response object. The caller decides whether to
  // check res.ok, parse JSON, or throw an error.
  return res
}

export default apiClient
