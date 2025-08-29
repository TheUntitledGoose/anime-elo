// routes/leaderboard.js
import express from 'express';
import { getDb, ObjectId } from '../db.js';

const router = express.Router();

/**
 * GET /leaderboard/user/:username
 * returns top N of that user's personal ratings
 */
router.get('/user/:username', async (req, res) => {
  try {
    const db = getDb();
    const usernameLower = String(req.params.username || '').toLowerCase();
    const user = await db.collection('users').findOne({ usernameLower });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const ratings = await db.collection('ratings').aggregate([
      { $match: { userUuid: user.uuid } },
      { $lookup: { from: 'anime', localField: 'animeId', foreignField: '_id', as: 'anime' } },
      { $unwind: '$anime' },
      { $project: { animeId: 1, elo: 1, matches: 1, wins: 1, losses: 1, name: '$anime.name' } },
      { $sort: { elo: -1 } },
      { $limit: 200 }
    ]).toArray();

    res.json({ ok: true, username: user.username, displayName: user.profile?.displayName, ratings });
  } catch (err) {
    console.error('leaderboard user err', err);
    res.status(500).json({ error: 'internal' });
  }
});

/**
 * GET /leaderboard/global
 * Aggregates average elo across all users per anime
 */
router.get('/global', async (req, res) => {
  try {
    const db = getDb();
    const pipeline = [
      { $group: { _id: '$animeId', avgElo: { $avg: '$elo' }, count: { $sum: 1 } } },
      { $lookup: { from: 'anime', localField: '_id', foreignField: '_id', as: 'anime' } },
      { $unwind: '$anime' },
      { $project: { animeId: '$_id', name: '$anime.name', avgElo: 1, count: 1 } },
      { $sort: { avgElo: -1 } },
      { $limit: 200 }
    ];
    const rows = await db.collection('ratings').aggregate(pipeline).toArray();
    res.json({ ok: true, rows });
  } catch (err) {
    console.error('leaderboard global err', err);
    res.status(500).json({ error: 'internal' });
  }
});

export default router;
