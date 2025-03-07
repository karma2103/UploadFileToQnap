const express = require('express');
const multer = require('multer');
const ftp = require('basic-ftp');
const mongoose = require('mongoose');
const FolderModel = require('../model/File');
const UserModel = require('../model/users');
const { Readable } = require('stream');
const Folder = require('../model/folder')
require('dotenv').config();

const app = express();

// MongoDB Connection
const mongoURI = process.env.MONGODB_URI;
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected successfully.'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Multer Configuration (for memory storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const acceptedMimeTypes = [
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg', 'image/png', 'image/gif'
    ];

    if (!acceptedMimeTypes.includes(file.mimetype)) {
      cb(new Error(`${file.originalname} is invalid. Only accept PDF, Word, Excel, and image files.`), false);
    } else {
      cb(null, true);
    }
  }
}).any(); // Accept multiple files

// Define FTP Credentials for Different QNAP Devices
const ftpCredentials = {
  qnap1: {
    Finance: {
      host: process.env.FTP_HOST_FINANCE,
      user: process.env.FTP_USER_FINANCE,
      password: process.env.FTP_PASSWORD_FINANCE,
    },
  },
  qnap2: {
    Insurance: {
      host: process.env.FTP_HOST_INSURANCE,
      user: process.env.FTP_USER_INSURANCE,
      password: process.env.FTP_PASSWORD_INSURANCE,
    },
  },
  qnap3: {
    loan: {
      host: process.env.FTP_HOST_LOAN,
      user: process.env.FTP_USER_LOAN,
      password: process.env.FTP_PASSWORD_LOAN,
    },
    ppf_gf: {
      host: process.env.FTP_HOST_PPF_GF,
      user: process.env.FTP_USER_PPF_GF,
      password: process.env.FTP_PASSWORD_PPF_GF,
    },
  }
};

// Function to Select the Correct QNAP Device Based on Department
const getQnapCredentials = (department) => {
  if (ftpCredentials.qnap1[department]) return ftpCredentials.qnap1[department];
  if (ftpCredentials.qnap2[department]) return ftpCredentials.qnap2[department];
  if (ftpCredentials.qnap3[department]) return ftpCredentials.qnap3[department];
  throw new Error(`No FTP server found for department: ${department}`);
};


// Function to Check FTP Connection
const checkQnapConnection = async (department) => {
  const client = new ftp.Client();
  try {
    const qnapServer = getQnapCredentials(department);
    await client.access(qnapServer);
    console.log(`✅ QNAP connected for department: ${department}`);
    return true;
  } catch (err) {
    console.error(`❌ QNAP connection failed for department: ${department}`, err);
    return false;
  } finally {
    client.close();
  }
};

// Function to Upload File to FTP (QNAP)
const uploadFileToFTP = async (fileStream, remoteFileName, department) => {
  const client = new ftp.Client();
  try {
    const isConnected = await checkQnapConnection(department);
    if (!isConnected) {
      throw new Error(`QNAP for ${department} is not connected. Please check the connection.`);
    }

    const qnapServer = getQnapCredentials(department);
    await client.access(qnapServer);

    // Extract the directory part of the remoteFileName
    const remoteDir = remoteFileName.substring(0, remoteFileName.lastIndexOf('/'));

    // Ensure that the directory exists before uploading
    console.log(`Checking if directory exists: ${remoteDir}`);

    // Split the path into directories and create them one by one
    const directories = remoteDir.split('/');
    let currentDir = '';

    for (const dir of directories) {
      currentDir = currentDir ? `${currentDir}/${dir}` : dir;
      try {
        console.log(`Ensuring directory exists: ${currentDir}`);
        await client.ensureDir(currentDir);
        console.log(`✅ Directory created or exists: ${currentDir}`);
      } catch (err) {
        if (err.message.includes('directory already exists') || err.code === 550) {
          console.log(`📁 Directory already exists: ${currentDir}`);
        } else {
          console.error(`❌ Failed to create directory: ${currentDir}`);
          throw new Error(`Failed to create directory: ${currentDir}`);
        }
      }
    }

    // Upload the file
    await client.uploadFrom(fileStream, remoteFileName);
    console.log(`✅ File uploaded to ${remoteFileName} on QNAP for ${department}`);

    return `File uploaded to ${remoteFileName}`;
  } catch (err) {
    console.error(`❌ Failed to upload ${remoteFileName}:`, err);
    throw new Error(`Failed to upload ${remoteFileName}`);
  } finally {
    client.close();
  }
};



// Handle File Upload
const handleFileUpload = async (req, res) => {
  try {
    upload(req, res, async (err) => {
      if (err) {
        console.error('❌ Multer error:', err);
        req.flash('error', `Error uploading files: ${err.message}`);
        return res.redirect('/upload');
      }

      const uploadType = req.body.uploadType;
      if (!uploadType) {
        req.flash('error', 'Upload type is missing.');
        return res.redirect('/upload');
      }

      const { folderId } = req.params; // Get folder ID from route parameter
      if (!folderId) {
        req.flash('error', 'Folder ID is missing.');
        return res.redirect('/upload');
      }
      // Fetch User Details
      const userId = req.session.userId;
      const user = await UserModel.findById(userId);
      if (!user) {
        req.flash('error', 'User not found.');
        return res.redirect('/upload');
      }

      const department = user.department;
      const folder = department; // Use department as folder name
      // Find the existing folder
      const existingFolder = await Folder.findOne({ _id: folderId, createdBy: userId });
      if (!existingFolder) {
        req.flash('error', 'Folder does not exist. Please create it first.');
        return res.redirect('/upload');
      }

      const folderPath = existingFolder.path; // Get the folder path from MongoDB
      console.log(`📁 Uploading to folder: ${folderPath}`);

      // Process Folder and Upload Files
      const processFolder = async (files, parentPath, folderName) => {
        if (!files || files.length === 0) throw new Error('No files to process.');

        const fileData = [];

        for (const file of files) {
          const remoteFileName = `${parentPath}/${file.originalname}`;
          try {
            const fileStream = Readable.from(file.buffer);
            await uploadFileToFTP(fileStream, remoteFileName, department); // Upload to correct QNAP

            fileData.push({
              originalname: file.originalname,
              mimetype: file.mimetype,
              size: file.size,
              path: remoteFileName,
              uploadedBy: userId
            });
          } catch (err) {
            req.flash('error', `QNAP Device is down, Contact IT Administrator`);
            throw new Error(`Failed to upload ${file.originalname}`);
          }
        }

        // Save Folder & File Data to MongoDB
        const folderData = {
          folderName,
          uploadType,
          uploadedBy: userId,
          files: fileData
        };

        await FolderModel.create(folderData);
      };

      // Upload Folder or Individual Files
      if (uploadType === 'Folder') {
        const folderName = req.body.folderName;
        const folderPath = `/${folder}/${folderName}`;
        const files = req.files;

        console.log(`📁 Uploading folder to: ${folderPath}`);
        console.log(files);
        await processFolder(files, folderPath, folderName);
        req.flash('success', 'Folder uploaded successfully!');
      } else {
        const files = req.files;
        console.log(`📄 Uploading files to: /${folder}`);
        console.log(files);
        await processFolder(files, `/${folder}`, '');
        req.flash('success', 'Files uploaded successfully!');
      }

      res.redirect('/');
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to upload files to FTP server.');
    res.redirect('/Uploads');
  }
};



module.exports = handleFileUpload;
