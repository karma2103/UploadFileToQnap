const path = require("path");

const home = (req, res) => {
  return res.render('index.ejs')
};

module.exports = {
  getHome: home
};
