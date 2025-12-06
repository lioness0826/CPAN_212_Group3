const requireLogin = (req, res, next) => {
  console.log('Session check:', req.session);
  console.log('User ID:', req.session?.userId);
  
  if (!req.session || typeof req.session.userId === 'undefined' || req.session.userId === null) {
    return res.redirect("/auth/login"); 
  }
  next();
};

module.exports = requireLogin;