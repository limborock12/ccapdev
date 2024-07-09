
const express = require('express');
const router = express.Router();
const User = require('../models/user'); 
const Restaurant = require('../models/restaurant');
const Review = require('../models/review');
const Reply = require('../models/reply');
const path = require('path');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/img/uploads/'); // Store in the 'uploads' folder
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname); // Unique filename
  }
});

const upload = multer({ storage: storage }); // Move the upload variable declaration here


// Login (GET): Render the login form
router.get('/login', (req, res) => {
    res.render(path.join(__dirname, '../views/login'));
});

// Register (GET): Render the registration form
router.get('/register', (req, res) => {
    res.render(path.join(__dirname, '../views/register')); 
});


// Register (POST)
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        const user = new User({ username, email, password, role }); // Password hashing handled in the User model
        await user.save();
        res.redirect('/login');
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error"); 
    }
});


// Login (POST)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (user && user.password === password) { // Directly compare plain text passwords
            req.session.userId = user._id;
            req.session.role = user.role;
            res.redirect('/');
        } else {
            res.redirect('/login');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});

// Logout (GET)
router.get('/logout', (req, res) => {
    req.session.destroy(); 
    res.redirect('/login'); 
});

// Your GET route for /profile in authRoutes.js
router.get('/profile', async (req, res) => {
    try {
        if (req.session.userId) {

            const user = await User.findById(req.session.userId).populate([
                { path: 'reviews', strictPopulate: false }, 
                { path: 'ownedRestaurants', strictPopulate: false } 
            ]); 
            req.session.user = user;
            res.render('profile', { user });
        } else {
            res.redirect('/login');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});


router.get('/edit-profile', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.redirect('/login'); 
        }
        const user = await User.findById(req.session.userId);
        res.render(path.join(__dirname, '../views/edit-profile'), { user });
    } catch (err) {
        console.error("Error fetching user details:", err);
        res.redirect('/profile');
    }
});

// Update Profile (POST): Handle profile update
router.post('/user/update', upload.single('profilePicture'), async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.redirect('/index');
        }

        const userId = req.session.userId;
        const { username, givenName, familyName, emailAddress, location, website, bio, pronoun, privacyIncludeInPeopleSection, favoriteFood } = req.body;

        const updateData = {
            username,
            givenName,
            familyName,
            email: emailAddress,
            location,
            website,
            bio,
            pronoun,
            privacyIncludeInPeopleSection,
            favoriteFood
        };
        //Handle Profile Picture Update
        if (req.file) {
            updateData.profilePictureUrl = `/img/uploads/${req.file.filename}`;
        }
        const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });

        req.session.user = updatedUser;
        req.session.save((err)=>{
            if(err){
                console.log(err);
                return res.status(500).send("Server Error");
            }
            res.redirect('/profile');
        })
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/discover', async (req, res) => {
    try {
        const restaurants = await Restaurant.find({});
        res.render('discover', { restaurants, user: res.locals.user }); 
    } catch (err) {
        console.error("Error fetching restaurants:", err);
        res.status(500).send('Server Error');
    }
});

router.get('/add-establishment', (req, res) => {
    if (!req.session.userId || req.session.role !== 'owner') {
      return res.redirect('/'); // Redirect if not logged in or not an owner
    }
    res.render(path.join(__dirname, '../views/add-establishment'), { user: req.session.user });
});


// Add Establishment (POST)
router.post('/add-establishment', upload.single('image'), async (req, res) => {
    try {
        const { name, address, cuisine, tags, description, twitter, facebook, instagram  } = req.body;
        const owner = req.session.userId; // Get the owner's ID from the session

        // Prepare the tags (split comma-separated string)
        const tagArray = tags ? tags.split(',').map(tag => tag.trim()) : [];

        // Prepare the contact info
        const contactInfo = {
            twitter: twitter,
            facebook: facebook,
            instagram: instagram
        }

        const newRestaurant = new Restaurant({ 
            name, 
            owner,
            address,
            cuisine, 
            contactInfo,
            description, 
            // Use empty array as a default for images
            images: req.file ? ['/img/uploads/' + req.file.filename] : [],
            tags: tagArray,
            dateCreated: Date.now() 
        });

        await newRestaurant.save();
        // Update the user's ownedRestaurants array
        await User.findByIdAndUpdate(owner, { $push: { ownedRestaurants: newRestaurant._id } }); 

        res.redirect('/discover'); 
    } catch (err) {
        console.error("Error adding establishment:", err);
        res.status(500).send("Internal Server Error");
    }
});




  router.get('/restaurants/:id', async (req, res) => {
    try {
        const restaurantId = req.params.id;
        const restaurant = await Restaurant.findById(restaurantId)
            .populate({
                path: 'reviews',
                populate: [
                    { 
                        path: 'author', 
                        select: 'username profilePictureUrl' 
                    },
                    { 
                        path: 'replies', 
                        populate: { path: 'author', select: 'username profilePictureUrl' } 
                    }
                ]
            })
            .populate('owner');

            res.render('restaurant', { restaurant, user: res.locals.user }); 
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching establishment details');
    }
});

