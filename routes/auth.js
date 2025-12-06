
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
    console.log("Registration success");

    req.session.userId = user._id;
    
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.redirect("/auth/register");
      }
      console.log("Session saved, userId:", req.session.userId);
      
    
      setTimeout(() => {
        res.redirect("/");
      }, 200);
    });
  } catch (err) {
    res.render("register", { errors: [{ msg: "Email already exists" }] });
  }
});


router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.render("login", { errors: [{ msg: "Invalid credentials" }] });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render("login", { errors: [{ msg: "Invalid credentials" }] });
    }

    console.log("Login success, user._id:", user._id);
    
    req.session.userId = user._id;
    
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.redirect("/auth/login");
      }
      console.log("Session saved, userId:", req.session.userId);
      
  
      setTimeout(() => {
        res.redirect("/");
      }, 200);
    });
  } catch (err) {
    console.error("Login error:", err);
    res.render("login", { errors: [{ msg: "Server error" }] });
  }
});