const jwt = require('jsonwebtoken');

function verifikasiToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ berhasil: false, pesan: 'Token tidak ditemukan. Akses ditolak.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ berhasil: false, pesan: 'Token tidak valid atau sudah kedaluwarsa.' });
  }
}

module.exports = { verifikasiToken };
