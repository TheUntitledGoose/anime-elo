import express from 'express';
import bcrypt from 'bcrypt';
import { User } from '../models/index.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, passwordHash });

    // Initialize session object if not already present
    req.session.user = {
      userId: user._id,
      username: user.username
    };

    await req.session.save(); // Ensures the session is persisted before responding

    res.json({ message: 'User registered successfully', username: user.username });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed', details: err.message });
  }
});

// Login

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: 'Invalid username or password' });

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return res.status(400).json({ error: 'Invalid username or password' });

    req.session.user = { userId: user._id.toString(), username: user.username };
    await req.session.save();  // important!
    res.json({ message: 'Login successful', ok: true, username: user.username });
  } catch (err) {
    res.status(500).json({ error: 'Login failed', details: err.message });
  }
});

router.get('/me', (req, res) => {
  if (req.session && req.session.user) {
    return res.json({
      loggedIn: true,
      username: req.session.user.username,
      id: req.session.user.id // changed from uuid to id
    });
  }
  return res.json({ loggedIn: false });
});



// Logout
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out' });
  });
});

export default router;
