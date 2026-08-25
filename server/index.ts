import 'dotenv/config';
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import playerRoutes from './routes/player';
import adminRoutes from './routes/admin';
import { initSocket } from './socket';

const app = express();
const server = createServer(app);
const PORT = parseInt(process.env.API_PORT || '3001', 10);

app.use(cors({ origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/, /\.ngrok-free\.dev$/, /\.ngrok-free\.app$/], credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/player', playerRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Serve built frontend for ngrok access
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('/*splat', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

initSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
