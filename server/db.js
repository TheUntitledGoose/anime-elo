import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'anime-elo';

console.log(MONGO_URI)

let client;
let db;

export async function initDb() {
  client = new MongoClient(MONGO_URI, { w: 'majority' });
  await client.connect();
  db = client.db(DB_NAME);
  console.log('Connected to MongoDB', MONGO_URI, DB_NAME);

  // create indexes (idempotent)
  await db.collection('users').createIndex({ usernameLower: 1 }, { unique: true, sparse: true });
  await db.collection('users').createIndex({ uuid: 1 }, { unique: true });

  await db.collection('animes').createIndex({ slug: 1 }, { unique: true });

  // unique rating per user + anime
  await db.collection('ratings').createIndex({ userUuid: 1, animeId: 1 }, { unique: true });

  await db.collection('userLists').createIndex({ userUuid: 1, createdAt: -1 });
  await db.collection('voteLogs').createIndex({ userUuid: 1, createdAt: -1 });

  return db;
}

export function getDb() {
  if (!db) throw new Error('DB not initialized, call initDb() first');
  return db;
}

export { ObjectId };
