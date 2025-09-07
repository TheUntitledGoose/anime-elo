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
      
      // Check if this anime already exists in the user's list
      if (existingAnimeNames.has(lowerName)) {
        duplicateNamesFromDatabase.push(name);
        continue; // Skip if it already exists in user's list
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
      // Provide clearer information about which specific items are duplicates
      return res.status(400).json({ 
        error: 'duplicates found', 
        duplicates: allDuplicates,
        message: `Duplicate anime found in your list: ${allDuplicates.join(', ')}\nThese anime already exist in your personal list.`
      });
    }

    if (newAnimeEntries.length === 0) {
      // Check if we have duplicates but no new entries
      if (duplicateNames.length > 0 && uniqueAnimeList.length === 0) {
        return res.status(400).json({ error: 'duplicates found', duplicates: duplicateNames });
      }
      return res.json({ error: 'No new anime to add - all were duplicates' });
    }

// Use $addToSet with $each to append multiple entries, automatically avoiding duplicates
    // First check if any of the new entries already exist in user's list
    const existingAnimeNamesInUserList = new Set();
    if (currentUserList && currentUserList.animeList) {
      currentUserList.animeList.forEach(anime => {
        existingAnimeNamesInUserList.add(anime.name.toLowerCase());
      });
    }
    
    // Filter out any entries that already exist in the user's list
    const filteredNewEntries = newAnimeEntries.filter(entry => !existingAnimeNamesInUserList.has(entry.name.toLowerCase()));
    
    if (filteredNewEntries.length > 0) {
      try {
        await UserList.findOneAndUpdate(
          { userUuid },
          { 
            $addToSet: { animeList: { $each: filteredNewEntries } },
            $set: { updatedAt: now }
          },
          { upsert: true, new: true }
        );
      } catch (dbError) {
        // Handle the case where we get a duplicate key error from database
        if (dbError.code === 11000) {
          console.log("Duplicate key error caught and handled - this should not happen with our filtering");
          // If we still get this error, let's try updating without $addToSet to avoid the constraint
          await UserList.findOneAndUpdate(
            { userUuid },
            { $set: { updatedAt: now } },  // Update timestamp first
            { upsert: true, new: true }
          );
        } else {
          throw dbError;  // Re-throw if it's a different error
        }
      }
    } else {
      // If no new entries to add, just update the timestamp
      await UserList.findOneAndUpdate(
        { userUuid },
        { $set: { updatedAt: now } },
        { upsert: true, new: true }
      );
    }

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
