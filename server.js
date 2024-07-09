const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');

const authRoutes = require('./routes/authRoutes'); 
const User = require('./models/user'); 

const app = express();
const PORT = process.env.PORT || 3500;

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/dbconnect', { 
    useNewUrlParser: true, 
    useUnifiedTopology: true
})
    .then(() => console.log('Connected to MongoDB!'))
    .catch(err => console.error('MongoDB connection error:', err));

// Session middleware (MUST come before other middleware)
app.use(session({
    secret: 'your_secret_key', // Replace with a strong secret key
    resave: false,
    saveUninitialized: false, 
    cookie: {
        maxAge: 1000 * 60 * 60 * 24, // 1 day (adjust as needed)
        // secure: true, // Uncomment if using HTTPS in production
    }
}));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware to fetch user data and pass it to all templates
app.use(async (req, res, next) => {
    res.locals.user = null; // Initialize user to null

    if (req.session.userId) {
        try {
            const user = await User.findById(req.session.userId);
            if (user) { 
                res.locals.user = user;
            } 
        } catch (err) {
            console.error("Error fetching user:", err);
        }
    }
    next();
});

// Routes
app.use('/', authRoutes); 

// Default route
app.get('/', (req, res) => {
    res.render('index');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
