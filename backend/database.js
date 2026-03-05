import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

let listenersRegistered = false;

function registerConnectionListeners() {
  if (listenersRegistered) {
    return;
  }

  listenersRegistered = true;

  mongoose.connection.on('connected', () => {
    console.log(`MongoDB connected: ${mongoose.connection.host}`);
  });

  mongoose.connection.on('error', (error) => {
    console.error('MongoDB connection error:', error.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected');
  });
}

function createConnectionError(error) {
  const baseMessage = `Gagal konek MongoDB: ${error.message}`;

  if (error.message.includes('MONGODB-AWS')) {
    return new Error(`${baseMessage}. Periksa konfigurasi auth MongoDB.`);
  }

  if (error.message.includes('Server selection timed out')) {
    return new Error(
      `${baseMessage}. Jika memakai MongoDB Atlas, pastikan IP kamu sudah di-whitelist, URI benar, dan cluster sedang aktif.`
    );
  }

  if (error.message.includes('bad auth') || error.message.includes('Authentication failed')) {
    return new Error(`${baseMessage}. Username atau password MongoDB kemungkinan salah.`);
  }

  return new Error(baseMessage);
}

// File ini khusus untuk koneksi database agar mudah dibaca pemula.
export async function connectDatabase() {
  const mongoUrl = process.env.MONGODB_URI;

  if (!mongoUrl) {
    throw new Error('MONGODB_URI belum diisi.');
  }

  registerConnectionListeners();

  try {
    await mongoose.connect(mongoUrl, {
      serverSelectionTimeoutMS: 30000,
      dbName: process.env.MONGODB_DB_NAME || undefined,
    });
  } catch (error) {
    throw createConnectionError(error);
  }
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
