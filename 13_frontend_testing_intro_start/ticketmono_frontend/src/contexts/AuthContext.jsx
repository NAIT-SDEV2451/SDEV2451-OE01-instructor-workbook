import { createContext, useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { fetchMe, loginUser, registerUser, refreshToken as refreshTokenApi } from '../api/auth'
import { setAuthCallbacks } from '../api/client'
import {
  clearStoredTokens,
  getAccessToken,
  getRefreshToken,
  getStoredUser,
  setAccessToken,
  setRefreshToken,
  setStoredUser,
} from '../api/tokenStorage'

// createContext(null) sets the default value to null.
// This default only applies when useContext is called outside a Provider —
// we guard against that in useAuth() by checking for null.
export const AuthContext = createContext(null)

// A JWT is three base64-encoded segments separated by dots: header.payload.signature
// We only need the payload (index 1), which contains user_id and token expiry.
function parseJwtPayload(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    // Return null if the token is malformed — the caller must handle this.
    return null
  }
}

export function AuthProvider({ children }) {
  // Lazy initialisers (the () => ... form) run once on mount.
  // On a page refresh the user sees their previous session immediately
  // because the stored values are read synchronously from localStorage.
  const [user, setUser] = useState(() => getStoredUser())
  const [accessToken, setAccessTokenState] = useState(() => getAccessToken())

  // Clears both React state and localStorage so no stale credentials remain.
  function clearAuthState() {
    setUser(null)
    setAccessTokenState(null)
    clearStoredTokens()
  }

  // Register the refresh and logout callbacks with apiClient once after mount.
  // They are defined inside the effect so they close over the latest state
  // setters (setAccessTokenState) rather than capturing stale values.
  useEffect(() => {
    // Called by apiClient when it receives a 401 and needs a new access token.
    // Returns the new access token string so apiClient can retry the request.
    async function onTokenRefresh() {
      const refresh = getRefreshToken()
      if (!refresh) throw new Error('No refresh token.')

      const res = await refreshTokenApi({ refresh })
      if (!res.ok) throw new Error('Token refresh failed.')

      const data = await res.json()

      // Update both localStorage and React state so future requests and
      // renders both use the new token.
      setAccessToken(data.access)
      setAccessTokenState(data.access)

      return data.access
    }

    // Called by apiClient when the refresh itself fails (e.g. the refresh token
    // has expired). A hard redirect is used instead of useNavigate because this
    // callback runs outside the React component tree inside apiClient.
    function onLogout() {
      clearAuthState()
      window.location.href = '/login'
    }

    setAuthCallbacks({ onTokenRefresh, onLogout })
  }, [])

  const loginMutation = useMutation({
    // mutationFn runs when login(credentials) is called.
    // It is async so we can await the API response before returning.
    mutationFn: async (credentials) => {
      const res = await loginUser(credentials)

      // If the server returns 4xx/5xx, res.ok is false.
      // We parse the error body so we can surface a readable message to the user.
      if (!res.ok) {
        const err = await res.json()
        // DRF returns { "detail": "No active account found..." } for bad credentials.
        throw new Error(err.detail ?? 'Login failed.')
      }

      const tokens = await res.json()
      // { access: "...", refresh: "..." }

      // Store the access token in localStorage *before* calling fetchMe.
      // apiClient reads the token from localStorage when building the
      // Authorization header, so we must put it there first.
      setAccessToken(tokens.access)

      // Fetch the full user profile. The JWT payload only contains user_id —
      // we need /auth/me/ to get username and role.
      const meRes = await fetchMe()
      const me = meRes.ok ? await meRes.json() : null

      // Return both so onSuccess has everything it needs in one place.
      return { tokens, me }
    },

    // onSuccess runs after mutationFn resolves successfully.
    // This is where we commit the auth state to React and localStorage.
    onSuccess: ({ tokens, me }) => {
      // Decode the JWT payload to extract user_id without an extra API call.
      const payload = parseJwtPayload(tokens.access)

      const newUser = payload
        ? { id: payload.user_id, username: me?.username ?? '', role: me?.role ?? 'user' }
        : null

      // Update React state so any component reading user/accessToken re-renders.
      setUser(newUser)
      setAccessTokenState(tokens.access)

      // Persist tokens and user to localStorage so the session survives a page refresh.
      setAccessToken(tokens.access)
      setRefreshToken(tokens.refresh)
      if (newUser) setStoredUser(newUser)
    },
  })

  const registerMutation = useMutation({
    mutationFn: async (userData) => {
      const res = await registerUser(userData)

      if (!res.ok) {
        const err = await res.json()
        // DRF validation errors look like: { "username": ["A user with that username already exists."] }
        // We extract the first field's first message for a readable error string.
        const firstError = Object.values(err)[0]
        throw new Error(Array.isArray(firstError) ? firstError[0] : 'Registration failed.')
      }

      // Registration does not log the user in — it only creates the account.
      // The page calling register() is responsible for redirecting to /login.
      return res.json()
    },
  })

  function logout() {
    clearAuthState()
  }

  // Expose only what consumers need. Internal implementation details
  // (setUser, setAccessTokenState, the mutation objects themselves) stay private.
  const value = {
    user,           // { id, username, role } or null
    accessToken,    // the current JWT access token string, or null
    login: loginMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
    register: registerMutation.mutate,
    isRegistering: registerMutation.isPending,
    registerError: registerMutation.error,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
