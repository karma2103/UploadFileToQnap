const express = require('express');
// const mongoose = require('mongoose');
// const multer = require('multer');
// const path = require('path');
// const util = require('util');

// const app = express();

// // Mongo URI
// const mongoURI =
//   'mongodb+srv://karmatshew471:NHTuU8ICzYN8cjKZ@cluster0.e6fokh2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// // Create mongo connection
// mongoose.connect(mongoURI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true
// });

// // Check for successful connection
// const db = mongoose.connection;
// db.on('error', (err) => {
//   console.error('MongoDB connection error:', err);
// });
// db.once('open', () => {
//   console.log('MongoDB connected successfully.');
// });

// // Import FileModel from the model folder
// const FileModel = require('../model/File');

// // Create storage engine
// const storagePath = path.join(__dirname, '..', '..', 'upload');
// const storage = multer.diskStorage({
//   destination: storagePath,
//   filename: (req, file, cb) => {
//     cb(null, file.originalname);
//   }
// });

// const upload = multer({
//   storage,
//   fileFilter: (req, file, cb) => {
//     if (file.mimetype !== 'application/pdf') {
//       return cb(new Error(`<strong>${file.originalname}</strong> is invalid. Only accept PDF.`), false);
//     }
//     cb(null, true);
//   }
// }).array('multi-files', 10);

// const uploadFilesMiddleware = util.promisify(upload);

// // Middleware function to handle file upload
// const handleFileUpload = async (req, res, next) => {
//   try {
//     await uploadFilesMiddleware(req, res);

//     // Save file metadata to MongoDB
//     const files = req.files;
//     if (files && files.length > 0) {
//       const fileData = files.map(file => ({
//         filename: file.filename,
//         originalname: file.originalname,
//         mimetype: file.mimetype,
//         size: file.size
//       }));

//       // Save metadata to MongoDB
//       await FileModel.create(fileData);
//     }

//   } catch (err) {
//     res.send(err); // Pass error to Express error handler
//   }
// };

// // Exported middleware function
// module.exports = handleFileUpload;
