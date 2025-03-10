const express = require("express");
const session = require('express-session');
const { requireAuth } = require('../middleware/logincheck');
const flash = require('connect-flash');

const router = express.Router();
const homeController = require("../controllers/home");
const uploadController = require("../controllers/upload");
const LoginController = require("../controllers/login")

router.use(express.json())
router.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true
}));
router.use(flash());
router.use((req, res, next) => {
  res.locals.messages = req.flash();
  next();
});
let routes = app => {
  //Auth 
  router.get('/register', homeController.getRegister)
  router.get("/Uploads", requireAuth, homeController.getHome);
  router.get('/login', homeController.getLogin);
  router.get('/welcome', requireAuth, homeController.getWelcome);
  router.post("/multiple-upload", requireAuth, uploadController.multipleUpload);
  router.get('/',requireAuth, uploadController.getScan)
  router.get('/folder/:folderId',requireAuth, uploadController.getFolderContents)
  router.get('/files/:fileId',requireAuth, uploadController.getFileFromQNAP)
  router.post('/create-folder',requireAuth, uploadController.createFolder)
  router.get("/checking", requireAuth, uploadController.checkFolder)
  router.get("/testcheck/loan/:path", requireAuth, uploadController.testCheck)
  //Authentication 
  router.post('/registerUser', LoginController.registerUser)
  router.post('/login', LoginController.loginUser)
  router.get('/logout',LoginController.logout)
  // router.get('/download/:id', uploadController.downloadFile);

  // router.delete('/delete/filename', uploadController.deleteFile);
  // router.get('/view/:id', uploadController.viewFile);

  return app.use("/", router);
};

module.exports = routes;