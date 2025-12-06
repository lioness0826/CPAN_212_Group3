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

const store = MongoStore.create({
  mongoUrl: process.env.MONGO_URI,
  touchAfter: 24 * 3600,
  crypto: {
    secret: process.env.SESSION_SECRET || "secret"
  },
  mongoOptions: {
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 10,
  }
});

store.on('error', (error) => {
  console.error('Session store error:', error);
});

app.use(session({
  secret: process.env.SESSION_SECRET || "secret",
  resave: false,
  saveUninitialized: false,
  store: store,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7,
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


// if (mongoose.connection.readyState === 0) {
//   mongoose.connect(process.env.MONGO_URI, {
//     serverSelectionTimeoutMS: 5000,
//   })
//     .then(() => console.log("MongoDB connected"))
//     .catch(err => {
//       console.error("MongoDB connection error:", err);
//     });
// }

let isConnected = false;

const connectDB = async () => {
  if (isConnected && mongoose.connection.readyState === 1) {
    console.log('Using existing MongoDB connection');
    return;
  }

  try {
    const db = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
    });
    
    isConnected = db.connections[0].readyState === 1;
    console.log('MongoDB connected, readyState:', mongoose.connection.readyState);
  } catch (err) {
    console.error('MongoDB connection error:', err);
    isConnected = false;
    throw err;
  }
};


app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('Database connection failed');
    res.status(500).send('Database connection failed');
  }
});

// Export for deployment
module.exports = app;