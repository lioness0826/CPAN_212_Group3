const express = require("express");
const app = express();
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const movieRoutes = require("./routes/movies");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

// Clear cache
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

// Session with MongoDB store (for Vercel serverless)
app.use(session({
  secret: process.env.SESSION_SECRET || "secret",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    touchAfter: 24 * 3600 // lazy session update (24 hours)
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: 'lax' // Prevent CSRF attacks
  }
}));

app.use((req, res, next) => {
  res.locals.currentUser = req.session.userId || null;
  next();
});

app.use("/auth", authRoutes);
app.use("/movies", movieRoutes);

app.get("/", (req, res) => res.render("home"));

// Connect to MongoDB (with connection reuse for serverless)
if (mongoose.connection.readyState === 0) {
  mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  })
    .then(() => console.log("MongoDB connected"))
    .catch(err => {
      console.error("MongoDB connection error:", err);
      process.exit(1);
    });
}

// Only start server if not in production (local development)
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

// Export for deployment
module.exports = app;