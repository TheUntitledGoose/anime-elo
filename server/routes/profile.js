// routes/profile.js
import express from 'express';
import UserList from '../models/UserList.js';
import { getDb } from '../db.js';

function getRequesterUuid(req) {
  return req.session?.user.userId;
}

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const userUuid = getRequesterUuid(req);
    if (!userUuid) return res.status(401).json({ error: 'Not logged in' });

    const userList = await UserList.findOne({ userUuid });
    if (!userList) return res.json({ animeList: [] });

    res.json({ animeList: userList.animeList });
  } catch (err) {
    console.error('profile fetch err', err);
    res.status(500).json({ error: 'internal' });
  }
});

// DELETE /profile/anime
// body: { name: "anime name to delete" }
router.delete('/anime', async (req, res) => {
  try {
    if (!req.session.user.userId) return res.status(401).json({ error: 'Login required' });

    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Anime name required' });

    const db = getDb();
    const userList = await db.collection('userlists').findOne({ userUuid: req.session.user.userId });
    if (!userList) return res.status(400).json({ error: 'User anime list not found' });

    const newAnimeList = userList.animeList.filter(a => a.name !== name);

    await db.collection('userlists').updateOne(
      { userUuid: req.session.user.userId },
      { $set: { animeList: newAnimeList, updatedAt: new Date() } }
    );

    res.json({ ok: true, animeList: newAnimeList });
  } catch (err) {
    console.error('Error deleting anime:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
