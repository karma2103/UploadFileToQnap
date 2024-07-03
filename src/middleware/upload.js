const express = require('express');
const multer = require('multer');
const ftp = require('basic-ftp');
const mongoose = require('mongoose');
const FolderModel = require('../model/File'); 
const UserModel = require('../model/users'); 
const { Readable } = require('stream');
require('dotenv').config(); 

const app = express();

// Mongo URI from environment variables
const mongoURI = process.env.MONGODB_URI;

// Connect to MongoDB
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected successfully.'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Multer configuration
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // List of accepted MIME types
    const acceptedMimeTypes = [
      'application/pdf',
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.ms-excel', // .xls
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'image/jpeg', // .jpg, .jpeg
      'image/png', // .png
      'image/gif' // .gif
    ];

    if (!acceptedMimeTypes.includes(file.mimetype)) {
      cb(new Error(`${file.originalname} is invalid. Only accept PDF, Word, Excel, and image files.`), false);
    } else {
      cb(null, true);
    }
  }
}).any(); // Accept any files including those inside the folder

// Define FTP credentials for each department
const ftpCredentials = {
  finance: {
    host: process.env.FTP_HOST_FINANCE,
    user: process.env.FTP_USER_FINANCE,
    password: process.env.FTP_PASSWORD_FINANCE,
  },
  underwriting: {
    host: process.env.FTP_HOST_UNDERWRITING,
    user: process.env.FTP_USER_UNDERWRITING,
    password: process.env.FTP_PASSWORD_UNDERWRITING,
  },
  loan: {
    host: process.env.FTP_HOST_LOAN,
    user: process.env.FTP_USER_LOAN,
    password: process.env.FTP_PASSWORD_LOAN,
  },
  ppf_gf: {
    host: process.env.FTP_HOST_PPF_GF,
    user: process.env.FTP_USER_PPF_GF,
    password: process.env.FTP_PASSWORD_PPF_GF,
  }
};

const uploadFileToFTP = async (fileStream, remoteFileName, department) => {
  const client = new ftp.Client();
  try {
    const credentials = ftpCredentials[department];

    await client.access(credentials);

    const remoteDir = remoteFileName.substring(0, remoteFileName.lastIndexOf('/'));

    // Ensure the directory exists
    await client.ensureDir(remoteDir);
    await client.uploadFrom(fileStream, remoteFileName);

    console.log(`File uploaded to ${remoteFileName}`);
    return `File uploaded to ${remoteFileName}`;
  } catch (err) {
    console.error(`Failed to upload ${remoteFileName}:`, err);
    throw new Error(`Failed to upload ${remoteFileName}`);
  } finally {
    client.close();
  }
};

const handleFileUpload = async (req, res) => {
  try {
    upload(req, res, async (err) => {
      if (err) {
        console.error('Multer error:', err);
        req.flash('error', `Error uploading files: ${err.message}`);
        return res.redirect('/upload');
      }

      const uploadType = req.body.uploadType;

      if (!uploadType) {
        req.flash('error', 'Upload type is missing.');
        return res.redirect('/upload');
      }

      const userId = req.session.userId;
      const user = await UserModel.findById(userId); 
      if (!user) {
        req.flash('error', 'User not found.');
        return res.redirect('/upload');
      }

      const department = user.department;
      let folder = '';

      switch (department) {
        case 'finance':
          folder = 'finance';
          break;
        case 'underwriting':
          folder = 'underwriting';
          break;
        case 'loan':
          folder = 'loan';
          break;
        case 'ppf_gf':
          folder = 'ppf_gf';
          break;
        default:
          folder = 'default';
          break;
      }

      const processFolder = async (files, parentPath, folderName) => {
        if (!files || files.length === 0) {
          throw new Error('No files to process.');
        }

        const fileData = [];

        for (const file of files) {
          const remoteFileName = `${parentPath}/${file.originalname}`;
          try {
            const fileStream = Readable.from(file.buffer);
            await uploadFileToFTP(fileStream, remoteFileName, department);

            fileData.push({
              originalname: file.originalname,
              mimetype: file.mimetype,
              size: file.size,
              path: remoteFileName,
              uploadedBy:userId
            });
          } catch (err) {
            throw new Error(`Failed to upload ${file.originalname}`);
          }
        }

        const folderData = {
          folderName,
          uploadType,
          uploadedBy: userId,
          files: fileData
        };

        await FolderModel.create(folderData);
      };

      if (uploadType === 'Folder') {
        const folderName = req.body.folderName;
        const folderPath = `/${folder}/${folderName}`;
        const files = req.files;
        console.log(files);
        await processFolder(files, folderPath, folderName);
        req.flash('success', 'Folder uploaded successfully!');
      } else {
        const files = req.files;
        console.log(files);
        await processFolder(files, `/${folder}`, ''); // Empty string for folder name if it's not a folder upload
        req.flash('success', 'Files uploaded successfully!');
      }

      res.redirect('/viewSave');
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to upload files to FTP server.');
    res.redirect('/upload');
  }
};


module.exports = handleFileUpload;

