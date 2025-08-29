// routes/vote.js
import express from 'express';
import crypto from 'crypto';
import { getDb, ObjectId } from '../db.js';
import { canonicalBootstrapPayload, hmacSignBootstrap, hmacVerifyBootstrap, toObjectId } from '../utils.js';

const router = express.Router();
const BOOTSTRAP_TTL_MS = 10 * 60 * 1000;

function getRequesterUuid(req) {
  return req.session?.user?.uuid || req.headers['x-anon-uuid'];
}

function expectScore(rA, rB) {
  return 1 / (1 + Math.pow(10, (rB - rA) / 400));
}

/**
 * GET /vote/bootstrap
 * returns the user's anime pool (from ratings), plus a signature (ids, nonce, expiresAt, sig)
 * client uses this to locally pick pairs. On submit, client must include the same ids, nonce, expiresAt, sig.
 */
router.get('/bootstrap', async (req, res) => {
  try {
    const db = getDb();
    const userUuid = getRequesterUuid(req);
    if (!userUuid) return res.status(400).json({ error: 'No uuid provided (x-anon-uuid header or login required)' });

    const ratings = await db.collection('ratings').aggregate([
      { $match: { userUuid } },
      { $lookup: { from: 'anime', localField: 'animeId', foreignField: '_id', as: 'anime' } },
      { $unwind: '$anime' },
      { $project: { animeId: 1, elo: 1, matches: 1, wins: 1, losses: 1, name: '$anime.name' } }
    ]).toArray();

    if (!ratings.length) return res.status(400).json({ error: 'No anime ratings for this user. Submit a list first.' });

    const ids = ratings.map(r => String(r.animeId));
    const nonce = crypto.randomBytes(16).toString('hex');
    const expiresAt = Date.now() + BOOTSTRAP_TTL_MS;
    const sig = hmacSignBootstrap(userUuid, ids, nonce, expiresAt);

    res.json({
      anime: ratings.map(r => ({ id: String(r.animeId), name: r.name, elo: r.elo, matches: r.matches || 0 })),
      ids,
      nonce,
      expiresAt,
      sig
    });
  } catch (err) {
    console.error('bootstrap err', err);
    res.status(500).json({ error: 'internal' });
  }
});

/**
 * POST /vote/submit
 * Body:
 *  { animeA, animeB, winner, mode='elo'|'eloVotes', k?, aVotes?, bVotes?, ids, nonce, expiresAt, sig }
 */
