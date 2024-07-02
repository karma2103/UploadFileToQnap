const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    // User is not authenticated, redirect to login page
    return res.redirect('/login');
  }
  // User is authenticated, proceed to the next middleware
  next();
};


module.exports = {
  requireAuth,
}