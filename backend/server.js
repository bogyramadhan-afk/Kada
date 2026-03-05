import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import dotenv from 'dotenv';
import { connectDatabase, disconnectDatabase } from './database.js';
import authRoutes from './routes/auth.js';
import messageRoutes from './routes/messages.js';
import paymentRoutes from './routes/paymentRoutes.js';
import { checkStatus } from './midtrans.js';

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'frontend', 'public');
const port = Number(process.env.PORT || 3000);

function createProxyList() {
  return [
    { key: 'local', label: 'Local', url: 'http://localhost:3000/notes' },
    { key: 'vercel', label: 'Vercel', url: 'https://kada-six.vercel.app/notes' },
    { key: 'custom', label: 'lenkada.my.id', url: 'https://www.lenkada.my.id/notes' },
  ];
}

async function proxyRequest(req, res) {
  const target = String(req.query.target || '').trim();
  const server = createProxyList().find((item) => item.key === target);

  if (!server) {
    return res.status(400).json({ message: 'Target proxy tidak dikenal.' });
  }

  const extraPath = req.params.id ? `/${req.params.id}` : '';
  const targetUrl = `${server.url}${extraPath}`;

  const response = await fetch(targetUrl, {
    method: req.method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: req.headers.authorization || '',
    },
    body: req.method === 'GET' ? undefined : JSON.stringify(req.body || {}),
  });

  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch (error) {
      data = { message: text };
    }
  }

  return res.status(response.status).json(data);
}

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
});

app.use(express.json());
app.use(express.static(publicDir));

app.get('/api/config', (req, res) => {
  return res.json({
    apiBaseUrl: process.env.API_BASE_URL || `http://localhost:${port}`,
    midtransClientKey: process.env.MIDTRANS_CLIENT_KEY || '',
    proxies: createProxyList(),
  });
});

app.post('/api/proxy/messages', proxyRequest);
app.get('/api/proxy/messages', proxyRequest);
app.delete('/api/proxy/messages/:id', proxyRequest);

app.use('/auth', authRoutes);
app.use('/messages', messageRoutes);
app.use('/notes', messageRoutes);
app.use('/payment', paymentRoutes);
app.get('/api/midtrans/status/:orderId', checkStatus);

app.get('/', (req, res) => {
  return res.sendFile(path.join(publicDir, 'index.html'));
});

app.get('/auth.html', (req, res) => {
  return res.sendFile(path.join(publicDir, 'auth.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  return res.status(500).json({ message: 'Server error.' });
});

let server = null;

async function startServer() {
  await connectDatabase();

  server = app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

async function shutdown(signal) {
  console.log(`${signal} diterima. Menutup server...`);

  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  await disconnectDatabase();
  process.exit(0);
}

process.on('SIGINT', () => {
  shutdown('SIGINT').catch((error) => {
    console.error('Gagal shutdown server:', error.message);
    process.exit(1);
  });
});

process.on('SIGTERM', () => {
  shutdown('SIGTERM').catch((error) => {
    console.error('Gagal shutdown server:', error.message);
    process.exit(1);
  });
});

startServer().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
