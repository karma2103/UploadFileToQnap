const express = require("express");
const app = express();
const initRoutes = require("./routes/web");
const path = require('path');
app.use(express.urlencoded({ extended: true }));
initRoutes(app);


app.set("view engine", "ejs")
//static files
app.use(express.static("./public/"))
app.use(express.json());
app.use(express.urlencoded({ extended: true }))
app.use(express.static("public"))
app.set('views', path.join(__dirname, 'views'));
app.use('/uploads', express.static(path.join(__dirname, '../upload')));

let port = 5000;
app.listen(port, () => {
  console.log(`Running at localhost:${port}`);
});
