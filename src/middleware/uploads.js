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
// const express = require('express');
// const multer = require('multer');
// const ftp = require('basic-ftp');
// const mongoose = require('mongoose');
// const FileModel = require('../model/File'); // Ensure this path is correct
// const { Readable } = require('stream');
// require('dotenv').config(); // Load environment variables from .env file

// const app = express();

// // Mongo URI from environment variables
// const mongoURI = process.env.MONGODB_URI;

// // Connect to MongoDB
// mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
//   .then(() => console.log('MongoDB connected successfully.'))
//   .catch((err) => console.error('MongoDB connection error:', err));

// // FTP credentials from environment variables
// const ftpCredentials = {
//   host: process.env.FTP_HOST,
//   user: process.env.FTP_USER,
//   password: process.env.FTP_PASSWORD,
// };

// // Multer configuration
// const storage = multer.memoryStorage();
// const upload = multer({
//   storage,
//   fileFilter: (req, file, cb) => {
//     if (file.mimetype !== 'application/pdf') {
//       cb(new Error(`${file.originalname} is invalid. Only accept PDF.`), false);
//     } else {
//       cb(null, true);
//     }
//   }
// }).array('multi-files', 10);

// const uploadFileToFTP = async (fileStream, remoteFileName) => {
//   const client = new ftp.Client();
//   try {
//     await client.access(ftpCredentials);

//     const remoteDir = remoteFileName.substring(0, remoteFileName.lastIndexOf('/'));

//     // Ensure the directory exists
//     await client.ensureDir(remoteDir);
//     await client.uploadFrom(fileStream, remoteFileName);

//     console.log(`File uploaded to ${remoteFileName}`);
//     return `File uploaded to ${remoteFileName}`;
//   } catch (err) {
//     console.error(`Failed to upload ${remoteFileName}:`, err);
//     throw new Error(`Failed to upload ${remoteFileName}`);
//   } finally {
//     client.close();
//   }
// };

// const handleFileUpload = async (req, res) => {
//   try {
//     upload(req, res, async (err) => {
//       if (err) {
//         console.error('Multer error:', err);
//         req.flash('error', `Error uploading files: ${err.message}`);
//         return res.redirect('/upload');
//       }

//       if (!req.files || req.files.length === 0) {
//         req.flash('error', 'No files were uploaded.');
//         return res.redirect('/upload');
//       }

//       const files = req.files;
//       const uploadPromises = files.map(async (file) => {
//         const remoteFileName = `/homes/${file.originalname}`;
//         try {
//           // Create a readable stream from the file buffer
//           const fileStream = Readable.from(file.buffer);
//           await uploadFileToFTP(fileStream, remoteFileName);
//           return remoteFileName;
//         } catch (err) {
//           throw new Error(`Failed to upload ${file.originalname}`);
//         }
//       });

//       const uploadedFiles = await Promise.all(uploadPromises);

//       const fileData = files.map((file, index) => ({
//         filename: file.filename,
//         originalname: file.originalname,
//         mimetype: file.mimetype,
//         size: file.size,
//         path: uploadedFiles[index],
//         uploadedBy: req.session.userId, // Save the user ID with the file metadata
//       }));

//       await FileModel.create(fileData);

//       req.flash('success', 'Files uploaded successfully!');
//       res.redirect('/viewSave');
//     });
//   } catch (err) {
//     console.error(err);
//     req.flash('error', 'Failed to upload files to FTP server.');
//     res.redirect('/upload');
//   }
// };

// module.exports = handleFileUpload; 

