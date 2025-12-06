const express = require("express");
const app = express();
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
require("dotenv").config();

const authRoutes = require("../routes/auth");
const movieRoutes = require("../routes/movies");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "views"));

app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});


app.get('/styles.css', (req, res) => {
  const cssPath = path.join(__dirname, "..", "public", "styles.css");
  if (fs.existsSync(cssPath)) {
    res.setHeader('Content-Type', 'text/css');
    res.sendFile(cssPath);
  } else {
    res.status(404).send('CSS not found');
  }
});

// app.get('/images/:filename', (req, res) => {
//   const imagePath = path.join(__dirname, "..", "public", "images", req.params.filename);
//   if (fs.existsSync(imagePath)) {
//     res.sendFile(imagePath);
//   } else {
//     res.status(404).send('Image not found');
//   }
// });


let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    }).then((mongoose) => {
      console.log("MongoDB connected (serverless cached)");
      return mongoose;
    }).catch(err => {
      console.error("MongoDB connection failed:", err);
      throw err;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

// Call connectDB immediately
connectDB();


app.use(session({
  secret: process.env.SESSION_SECRET || "secret",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    ttl: 7 * 24 * 60 * 60, // 7 days
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7,
    httpOnly: true,
    secure: true,
    // debug
    sameSite: 'lax',
  }
}));

app.use((req, res, next) => {
  console.log('Path:', req.path, '| SessionID:', req.sessionID, '| UserId:', req.session.userId);
  res.locals.currentUser = req.session.userId || null;
  next();
});

app.use("/auth", authRoutes);
app.use("/movies", movieRoutes);
app.get("/", (req, res) => res.render("home"));

module.exports = app;