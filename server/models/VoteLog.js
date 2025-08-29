import mongoose from 'mongoose';

const voteLogSchema = new mongoose.Schema({
  voterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  anime1: { type: mongoose.Schema.Types.ObjectId, ref: 'Anime', required: true },
  anime2: { type: mongoose.Schema.Types.ObjectId, ref: 'Anime', required: true },
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Anime', required: true },
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model('VoteLog', voteLogSchema);
