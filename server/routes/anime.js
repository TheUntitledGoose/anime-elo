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

    for (let name of animeListInput) {
      name = name.trim();
      if (!name) continue;

      const slug = slugify(name);

      // Add to global anime collection if not present
      let animeDoc = await Anime.findOne({ slug });
      if (!animeDoc) {
        await Anime.create({ name, slug, elo: 1500, createdAt: now });
      }

      newAnimeEntries.push({ name, elo: 1500 });
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

export default router;