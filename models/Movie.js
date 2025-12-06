const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  year: { type: Number, required: true },
  genres: { type: [String], required: true },
  rating: { type: Number, required: true },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // Who added the movie
});

module.exports = mongoose.model('Movie', movieSchema);
