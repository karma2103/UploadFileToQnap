
const User = require('../model/users');



const registerUser = async (req, res, next) => {
  try {
    const { email, username, department, password, ConfirmPassword } = req.body;

    if (!email || !username || !department || !password || !ConfirmPassword) {
      req.flash('error', 'All fields are required.');
      return res.redirect('/register');
    }

    if (password !== ConfirmPassword) {
      req.flash('error', 'Passwords do not match.');
      return res.redirect('/register');
    }

    const userData = { email, username, password, department };
    const user = await User.create(userData);

    req.session.userId = user._id;
    req.flash('success', 'Registration successful! Please log in.');
    res.redirect('/login');
  } catch (error) {
    req.flash('error', 'Error during registration.');
    next(error);
  }
};

const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      req.flash('error', 'Email and password are required.');
      return res.redirect('/login');
    }

    const user = await User.authenticate(email, password);
    if (!user) {
      req.flash('error', 'Wrong email or password.');
      return res.redirect('/login');
    }

    req.session.userId = user._id;
    req.flash('success', 'Login successfull!');
    res.redirect('/');
  } catch (error) {
    req.flash('error', 'Error during login.');
    next(error);
  }
};

const logout = (req, res, next) => {
  if (req.session) {
    // delete session object
    req.session.destroy(function (err) {
      if (err) {
       
        return next(err);
      } else {
        return res.redirect('/login');
      }
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  logout,
};
