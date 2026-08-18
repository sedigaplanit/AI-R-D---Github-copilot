'use strict';
const { createLogger, format, transports } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const PgTransport     = require('./dbTransport');
const path = require('path');

// ── Masking helpers ────────────────────────────────────────────────────────────

/** us**@example.com  — keeps domain visible, masks local part after first 2 chars */
const maskEmail = (email) => {
  if (!email || typeof email !== 'string') return '***';
  const at = email.indexOf('@');
  if (at < 0) return '***';
  return email.slice(0, 2) + '**' + email.slice(at);
};

/** "John Smith"  →  "J*** S***" */
const maskName = (name) => {
  if (!name || typeof name !== 'string') return '***';
  return name
    .split(' ')
    .map((w) => (w[0] || '') + '***')
    .join(' ');
};

/** 42  →  "usr_**42"  (last 2 digits visible) */
const maskUserId = (id) => {
  if (id == null) return 'usr_****';
  const s = String(id);
  return 'usr_' + '*'.repeat(Math.max(0, s.length - 2)) + s.slice(-2);
};

/**
 * sess_abc123def0 — sanitizes and truncates a client-supplied session id.
 * Shared by every route that logs a session, so the same input always
 * produces the same token and journeys stay joinable across log lines.
 */
const formatSessionId = (sessionId) => {
  if (!sessionId) return 'sess_unknown';
  return `sess_${String(sessionId).replace(/[^a-z0-9]/gi, '').slice(0, 10)}`;
};


// ── Log line format ────────────────────────────────────────────────────────────
const lineFormat = format.printf((info) => {
  // Pad level to 5 chars (e.g., "INFO ")
  const level = String(info.level || 'info').toUpperCase().padEnd(5);
  
  // Extract metadata (use '-' or fallback values if not provided in the log call)
  const reqId = info.requestId || '-';
  const traceId = info.traceId || `*${reqId}`; 
  // Node is single-threaded, but you can hardcode a Tomcat-like name if your log parser requires it
  const thread = info.thread || 'http-nio-8080-exec-1'; 
  const component = info.component || 'APPLICATION';
  
  // Notice in your sample, there's an empty tab column when no session exists, 
  // or a UUID when it does exist right after the component.
  const sessionId = info.sessionId || ''; 

  // Assemble the tab-separated line
  return `${info.timestamp}\t[${reqId}]\t[${traceId}]\t[${thread}]\t[${level}]\t[${component}]\t${sessionId}\t${info.message}`;
});

// ── Transports ─────────────────────────────────────────────────────────────────
const logsDir = path.join(__dirname, 'logs');

const logger = createLogger({
  level: 'info',
  transports: [
    // Console
    new transports.Console({
      format: format.combine(
        format.colorize({ all: true }),
        // 1. Changed .SSS to ,SSS
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss,SSS' }),
        lineFormat
      ),
    }),
    // Daily rotating file
    new DailyRotateFile({
      dirname: logsDir,
      filename: 'app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
      zippedArchive: true,
      format: format.combine(
        // 1. Changed .SSS to ,SSS
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss,SSS' }),
        lineFormat
      ),
    }),
    // PostgreSQL transport
    new PgTransport({ level: 'info' }),
  ],
});

module.exports = { logger, maskEmail, maskName, maskUserId, formatSessionId };