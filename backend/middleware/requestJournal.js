'use strict';
/**
 * Express middleware that logs every HTTP request/response as a single
 * tab-separated "request journal" line, in the same shape as the legacy
 * enterprise access journal (see the production sample in the brief).
 *
 *  <startTs> [<reqId>] [*<traceId>] [<thread>] [<level>] [HTTP_REQUEST_JOURNAL]
 *     <empty> HTTP_RES FILTER <env> <host> APPLICATION <companyId> <accountId>
 *     <uri> <METHOD> <contentType> <contentLength> <empty> <userAgent> <cookie>
 *     <reqHeadersJson> <reqBodyJson> <status> <resSize> <empty> <resHeadersJava>
 *     <empty> <errorCode> <messages> <endTs> <elapsed>[msec]
 *
 * The whole line is emitted through Winston as a normal INFO entry whose
 * component is set to HTTP_REQUEST_JOURNAL so all transports (console, file,
 * Postgres) and the /download endpoint treat it verbatim.
 */
const os = require('os');

// ── Config (env-overridable, defaults tuned for the demo) ─────────────────
const THREAD     = process.env.LOG_THREAD  || 'node-http';
const SYSTEM     = process.env.LOG_SYSTEM  || 'APPLICATION';
const ENV_NAME   = process.env.LOG_ENV     || (process.env.NODE_ENV || 'dev');
const COMPANY_ID = process.env.LOG_COMPANY_ID || '0000';
const LOGGER     = 'HTTP_REQUEST_JOURNAL';
const MAX_FIELD  = 2000;

const HOSTNAME = os.hostname();
let _seq = 0;

const SENSITIVE = /password|passwd|secret|token|hash|authorization|cookie/i;

// ── Small formatting helpers ──────────────────────────────────────────────
const pad = (n, w = 2) => String(n).padStart(w, '0');

/** Java-style "yyyy-MM-dd HH:mm:ss,SSS" stamp. */
function fmtStamp(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
         `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())},${pad(d.getMilliseconds(), 3)}`;
}

/** Never let a tab/CR/LF split the line, and cap runaway values. */
const strip = (v) => {
  if (v == null) return '';
  return String(v).replace(/[\t\r\n]/g, ' ').slice(0, MAX_FIELD);
};

/** Flatten a string[] to "a, b" before stripping, then wrap for Java maps. */
const headerList = (v) => strip(Array.isArray(v) ? v.join(', ') : v);

/** Recursively redact sensitive keys (password, token, secret, ...). */
function maskBody(obj, depth = 0) {
  if (obj == null) return obj;
  if (depth > 5) return strip(String(obj));
  if (Array.isArray(obj)) return obj.map((x) => maskBody(x, depth + 1));
  if (typeof obj === 'object') {
    const out = {};
    for (const k of Object.keys(obj)) out[k] = SENSITIVE.test(k) ? '*****' : maskBody(obj[k], depth + 1);
    return out;
  }
  return strip(obj);
}

/** Java Map#toString style: "[K=[v1,v2],K2=[v]]". */
function javaMap(headers) {
  const entries = Object.entries(headers || {});
  if (!entries.length) return '[]';
  return '[' + entries
    .map(([k, v]) => `${k}=[${headerList(v)}]`)
    .join(',') + ']';
}

/** Plain header object (Node raw headers -> sanitized strings). */
function buildHeaders(raw) {
  const out = {};
  for (const k of Object.keys(raw || {})) out[k] = headerList(raw[k]);
  return out;
}

/**
 * Pure builder — everything is resolved by the caller so the exact same line
 * can be reproduced under test. Returns the joined, tab-separated string.
 */
function buildJournalLine(ctx) {
  const {
    start, end, reqId, trace, thread, system, envName, hostname,
    companyId, accountId, uri, method, contentType, contentLength,
    userAgent, cookie, reqHeaders, dto, queryParameters, queryString,
    status, resSize, resHeaders, errorCode, messages,
  } = ctx;

  const reqHeadersJson = JSON.stringify(buildHeaders(reqHeaders));

  let reqBodyJson = JSON.stringify({
    dto: maskBody(dto),
    headers: buildHeaders(reqHeaders),
    queryParameters: queryParameters || {},
    queryString: queryString || '',
    uploadedFileInfoMap: {},
  });
  if (reqBodyJson.length > MAX_FIELD) reqBodyJson = reqBodyJson.slice(0, MAX_FIELD) + '…';

  const fields = [
    fmtStamp(start),
    `[${strip(reqId)}]`,
    `[${strip(trace)}]`,
    `[${strip(thread)}]`,
    `[INFO ]`,
    `[${LOGGER}]`,
    '',
    'HTTP_RES',
    'FILTER',
    strip(envName),
    strip(hostname) || HOSTNAME,
    strip(system),
    strip(companyId),
    strip(accountId),
    strip(uri),
    strip(method),
    strip(contentType),
    strip(String(contentLength ?? 0)),
    '',
    strip(userAgent),
    strip(cookie),
    reqHeadersJson,
    reqBodyJson,
    strip(String(status)),
    strip(String(resSize ?? 0)),
    '',
    javaMap(resHeaders),
    '',
    strip(String(errorCode ?? 0)),
    Array.isArray(messages) && messages.length ? `[${messages.map(strip).join(',')}]` : '[]',
    fmtStamp(end),
    `${Math.max(0, end.getTime() - start.getTime())}[msec]`,
  ];

  return fields.join('\t');
}


