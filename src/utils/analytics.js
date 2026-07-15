const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/** Stable random ID for this browser tab session */
const getSessionId = () => {
  let id = sessionStorage.getItem('_analytics_session');
  if (!id) {
    id = Math.random().toString(36).slice(2, 12);
    sessionStorage.setItem('_analytics_session', id);
  }
  return id;
};

/** Read user id from the stored JWT without importing AuthContext */
const getUserId = () => {
  try {
    const token = localStorage.getItem('jwt_token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.id ?? null;
  } catch {
    return null;
  }
};

/**
 * Fire-and-forget analytics event sender.
 * Never throws, never blocks the UI — errors are silently swallowed.
 *
 * @param {string} event  - One of the ALLOWED_EVENTS on the backend
 * @param {object} data   - Optional: page, productId, productName, category, meta
 */
export const trackEvent = (event, data = {}) => {
  try {
    fetch(`${BASE}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event,
        sessionId: getSessionId(),
        userId: getUserId(),
        ...data,
      }),
    }).catch(() => { /* network errors silently ignored */ });
  } catch {
    /* never let analytics break the app */
  }
};