router.post('/submit', async (req, res) => {
  try {
    const db = getDb();
    const userUuid = getRequesterUuid(req);
    if (!userUuid) return res.status(400).json({ error: 'No uuid provided' });

    const {
      animeA, animeB, winner,
      mode = 'elo',
      k,
      aVotes, bVotes,
      ids, nonce, expiresAt, sig
    } = req.body || {};

    if (!animeA || !animeB || !winner || !ids || !nonce || !expiresAt || !sig) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // verify signature
    const okSig = hmacVerifyBootstrap(userUuid, ids, nonce, expiresAt, sig);
    if (!okSig) return res.status(400).json({ error: 'Invalid signature' });
    if (Date.now() > Number(expiresAt)) return res.status(400).json({ error: 'Bootstrap expired' });

    // ensure the submitted pair are in the signed ids set
    const idsSet = new Set((ids || []).map(String));
    if (!idsSet.has(String(animeA)) || !idsSet.has(String(animeB))) {
      return res.status(400).json({ error: 'Submitted pair not allowed' });
    }

    // fetch rating rows (create if missing)
    const ratingCol = db.collection('ratings');
    const animeCol = db.collection('anime');

    const aId = toObjectId(animeA);
    const bId = toObjectId(animeB);

    // ensure anime exist globally
    const animeARec = await animeCol.findOne({ _id: aId });
    const animeBRec = await animeCol.findOne({ _id: bId });
    if (!animeARec || !animeBRec) return res.status(400).json({ error: 'Unknown anime ids' });

    // get or create rating docs
    const defaultRow = { elo: 1500, matches: 0, wins: 0, losses: 0, lastUpdatedAt: new Date() };

    let ra = await ratingCol.findOne({ userUuid, animeId: aId });
    if (!ra) {
      const r = await ratingCol.insertOne({ userUuid, animeId: aId, ...defaultRow });
      ra = await ratingCol.findOne({ _id: r.insertedId });
    }
    let rb = await ratingCol.findOne({ userUuid, animeId: bId });
    if (!rb) {
      const r = await ratingCol.insertOne({ userUuid, animeId: bId, ...defaultRow });
      rb = await ratingCol.findOne({ _id: r.insertedId });
    }

    // determine winner/loser ratings
    const aIsWinner = String(winner) === String(animeA);
    const rWin = aIsWinner ? ra.elo : rb.elo;
    const rLose = aIsWinner ? rb.elo : ra.elo;

    const K = (typeof k === 'number') ? k : (req.session?.user?.settings?.kFactor || 32);

    let winNew, loseNew, pWin, pLose;

    if (mode === 'eloVotes') {
      const aV = Number(aVotes || 0);
      const bV = Number(bVotes || 0);
      const total = aV + bV;
      if (!total) return res.status(400).json({ error: 'Missing vote counts for eloVotes mode' });
      pWin = expectScore(rWin, rLose);
      pLose = 1 - pWin;
      const ratioWin = (aIsWinner ? aV : bV) / total;
      const ratioLose = 1 - ratioWin;
      winNew = rWin + K * pLose * ratioWin;
      loseNew = rLose - K * pWin * ratioLose;
    } else {
      pWin = expectScore(rWin, rLose);
      pLose = 1 - pWin;
      winNew = rWin + K * pLose;
      loseNew = rLose - K * pWin;
    }

    // round to 2 decimals (optional)
    winNew = Math.round(winNew * 100) / 100;
    loseNew = Math.round(loseNew * 100) / 100;

    // update DB rows
    const now = new Date();
    if (aIsWinner) {
      await ratingCol.updateOne({ _id: ra._id }, {
        $set: { elo: winNew, lastUpdatedAt: now },
        $inc: { matches: 1, wins: 1 }
      });
      await ratingCol.updateOne({ _id: rb._id }, {
        $set: { elo: loseNew, lastUpdatedAt: now },
        $inc: { matches: 1, losses: 1 }
      });
    } else {
      await ratingCol.updateOne({ _id: rb._id }, {
        $set: { elo: winNew, lastUpdatedAt: now },
        $inc: { matches: 1, wins: 1 }
      });
      await ratingCol.updateOne({ _id: ra._id }, {
        $set: { elo: loseNew, lastUpdatedAt: now },
        $inc: { matches: 1, losses: 1 }
      });
    }

    // log the vote
    const voteLogs = db.collection('voteLogs');
    await voteLogs.insertOne({
      userUuid,
      animeA: aId,
      animeB: bId,
      winner: toObjectId(winner),
      ratingMode: mode,
      k: K,
      aBefore: ra.elo, bBefore: rb.elo,
      aAfter: aIsWinner ? winNew : loseNew,
      bAfter: aIsWinner ? loseNew : winNew,
      aWinProb: expectScore(ra.elo, rb.elo),
      bWinProb: expectScore(rb.elo, ra.elo),
      aVotes: (typeof aVotes === 'number') ? aVotes : (aVotes || null),
      bVotes: (typeof bVotes === 'number') ? bVotes : (bVotes || null),
      createdAt: now,
      clientHash: crypto.createHash('sha256').update(String(nonce)).digest('hex')
    });

    res.json({
      ok: true,
      updated: {
        [String(aId)]: aIsWinner ? winNew : loseNew,
        [String(bId)]: aIsWinner ? loseNew : winNew
      }
    });

  } catch (err) {
    console.error('vote submit err', err);
    res.status(500).json({ error: 'internal' });
  }
});

export default router;
