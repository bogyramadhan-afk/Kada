import jwt from 'jsonwebtoken';

function readBearerToken(headerValue) {
  const [type, token] = String(headerValue || '').split(' ');
  return type === 'Bearer' && token ? token : null;
}

// Middleware itu berguna untuk memastikan route hanya bisa dipakai user yang login.
export function requireAuth(req, res, next) {
  const token = readBearerToken(req.headers.authorization);

  if (!token) {
    return res.status(401).json({ message: 'Authorization: Bearer <token> wajib dikirim.' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token tidak valid atau sudah expired.' });
  }
}
