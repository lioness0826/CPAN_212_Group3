const express = require("express");
const app = express();
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
require("dotenv").config();
// DEBUG: Check what Vercel actually reads
console.log("MONGO_URI from env:", process.env.MONGO_URI);

const authRoutes = require("../routes/auth");
const movieRoutes = require("../routes/movies");

app.set("view engine", "ejs");

app.set("views", path.join(__dirname, "..", "views"));


app.get('/styles.css', (req, res) => {
  const cssPath = path.join(__dirname, "..", "public", "styles.css");
  if (fs.existsSync(cssPath)) {
    res.setHeader('Content-Type', 'text/css');
    res.sendFile(cssPath);
  } else {
    res.status(404).send('CSS not found');
  }
});


app.get('/images/:filename', (req, res) => {
  const imagePath = path.join(__dirname, "..", "public", "images", req.params.filename);
  if (fs.existsSync(imagePath)) {
    res.sendFile(imagePath);
  } else {
    res.status(404).send('Image not found');
  }
});

app.use(express.urlencoded({ extended: true }));


app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});


app.use(session({
  secret: process.env.SESSION_SECRET || "secret",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    touchAfter: 24 * 3600 
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: 'lax' 
  }
}));

app.use((req, res, next) => {
  console.log('Path:', req.path);
  console.log('SessionID:', req.sessionID);
  console.log('Session.userId:', req.session.userId);
  console.log('Session.userId type:', typeof req.session.userId);
  console.log('Full session:', JSON.stringify(req.session));
  console.log('MongoDB State:', mongoose.connection.readyState);
  
  res.locals.currentUser = req.session.userId || null;
  
  console.log('res.locals.currentUser:', res.locals.currentUser);
  console.log('currentUser type:', typeof res.locals.currentUser);
  next();
});

app.use("/auth", authRoutes);
app.use("/movies", movieRoutes);

app.get("/", (req, res) => res.render("home"));


if (mongoose.connection.readyState === 0) {
  mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  })
    .then(() => console.log("MongoDB connected"))
    .catch(err => {
      console.error("MongoDB connection error:", err);
    });
}

// Export for deployment
module.exports = app;