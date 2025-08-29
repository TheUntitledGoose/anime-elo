// models/UserList.js
import mongoose from 'mongoose';

const userListSchema = new mongoose.Schema({
  userUuid: { type: String, required: true, unique: true },
  animeList: [{
    name: { type: String, required: true },
    elo: { type: Number, default: 1500 }
  }],
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model('UserList', userListSchema);
