import express from 'express';
import dotenv from 'dotenv';
import cookieSession from 'cookie-session';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb } from './db.js';

import authRoutes from './routes/auth.js';
import animeRoutes from './routes/anime.js';
import voteRoutes from './routes/vote.js';
import leaderboardRoutes from './routes/leaderboard.js';
import homeRoutes from './routes/home.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

await initDb(); // ensure DB connected + indexes created

const app = express();

app.use(express.json({ limit: '1mb' }));

app.use(cookieSession({
  name: 'sid',
  keys: [process.env.SESSION_SECRET || 'dev-secret'],
  maxAge: 7 * 24 * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production'
}));

// basic rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120
});
app.use(limiter);

// static files (if you later add a frontend in /public)
app.use(express.static(path.join(__dirname, 'public')));

// mount routes
app.use('/auth', authRoutes);
app.use('/anime', animeRoutes);
app.use('/vote', voteRoutes);
app.use('/leaderboard', leaderboardRoutes);
app.use('/home', homeRoutes);

// simple health
app.get('/health', (req, res) => res.json({ ok: true, env: process.env.NODE_ENV || 'development' }));

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
