const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['customer', 'owner'], default: 'customer' },
    givenName: String,
    familyName: String,
    pronoun: String, 
    bio: String,
    favoriteFood: String,
    profilePictureUrl: String, 
    location: String,
    website: String,
});


 const User = mongoose.model('User', UserSchema);


module.exports = User;