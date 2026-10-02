const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  equipment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Equipment',
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  rating: {
    type: Number,
    required: [true, 'Please provide a rating between 1 and 5'],
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
    required: [true, 'Please add a brief review comment'],
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

// Update Equipment averageRating after save
reviewSchema.post('save', async function () {
  const Equipment = mongoose.model('Equipment');
  const reviews = await this.constructor.find({ equipment: this.equipment });
  const count = reviews.length;
  const avg = count > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / count) : 0;
  await Equipment.findByIdAndUpdate(this.equipment, {
    averageRating: Math.round(avg * 10) / 10,
    ratingsCount: count,
  });
});

module.exports = mongoose.model('Review', reviewSchema);
