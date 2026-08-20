'use strict';
const os = require('os');

// ── Config (env-overridable, defaults tuned for the demo) ─────────────────
const THREAD     = process.env.LOG_THREAD     || 'http-nio-8080-exec-1';
const SYSTEM     = process.env.LOG_SYSTEM     || 'APPLICATION';
const ENV_NAME   = process.env.LOG_ENV        || 'shedst1-trust-ven';
const COMPANY_ID = process.env.LOG_COMPANY_ID || '8267';
const LOGGER     = 'HTTP_REQUEST_JOURNAL';
const MAX_FIELD  = 2000;

const HOSTNAME = os.hostname();
let _seq = 0;

const SENSITIVE = /password|passwd|secret|token|hash|authorization|cookie/i;

// ── Small formatting helpers ──────────────────────────────────────────────
const pad = (n, w = 2) => String(n).padStart(w, '0');

function fmtStamp(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
         `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())},${pad(d.getMilliseconds(), 3)}`;
}

const strip = (v) => {
  if (v == null) return '';
  return String(v).replace(/[\t\r\n]/g, ' ').slice(0, MAX_FIELD);
};

const headerList = (v) => strip(Array.isArray(v) ? v.join(', ') : v);

const titleCaseHeader = (s) => s.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('-');

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

function buildHeaders(raw) {
  const out = {};
  for (const k of Object.keys(raw || {})) {
    const val = raw[k];
    out[titleCaseHeader(k)] = [strip(Array.isArray(val) ? val.join(', ') : val)];
  }
  return out;
}

function javaMap(headers) {
  const entries = Object.entries(headers || {});
  if (!entries.length) return '[]';
  return '[' + entries
    .map(([k, v]) => `${titleCaseHeader(k)}=[${headerList(v)}]`)
    .join(',') + ']';
}

function buildJournalLine(ctx) {
  const {
    start, end, reqId, trace, thread, system, envName, hostname,
    companyId, accountId, sessionId, uri, method, contentType, contentLength,
    userAgent, cookie, reqHeaders, dto, queryParameters, queryString,
    status, resSize, resHeaders, resCookies, errorCode, messages,
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

  const resCookiesStr = Array.isArray(resCookies) ? resCookies.join(', ') : (resCookies || '');

  const fields = [
    fmtStamp(start),
    `[${strip(reqId)}]`,
    `[${strip(trace)}]`,
    `[${strip(thread)}]`,
    `[INFO ]`,
    `[${LOGGER}]`,
    strip(sessionId),
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
    strip(contentLength != null ? String(contentLength) : ''),
    '',
    strip(userAgent),
    strip(cookie),
    reqHeadersJson,
    reqBodyJson,
    strip(String(status)),
    strip(String(resSize ?? 0)),
    strip(resCookiesStr),
    javaMap(resHeaders),
    '',
    strip(String(errorCode ?? 0)),
    Array.isArray(messages) && messages.length ? `[${messages.map(strip).join(', ')}]` : '[]',
    fmtStamp(end),
    `${Math.max(0, end.getTime() - start.getTime())}[msec]`,
  ];

  return fields.join('\t');
}

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

function requestJournal(req, res, next) {
  if (process.env.LOG_JOURNAL === 'false') return next();
  if (shouldSkip(req.path)) return next();

  const { logger } = require('../logger');

  const start = new Date();
  const seq = String(++_seq).padStart(8, '0');
  const compact = `${start.getFullYear()}${pad(start.getMonth() + 1)}${pad(start.getDate())}` +
                  `${pad(start.getHours())}${pad(start.getMinutes())}${pad(start.getSeconds())}`;
  const reqId = req.headers['x-request-id'] || req.traceId || `${HOSTNAME}${compact}${seq}`;
  const trace = req.headers['x-trace-id'] || `*${reqId}`;

  const isJson = (req.headers['content-type'] || '').includes('application/json');
  const dto = isJson ? (req.body || {}) : {};

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
        } catch (_) { }
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
        sessionId: req.session ? req.session.id : (req.headers['x-session-id'] || ''),
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
        resCookies: res.getHeader('set-cookie'),
        errorCode,
        messages,
      });

      logger.info({ component: LOGGER, message: line });
    } catch (err) {
      try { logger.error({ component: LOGGER, message: `journal error: ${err.message}` }); } catch (_) { }
    }
  }

  next();
}

module.exports = requestJournal;
module.exports.buildJournalLine = buildJournalLine;
module.exports.maskBody = maskBody;
module.exports.javaMap = javaMap;
module.exports.fmtStamp = fmtStamp;