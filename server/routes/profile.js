// routes/profile.js
import express from 'express';
import UserList from '../models/UserList.js';

function getRequesterUuid(req) {
  return req.session?.userId;
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

export default router;
