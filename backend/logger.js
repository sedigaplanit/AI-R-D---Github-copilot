'use strict';
const { createLogger, format, transports } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const PgTransport     = require('./dbTransport');
const path = require('path');

// ── Masking helpers ────────────────────────────────────────────────────────────

const maskEmail = (email) => {
  if (!email || typeof email !== 'string') return '***';
  const at = email.indexOf('@');
  if (at < 0) return '***';
  return email.slice(0, 2) + '**' + email.slice(at);
};

const maskName = (name) => {
  if (!name || typeof name !== 'string') return '***';
  return name
    .split(' ')
    .map((w) => (w[0] || '') + '***')
    .join(' ');
};

const maskUserId = (id) => {
  if (id == null) return 'usr_****';
  const s = String(id);
  return 'usr_' + '*'.repeat(Math.max(0, s.length - 2)) + s.slice(-2);
};

const formatSessionId = (sessionId) => {
  if (!sessionId) return 'sess_unknown';
  return `sess_${String(sessionId).replace(/[^a-z0-9]/gi, '').slice(0, 10)}`;
};

// ── Log line format ────────────────────────────────────────────────────────────
const lineFormat = format.printf((info) => {
  // Bypass Winston formatting entirely if the payload is a pre-formatted journal line
  if (info.component === 'HTTP_REQUEST_JOURNAL') {
    return info.message;
  }

  // Standard formatting for regular application logs
  const level = String(info.level || 'info').toUpperCase().padEnd(5);
  const reqId = info.requestId || '-';
  const traceId = info.traceId || `*${reqId}`; 
  const thread = info.thread || 'http-nio-8080-exec-1'; 
  const component = info.component || 'APPLICATION';
  const sessionId = info.sessionId || ''; 

  return `${info.timestamp}\t[${reqId}]\t[${traceId}]\t[${thread}]\t[${level}]\t[${component}]\t${sessionId}\t${info.message}`;
});

// ── Transports ─────────────────────────────────────────────────────────────────
const logsDir = path.join(__dirname, 'logs');

const logger = createLogger({
  level: 'info',
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize({ all: true }),
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss,SSS' }),
        lineFormat
      ),
    }),
    new DailyRotateFile({
      dirname: logsDir,
      filename: 'app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
      zippedArchive: true,
      format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss,SSS' }),
        lineFormat
      ),
    }),
    new PgTransport({ level: 'info' }),
  ],
});

module.exports = { logger, maskEmail, maskName, maskUserId, formatSessionId };