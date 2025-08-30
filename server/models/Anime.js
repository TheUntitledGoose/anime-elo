import mongoose from 'mongoose';

const animeSchema = new mongoose.Schema({
  name: { type: String, unique: true, required: true },
  slug: { type: String, required: true, unique: true }, // slug = URL-safe name like "fullmetal-alchemist"
  elo: { type: Number, default: 1000 },
  addedAt: { type: Date, default: Date.now }
});

export default mongoose.model('Anime', animeSchema);
