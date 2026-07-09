const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * Thin fetch wrapper.
 * - Always sends/receives JSON
 * - Includes credentials (session cookie)
 * - Throws on non-2xx responses with the server's message
 */
const api = async (path, options = {}) => {
  const { body, ...rest } = options;
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...rest,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
};

export default api;
