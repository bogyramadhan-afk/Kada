import express from 'express';
import Message from '../models/Message.js';
import { requireAuth } from '../middleware/auth.js';
import { sendMessageCopy } from '../services/email.js';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  const messages = await Message.find().sort({ createdAt: -1 });
  return res.json(messages);
});

router.post('/', requireAuth, async (req, res) => {
  const text = String(req.body.text || '').trim();

  if (!text) {
    return res.status(400).json({ message: 'Isi pesan wajib diisi.' });
  }

  const message = await Message.create({
    userId: req.user.userId,
    authorName: req.user.name,
    text,
  });

  return res.status(201).json(message);
});

router.delete('/:id', requireAuth, async (req, res) => {
  const message = await Message.findById(req.params.id);

  if (!message) {
    return res.status(404).json({ message: 'Pesan tidak ditemukan.' });
  }

  if (message.userId.toString() !== req.user.userId) {
    return res.status(403).json({ message: 'Pesan hanya bisa dihapus pemiliknya.' });
  }

  await Message.findByIdAndDelete(req.params.id);
  return res.json({ message: 'Pesan berhasil dihapus.' });
});

router.post('/:id/email', requireAuth, async (req, res) => {
  const message = await Message.findById(req.params.id);

  if (!message) {
    return res.status(404).json({ message: 'Pesan tidak ditemukan.' });
  }

  const to = String(req.body.to || req.user.email || '').trim();
  if (!to) {
    return res.status(400).json({ message: 'Email tujuan wajib diisi.' });
  }

  const result = await sendMessageCopy({
    to,
    subject: 'Copy pesan dari message board',
    text: `Pengirim: ${message.authorName}\nPesan: ${message.text}`,
  });

  return res.json({
    message: result.logged ? 'SMTP belum ada. Isi email dicetak ke console.' : 'Email berhasil dikirim.',
  });
});

export default router;