router.post('/restaurants/:id/reviews', async (req, res) => {
    try {
        const { title, reviewText, rating } = req.body;
        const restaurantId = req.params.id;
        const author = req.session.userId;

        // Check if all required fields are provided
        if (!title || !reviewText || !rating) {
            return res.status(400).json({ error: 'Missing required fields.' });
        }

        // Check if rating is a valid number
        const ratingNum = parseInt(rating, 10);
        if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
            return res.status(400).json({ error: 'Invalid rating value.' });
        }

        const newReview = new Review({
            restaurantId,
            author,
            title,
            reviewText,
            rating: ratingNum
        });

        await newReview.save();

        // Update the restaurant's reviews array and averageRating
        await Restaurant.findByIdAndUpdate(restaurantId, {
            $push: { reviews: newReview._id }
        }, { new: true }).then(async (restaurant) => {
            const allReviews = await Review.find({ restaurantId: restaurantId });
            const totalRating = allReviews.reduce((sum, review) => sum + review.rating, 0);
            const newAverageRating = allReviews.length > 0 ? totalRating / allReviews.length : 0;
            restaurant.averageRating = newAverageRating;
            await restaurant.save();
        });

        // Update the user's reviews array
        await User.findByIdAndUpdate(author, { $push: { reviews: newReview._id } });

        res.redirect(`/restaurants/${restaurantId}`);

    } catch (err) {
        console.error("Error adding review:", err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/restaurants/:id/reviews', async (req, res) => {
    try {
        const restaurantId = req.params.id;
        const limit = parseInt(req.query.limit) || 10; 
        const reviews = await Review.find({ restaurantId })
            .populate('author', 'username profilePictureUrl') 
            .sort({ dateCreated: -1 }) 
            .limit(limit);

        res.json(reviews);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching reviews');
    }
});

router.delete('/reviews/:reviewId', async (req, res) => {
    try {
      const reviewId = req.params.reviewId;
      const userId = req.session.userId; 
  
      // Check if the user is the author of the review
      const review = await Review.findById(reviewId);
      if (!review || review.author.toString() !== userId.toString()) {
        return res.status(403).json({ error: 'You are not authorized to delete this review.' });
      }
  
      // Delete the review
      await Review.findByIdAndDelete(reviewId);
  
      // Update the restaurant's reviews array
      await Restaurant.findByIdAndUpdate(review.restaurantId, { $pull: { reviews: reviewId } });
  
      // Update the user's reviews array
      await User.findByIdAndUpdate(userId, { $pull: { reviews: reviewId } });
  
      res.status(200).json({ message: 'Review deleted successfully.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  });

router.get('/restaurants/:id/reviews', async (req, res) => {
    try {
        const restaurantId = req.params.id;
        const limit = parseInt(req.query.limit) || 10; 
        const reviews = await Review.find({ restaurantId })
            .populate('author', 'username profilePictureUrl') 
            .sort({ dateCreated: -1 }) 
            .limit(limit);

        res.json(reviews);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching reviews');
    }
});

router.post('/reviews/:id/edit', async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }
        if (review.author.toString() !== req.session.userId.toString()) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
        
        // Update the review fields based on form inputs
        review.title = req.body.title;
        review.reviewText = req.body.reviewText;
        review.rating = req.body.rating;

        // Save the updated review
        await review.save();

        // Redirect back to the restaurant page or wherever appropriate
        res.redirect(`/restaurants/${review.restaurantId}`);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Delete review route
router.delete('/:id', async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }
        if (review.author.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
        await review.remove();
        res.redirect(`/restaurants/${restaurantId}`);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// like
router.post('/reviews/:id/like', async (req, res) => {
    try {
      const userId = req.session.userId; 
      const review = await Review.findById(req.params.id);
  
      if (!review) {
        console.error('Review not found');
        return res.status(404).json({ error: 'Review not found' });
      }
  
      // Check if the user has already liked this review
      if (review.likedBy.includes(userId)) {
        console.log('User has already liked this review');
        return res.status(400).json({ error: 'You have already liked this review' });
      }
  
      review.likes += 1;
      review.likedBy.push(userId);
      await review.save();
  
      res.json({ success: true, likes: review.likes });
    } catch (error) {
      console.error('Error liking review:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
// Get replies for a review route (GET): Retrieve replies for a specific review
router.get('/reviews/:reviewId/replies', async (req, res) => {
    try {
      const reviewId = req.params.reviewId;
      const replies = await Reply.find({ reviewId }).populate('author', 'username profilePictureUrl');
      res.json(replies);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  router.post('/reviews/:reviewId/reply', async (req, res) => {
    try {
        const { replyText } = req.body;
        const reviewId = req.params.reviewId;
        const author = req.session.userId;

        if (!replyText) {
            return res.status(400).json({ error: 'Reply text is required.' });
        }

        const newReply = new Reply({
            author,
            text: replyText
        });

        await newReply.save();

        const review = await Review.findById(reviewId);
        if (!review) {
            return res.status(404).json({ error: 'Review not found.' });
        }

        review.replies.push(newReply._id);
        await review.save();

        res.redirect(`/restaurants/${review.restaurantId}`);
    } catch (err) {
        console.error('Error adding reply:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


module.exports = router;
