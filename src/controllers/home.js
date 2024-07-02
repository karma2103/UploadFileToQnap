const UserModel = require('../model/users');

const home = async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.userId) {
      return res.redirect('/login'); 
    }

    // Fetch the logged-in user details from the database
    const user = await UserModel.findById(req.session.userId);

    if (!user) {
      req.flash("error", "User Not Found!");
      return res.status(404).send("User not found");
    }

    req.flash("success", "Login successful!");
    return res.render('index.ejs', { user });
  } catch (error) {
    req.flash("error", "Internal Server Error");
    return res.redirect('/login');
  }
};

const login = (req, res) => {
  return res.render('./login/login.ejs');
};

const register = (req, res) => {
  return res.render('./login/register.ejs', { messages: req.flash() });
};

const welcome = (req, res) => {
  return res.render('welcome.ejs', { messages: req.flash() });
};

module.exports = {
  getHome: home,
  getLogin: login,
  getWelcome: welcome,
  getRegister: register,
};
