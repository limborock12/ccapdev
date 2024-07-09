const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reviewSchema = new Schema({
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    averageRating: {
      type: Number,
      min: 1,
      max: 5
    },
    title: {
      type: String,
      required: true
    },
    reviewText: {
      type: String,
      required: true
    },
    
    images: [{
      type: String 
    }],
    likes: { type: Number, default: 0 },
    dateCreated: {
      type: Date,
      default: Date.now
    },
    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    replies: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reply' }]
  });

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;