// routes/anime.js
import express from 'express';
import crypto from 'crypto';
import { Anime, UserList } from '../models/index.js';
import { slugify, normalizeList } from '../utils.js';

const router = express.Router();

function getRequesterUuid(req) {
  return req.session?.user.userId;
}

/**
 * POST /anime/submit
 * body: { anime: ["Anime1", "Anime2", ...] }
 * - Adds any new anime to the global 'animes' collection
 * - Stores a userList document for this user
 */
router.post('/submit', async (req, res) => {
  try {
    const animeListInput = req.body.anime; // array of names
    const userUuid = getRequesterUuid(req);

    if (!userUuid) return res.status(400).json({ error: 'No uuid provided' });
    if (!Array.isArray(animeListInput) || !animeListInput.length)
      return res.status(400).json({ error: 'Empty list' });

    const now = new Date();
    const newAnimeEntries = [];

    // First, get the user's current anime list to check for duplicates
    const currentUserList = await UserList.findOne({ userUuid });
    const existingAnimeNames = new Set();
    
    if (currentUserList && currentUserList.animeList) {
      currentUserList.animeList.forEach(anime => {
        existingAnimeNames.add(anime.name.toLowerCase());
      });
    }

    for (let name of animeListInput) {
      name = name.trim();
      if (!name) continue;

      // Skip if already exists in user's list
      const lowerName = name.toLowerCase();
      if (existingAnimeNames.has(lowerName)) {
        continue;
      }

      const slug = slugify(name);

      // Add to global anime collection if not present
      let animeDoc = await Anime.findOne({ slug });
      if (!animeDoc) {
        await Anime.create({ name, slug, elo: 1500, createdAt: now });
      }

      newAnimeEntries.push({ name, elo: 1500 });
      existingAnimeNames.add(lowerName); // Add to set for subsequent checks in this request
    }

    if (newAnimeEntries.length === 0) {
      return res.json({ ok: true, added: 0, message: 'No new anime to add - all were duplicates' });
    }

    // Use $addToSet with $each to append multiple entries, automatically avoiding duplicates
    await UserList.findOneAndUpdate(
      { userUuid },
      { 
        $addToSet: { animeList: { $each: newAnimeEntries } },
        $set: { updatedAt: now }
      },
      { upsert: true, new: true }
    );

    res.json({ ok: true, added: newAnimeEntries.length });
  } catch (err) {
    console.error('anime submit err', err);
    res.status(500).json({ error: 'internal' });
  }
});

// GET /anime/search?query=anime_name
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: 'Query parameter required' });
    
    // Search for anime by name (case insensitive)
    const animes = await Anime.find({
      name: { $regex: new RegExp(query, 'i') }
    }).limit(10);
    
    res.json(animes);
  } catch (err) {
    console.error('anime search err', err);
    res.status(500).json({ error: 'internal' });
  }
});

export default router;
