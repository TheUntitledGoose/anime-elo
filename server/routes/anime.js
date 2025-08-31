// routes/anime.js
import express from 'express';
import crypto from 'crypto';
import { Anime, UserList } from '../models/index.js';
import { slugify, normalizeList } from '../utils.js';
import { error } from 'console';

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
    
    // Also check against all anime in the global database for duplicates
    const allAnimes = await Anime.find({});
    allAnimes.forEach(anime => {
      existingAnimeNames.add(anime.name.toLowerCase());
    });

    // Keep track of duplicates within the current submission
    const seenInSubmission = new Set();
    const uniqueAnimeList = [];
    const duplicateNames = [];

    // Filter out duplicates within the same submission (case insensitive)
    for (let name of animeListInput) {
      name = name.trim();
      if (!name) continue;

      const lowerName = name.toLowerCase();
      if (seenInSubmission.has(lowerName)) {
        duplicateNames.push(name); // Keep track of duplicates for error message
        continue; // Skip duplicates in this submission
      }
      seenInSubmission.add(lowerName);
      uniqueAnimeList.push(name); // Keep track of unique names for processing
    }

    // Now check each unique anime against the existing database and user list
    const duplicateNamesFromDatabase = [];
    for (let name of uniqueAnimeList) {
      name = name.trim();
      if (!name) continue;

      const lowerName = name.toLowerCase();
      
      // Check if this anime already exists in the global database or user's list
      if (existingAnimeNames.has(lowerName)) {
        duplicateNamesFromDatabase.push(name);
        continue; // Skip if it already exists anywhere
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

    // If we have duplicates from the database or submission, return error with all duplicates
    if (duplicateNames.length > 0 || duplicateNamesFromDatabase.length > 0) {
      const allDuplicates = [...duplicateNames, ...duplicateNamesFromDatabase];
      return res.status(400).json({ error: 'duplicates found', duplicates: allDuplicates });
    }

    if (newAnimeEntries.length === 0) {
      // Check if we have duplicates but no new entries
      if (duplicateNames.length > 0 && uniqueAnimeList.length === 0) {
        return res.status(400).json({ error: 'duplicates found', duplicates: duplicateNames });
      }
      return res.json({ error: 'No new anime to add - all were duplicates' });
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
      // Check if this is specifically a duplicate error or other issue
      if (err.message && err.message.includes('duplicate')) {
        res.status(400).json({ error: 'duplicates found' });
      } else {
        res.status(500).json({ error: 'internal' });
      }
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
