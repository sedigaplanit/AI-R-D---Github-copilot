'use strict';
const Transport = require('winston-transport');

// Lazily required to avoid circular dependency at module load time.
// db.js has no dependency on logger.js, so this is safe.
let _pool;
const getPool = () => {
  if (!_pool) _pool = require('./db');
  return _pool;
};

/**
 * Winston transport that writes log entries to the PostgreSQL `app_logs` table.
 * Failures are silently swallowed so a DB hiccup never crashes the server.
 */
class PgTransport extends Transport {
  log(info, callback) {
    // Signal Winston that the transport has logged (non-blocking)
    setImmediate(() => this.emit('logged', info));

    // Strip ANSI colour codes that Console transport may inject
    const strip = (s) => String(s || '').replace(/\x1B\[[0-9;]*m/g, '');

    const level     = strip(info.level).toUpperCase().slice(0, 10);
    const component = strip(info.component || 'app.server').slice(0, 100);
    const message   = strip(info.message);

    getPool()
      .query(
        'INSERT INTO app_logs (logged_at, level, component, message) VALUES (NOW(), $1, $2, $3)',
        [level, component, message]
      )
      .catch(() => {}); // never throw — logging must not crash the app

    callback();
  }
}

module.exports = PgTransport;
