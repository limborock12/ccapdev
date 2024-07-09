const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const restaurantSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true 
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    address: {
        type: String,
        required: true
    },
    tags: [{ 
        type: String,
        trim: true,  // Optional: Trim whitespace from tags
        lowercase: true  // Optional: Store tags in lowercase for consistent search
    }],
    cuisine: {
        type: String,
        required: true
    },
    contactInfo: {
        phone: String,
        email: String,
        website: String
    },
    description: {
        type: String
    },
    images: [{
        type: String 
    }],
    averageRating: {
        type: Number,
        default: 0
    },
    reviews: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Review' 
    }],
    dateCreated: {
        type: Date,
        default: Date.now
    }
 });

const Restaurant = mongoose.model('Restaurant', restaurantSchema);
module.exports = Restaurant;
