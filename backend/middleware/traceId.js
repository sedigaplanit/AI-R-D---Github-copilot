'use strict';
const crypto = require('crypto');

const attachTraceId = (req, _res, next) => {
  req.traceId = crypto.randomBytes(6).toString('hex');
  next();
};

module.exports = attachTraceId;