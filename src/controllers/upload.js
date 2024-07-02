const handleFileUpload = require("../middleware/upload");
const FolderModel = require("../model/File")
const UserModel = require("../model/users")
const path = require('path')
const ftp = require('basic-ftp');
const fs = require('fs');
const { Readable } = require('stream');
require('dotenv').config()



const multipleUpload = async (req, res) => {
  try {
    await handleFileUpload(req, res);
  } catch (error) {
    console.log(error);

    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({ message: 'Too many files to upload.' });
    }
    return res.status(500).json({ message: `Error when trying to upload files: ${error.message}` });
  }
};

const formatFileSize = (size) => {
  if (size === 0) return '0 Bytes';
  const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(size) / Math.log(1024));
  return parseFloat((size / Math.pow(1024, i)).toFixed(2)) + ' ' + units[i];
};

// // Inside your route handler or middleware
// const getScan = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const skip = (page - 1) * limit;

//     const loggedInUserId = req.session.userId;
//     const user = await UserModel.findById(loggedInUserId);
//     if (!user) {
//       req.flash('error', 'User not found.');
//       return res.redirect('/upload');
//     }

//     const loggedInUserDepartment = user.department;

//     const usersInSameDepartment = await UserModel.find({
//       department: loggedInUserDepartment,
//       _id: { $ne: loggedInUserId }
//     });

//     const userIdsInSameDepartment = usersInSameDepartment.map((user) => user._id);

//     const files = await FileModel.find({
//       $or: [{ uploadedBy: loggedInUserId }, { uploadedBy: { $in: userIdsInSameDepartment } }]
//     })
//       .populate('uploadedBy', 'username department')
//       .skip(skip)
//       .limit(limit);

//     const count = await FileModel.countDocuments({
//       $or: [{ uploadedBy: loggedInUserId }, { uploadedBy: { $in: userIdsInSameDepartment } }]
//     });
//     const totalPages = Math.ceil(count / limit);

//     // Render the view and pass formatFileSize as a local variable
//     return res.render('SaveScan', {
//       limit,
//       files,
//       currentPage: page,
//       totalPages,
//       loggedInUserId,
//       formatFileSize 
//     });
//   } catch (err) {
//     console.error('Error fetching files:', err);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// };
const getScan = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const loggedInUserId = req.session.userId;
    const user = await UserModel.findById(loggedInUserId);
    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect('/upload');
    }

    const loggedInUserDepartment = user.department;

    const usersInSameDepartment = await UserModel.find({
      department: loggedInUserDepartment,
      _id: { $ne: loggedInUserId }
    });

    const userIdsInSameDepartment = usersInSameDepartment.map((user) => user._id);

    // Fetch folders and populate 'files' array within each folder
    const folders = await FolderModel.find({
      $or: [{ uploadedBy: loggedInUserId }, { uploadedBy: { $in: userIdsInSameDepartment } }]
    })
      .populate({
        path: 'files', // Assuming 'files' is the array containing individual files
        select: 'originalname size date', // Select only necessary fields
      })
      .populate('uploadedBy', 'username department')
      .skip(skip)
      .limit(limit);

    const count = await FolderModel.countDocuments({
      $or: [{ uploadedBy: loggedInUserId }, { uploadedBy: { $in: userIdsInSameDepartment } }]
    });
    const totalPages = Math.ceil(count / limit);

    return res.render('SaveScan', {
      limit,
      files: folders, // Pass folders data to the template
      currentPage: page,
      totalPages,
      loggedInUserId,
      formatFileSize,
      user
    });
  } catch (err) {
    console.error('Error fetching files:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
const getFolderContents = async (req, res) => {
  try {
    const folderId = req.params.folderId;
    const folder = await FolderModel.findById(folderId).populate('files.uploadedBy', 'username department');

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    return res.json({ folder });
  } catch (err) {
    console.error('Error fetching folder contents:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
module.exports = {
  multipleUpload,
  getScan,
  getFolderContents
};
