const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const util = require('util');
const tftp = require('tftp');
const FileModel = require('../model/File'); // Ensure this path is correct

const app = express();

// Mongo URI
const mongoURI = 'mongodb+srv://karmatshew471:NHTuU8ICzYN8cjKZ@cluster0.e6fokh2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// Create mongo connection
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Check for successful connection
const db = mongoose.connection;
db.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});
db.once('open', () => {
  console.log('MongoDB connected successfully.');
});

// Function to check if QNAP device is reachable
function checkQNAPConnection() {
  return new Promise((resolve, reject) => {
    const qnapIpAddress = '172.16.22.113'; 
    require('dns').lookup(qnapIpAddress, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

// Function to upload file to QNAP using TFTP
async function uploadFileToQNAP(buffer, remoteFileName) {
  // Check QNAP connection before attempting file upload
  try {
    await checkQNAPConnection();
    console.log("Connected to QNAP Device");
  } catch (err) {
    throw new Error('Failed to connect to QNAP device.');
  }
  console.log("Buffer type:", Buffer.isBuffer(buffer)); // Should be true
  console.log("Buffer length:", buffer.length); // Length of the buffer
  console.log("Remote file name:", remoteFileName); // Should be a valid string
  return new Promise((resolve, reject) => {
    const client = tftp.createClient({
      host: '172.16.22.113', // Change this to your QNAP IP address
      port: 69 // Default TFTP port
    });

    client.put(buffer, remoteFileName, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(`File uploaded to ${remoteFileName}`);
      }
    });
  });
}

// Create storage engine
const storage = multer.memoryStorage(); // Use memory storage to get file buffer

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error(`<strong>${file.originalname}</strong> is invalid. Only accept PDF.`), false);
    }
    cb(null, true);
  }
}).array('multi-files', 10);

const uploadFilesMiddleware = util.promisify(upload);

// Middleware function to handle file upload
const handleFileUpload = async (req, res, next) => {
  try {
    await uploadFilesMiddleware(req, res);

    const files = req.files;
    if (files && files.length > 0) {
      const uploadPromises = files.map(async file => {
        const remoteFileName = `/homes/${file.originalname}`; // Storing in 'homes' folder
        await uploadFileToQNAP(file.buffer, remoteFileName);
        return remoteFileName;
      });

      const uploadedFiles = await Promise.all(uploadPromises);

      // Save file metadata to MongoDB
      const fileData = files.map((file, index) => ({
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: uploadedFiles[index] // Save the remote file path
      }));

      // Save metadata to MongoDB
      await FileModel.create(fileData);

      res.send('Files uploaded successfully to QNAP!');
    } else {
      res.status(400).send('No files uploaded.');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to upload files to QNAP.');
  }
};

// Exported middleware function
module.exports = handleFileUpload;