/** Paths skipped by default (can be replaced with LOG_SKIP regex). */
const DEFAULT_SKIP = /^\/(api\/health|api\/events|api\/admin\/logs)(\/|$)/;
const SKIP_RE = (() => {
  const raw = process.env.LOG_SKIP;
  if (!raw) return null;
  try { return new RegExp(raw); } catch (_) { return null; }
})();
const shouldSkip = (path) => (SKIP_RE ? SKIP_RE.test(path) : DEFAULT_SKIP.test(path));

const bufLen = (c) => {
  if (c == null) return 0;
  if (Buffer.isBuffer(c)) return c.length;
  return Buffer.byteLength(String(c), 'utf8');
};

/**
 * Express middleware. Lazy-requires the logger so the pure builder can be
 * unit-tested without booting the DB transports.
 */
function requestJournal(req, res, next) {
  if (process.env.LOG_JOURNAL === 'false') return next();
  if (shouldSkip(req.path)) return next();

  const { logger } = require('../logger');

  const start = new Date();
  const seq = String(++_seq).padStart(8, '0');
  const compact = `${start.getFullYear()}${pad(start.getMonth() + 1)}${pad(start.getDate())}` +
                  `${pad(start.getHours())}${pad(start.getMinutes())}${pad(start.getSeconds())}`;
  const reqId = `${HOSTNAME}${compact}${seq}`;
  const trace = req.headers['x-trace-id'] || `*${reqId}`;

  const isJson = (req.headers['content-type'] || '').includes('application/json');
  const dto = isJson ? (req.body || {}) : {};

  // Instrument the response so we can count bytes and sniff an error body.
  const origEnd = res.end;
  const origWrite = res.write;
  let outBytes = 0;
  let bodyText = '';

  res.write = function (chunk) {
    if (chunk != null) { outBytes += bufLen(chunk); bodyText += chunk; }
    return origWrite.apply(this, arguments);
  };
  res.end = function (chunk) {
    if (chunk != null) { outBytes += bufLen(chunk); bodyText += chunk; }
    res.once('finish', finalize);
    return origEnd.apply(this, arguments);
  };

  function finalize() {
    // Restore originals regardless of outcome.
    res.write = origWrite;
    res.end = origEnd;

    try {
      const end = new Date();
      const status = res.statusCode || 200;
      const resHeaders = res.getHeaders();
      const resSize = res.getHeader('content-length') || outBytes || 0;

      let errorCode = '0';
      let messages = [];
      if (res.locals && res.locals.logErrorCode != null) errorCode = res.locals.logErrorCode;
      if (res.locals && Array.isArray(res.locals.logMessages) && res.locals.logMessages.length) {
        messages = res.locals.logMessages;
      } else if (status >= 400 && (res.getHeader('content-type') || '').includes('application/json')) {
        let msgText = '';
        try {
          const parsed = JSON.parse(bodyText);
          if (parsed && parsed.message) msgText = parsed.message;
        } catch (_) { /* non-JSON error body */ }
        if (msgText) {
          errorCode = '200';
          messages = [`MessageId=HTTP_${status}, MessageTextSummary=${msgText}, MessageTextDetail=null, TargetProperties=[]`];
        }
      }

      const line = buildJournalLine({
        start, end,
        reqId, trace,
        thread: THREAD, system: SYSTEM, envName: ENV_NAME, hostname: HOSTNAME,
        companyId: COMPANY_ID,
        accountId: req.user ? `ACC${String(req.user.id).padStart(7, '0')}` : 'null',
        uri: (req.originalUrl || req.url || '').split('?')[0],
        method: req.method,
        contentType: req.headers['content-type'],
        contentLength: req.headers['content-length'],
        userAgent: req.headers['user-agent'],
        cookie: req.headers.cookie,
        reqHeaders: req.headers,
        dto,
        queryParameters: req.query || {},
        queryString: (req.originalUrl || req.url || '').split('?')[1] || '',
        status, resSize, resHeaders,
        errorCode,
        messages,
      });

      logger.info({ component: LOGGER, message: line });
    } catch (err) {
      try { logger.error({ component: LOGGER, message: `journal error: ${err.message}` }); } catch (_) { /* never crash */ }
    }
  }

  next();
}

module.exports = requestJournal;
module.exports.buildJournalLine = buildJournalLine;
module.exports.maskBody = maskBody;
module.exports.javaMap = javaMap;
module.exports.fmtStamp = fmtStamp;

