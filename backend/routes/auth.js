import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Message from '../models/Message.js';
import { requireAuth } from '../middleware/auth.js';
import { sendWelcomeEmail } from '../services/email.js';

const router = express.Router();
const TOKEN_EXPIRES = '30m';

function createToken(user) {
  // Token hanya berisi data penting agar sederhana.
  return jwt.sign(
    {
      userId: user._id.toString(),
      name: user.name,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: TOKEN_EXPIRES }
  );
}

function userResponse(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
  };
}

router.post('/register', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, dan password wajib diisi.' });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(409).json({ message: 'Email sudah terdaftar.' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password: hashedPassword });

  try {
    await sendWelcomeEmail({ to: user.email, name: user.name });
  } catch (error) {
    console.error('Gagal mengirim email welcome:', error.message);
  }

  return res.status(201).json({
    message: 'Register berhasil.',
    user: userResponse(user),
    token: createToken(user),
    expiresIn: TOKEN_EXPIRES,
  });
});

router.post('/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!email || !password) {
    return res.status(400).json({ message: 'Email dan password wajib diisi.' });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ message: 'Email atau password salah.' });
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return res.status(401).json({ message: 'Email atau password salah.' });
  }

  return res.json({
    message: 'Login berhasil.',
    user: userResponse(user),
    token: createToken(user),
    expiresIn: TOKEN_EXPIRES,
  });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.userId);

  if (!user) {
    return res.status(404).json({ message: 'User tidak ditemukan.' });
  }

  return res.json({ user: userResponse(user) });
});

router.delete('/delete-account', requireAuth, async (req, res) => {
  // Saat akun dihapus, semua pesan milik user juga dihapus.
  await Message.deleteMany({ userId: req.user.userId });
  const deletedUser = await User.findByIdAndDelete(req.user.userId);

  if (!deletedUser) {
    return res.status(404).json({ message: 'User tidak ditemukan.' });
  }

  return res.json({ message: 'Akun berhasil dihapus.' });
});

export default router;
