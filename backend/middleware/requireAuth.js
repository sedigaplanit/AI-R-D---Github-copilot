// Middleware: require an active session
const requireAuth = (req, res, next) => {
  if (!req.session.user) return res.status(401).json({ message: 'Not authenticated.' });
  next();
};

module.exports = requireAuth;
