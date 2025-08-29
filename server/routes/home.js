// routes/home.js
import express from 'express';
import { getDb } from '../db.js';

const router = express.Router();

/**
 * GET /home/recent-lists
 * returns last N public userLists with username + title + count + createdAt
 */
router.get('/recent-lists', async (req, res) => {
  try {
    const db = getDb();
    const rows = await db.collection('userLists').aggregate([
      { $sort: { createdAt: -1 } },
      { $limit: 12 },
      { $lookup: { from: 'users', localField: 'userUuid', foreignField: 'uuid', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          title: 1,
          count: 1,
          createdAt: 1,
          username: '$user.username',
          displayName: '$user.profile.displayName'
        }
      }
    ]).toArray();

    res.json({ ok: true, lists: rows });
  } catch (err) {
    console.error('recent lists err', err);
    res.status(500).json({ error: 'internal' });
  }
});

export default router;
