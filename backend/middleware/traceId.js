'use strict';
const crypto = require('crypto');

/**
 * Generates a random 12-character hex trace ID and attaches it to every
 * incoming request as `req.traceId`.  Route handlers prefix it semantically
 * (e.g. `auth_${req.traceId}`) in their log messages.
 */
const attachTraceId = (req, _res, next) => {
  req.traceId = crypto.randomBytes(6).toString('hex');
  next();
};

module.exports = attachTraceId;
