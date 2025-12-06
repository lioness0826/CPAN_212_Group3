const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { check, validationResult } = require("express-validator");
const User = require("../models/User");


router.get("/register", (req, res) => res.render("register"));

router.post("/register", [
  check("username").notEmpty().withMessage("Username required"),
  check("email").isEmail().withMessage("Valid email required"),
  check("password").isLength({ min: 6 }).withMessage("Password min 6 chars")
], async (req, res) => {
  console.log("Register POST received:", req.body);
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.render("register", { errors: errors.array() });

  const { username, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const user = new User({ username, email, password: hashedPassword });
    await user.save();
    console.log("Registration success, redirecting...");

    req.session.userId = user._id;
    
    // wait for saving
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.redirect("/auth/register");
      }
      console.log("Session saved, userId:", req.session.userId);
      res.redirect("/");
    });
  } catch (err) {
    res.render("register", { errors: [{ msg: "Email already exists" }] });
  }
}); 


router.get("/login", (req, res) => res.render("login"));

router.post("/login", [
  check("email").isEmail(),
  check("password").notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.render("login", { errors: errors.array() });

  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.render("login", { errors: [{ msg: "Invalid credentials" }] });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.render("login", { errors: [{ msg: "Invalid credentials" }] });
    
  // debug
  console.log("Login success, user._id:", user._id);
  console.log("user._id type:", typeof user._id);


  req.session.userId = user._id;
  req.session.save((err) => {
  if (err) {
    console.error("Session save error:", err);
    return res.redirect("/auth/login");
  }
  // debug
  console.log("Saved userId type:", typeof req.session.userId); 
  console.log("Session saved, userId:", req.session.userId);
  res.redirect("/");
});
});

// Logout
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) console.log(err);
    res.clearCookie('connect.sid'); 
    res.redirect("/");
  });
});

module.exports = router;
