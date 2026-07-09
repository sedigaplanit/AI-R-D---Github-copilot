const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * Thin fetch wrapper.
 * - Always sends/receives JSON
 * - Attaches JWT from localStorage as Authorization: Bearer <token>
 * - Throws on non-2xx responses with the server's message
 */
const api = async (path, options = {}) => {
  const { body, ...rest } = options;
  const token = localStorage.getItem('jwt_token');
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...rest,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
};

export default api;
