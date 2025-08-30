// server/server.js
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import authRoutes from './routes/auth.js';
import animeRoutes from './routes/anime.js';
import profileRoutes from './routes/profile.js';
import leaderboardRoutes from './routes/leaderboard.js';
import voteRoutes from './routes/vote.js';
import { initDb } from './db.js';

dotenv.config({ path: 'server/.env' });

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'supersecret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI || 'mongodb://localhost:27017/anime-elo',
      collectionName: 'sessions',
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 day
      httpOnly: true,
    },
  })
);

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected!');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};

connectDB();

app.use(express.static(path.join(__dirname, '../public')));

// ─── Routes ───
// Initialize DB first, then mount routes
initDb()
  .then(() => {
    console.log('✅ DB initialized, mounting routes');

    app.use('/auth', authRoutes);
    app.use('/anime', animeRoutes);
    app.use('/profile', profileRoutes);
    app.use('/leaderboard', leaderboardRoutes);
    app.use('/vote', voteRoutes);
    
    app.get('/ping', (req, res) => res.json({ message: 'pong' }));

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ Failed to initialize DB', err);
    process.exit(1);
  });