const jwt = require('jsonwebtoken');

const requireAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ message: 'Not authenticated.' });

  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'dev_jwt_secret');
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

module.exports = requireAuth;
