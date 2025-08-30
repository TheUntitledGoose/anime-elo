import express from 'express';
import UserList from '../models/UserList.js';
import User from '../models/User.js';

const router = express.Router();

// Get the most recent leaderboard submission
router.get('/latest', async (req, res) => {
  try {
    const latestList = await UserList.findOne()
      .sort({ updatedAt: -1 })
      .lean();

    if (!latestList) {
      return res.status(404).json({ error: 'No leaderboard found' });
    }

    const user = await User.findOne({ _id: latestList.userUuid }).lean();
    const username = user?.username || 'Unknown User';

    const sortedAnime = [...latestList.animeList].sort((a, b) => b.elo - a.elo);

    res.json({
      user: username,
      updatedAt: latestList.updatedAt,
      animeList: sortedAnime
    });
  } catch (err) {
    console.error('Error fetching latest leaderboard:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific user's anime list by username
router.get('/user/:username', async (req, res) => {
  try {
    const { username } = req.params;

    const user = await User.findOne({ username }).lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log()
    const userList = await UserList.findOne({ userUuid: user._id }).lean();

    // If no list found, return empty array instead of 404
    const animeList = userList ? [...userList.animeList].sort((a, b) => b.elo - a.elo) : [];
    const updatedAt = userList ? userList.updatedAt : null;

    res.json({
      user: username,
      updatedAt,
      animeList
    });
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


export default router;
