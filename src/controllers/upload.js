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
//for size calculation 
const formatFileSize = (size) => {
  if (size === 0) return '0 Bytes';
  const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(size) / Math.log(1024));
  return parseFloat((size / Math.pow(1024, i)).toFixed(2)) + ' ' + units[i];
};

// for files counnt 
const countFolder = ()=> {
  const count = 0;
  const folderData = FolderModel.find();
  folderData.forEach(folderElement => {
    if(folderElement.uploadType == 'Folder' ) {
      count ++;
    }
  });
  
} 

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

    const folders = await FolderModel.find({
      $or: [{ uploadedBy: loggedInUserId }, { uploadedBy: { $in: userIdsInSameDepartment } }]
    })
      .populate('uploadedBy', 'username department')
      .populate('files.uploadedBy', 'username department')
      .skip(skip)
      .limit(limit);

    // Calculate file count for each folder
    folders.forEach(folder => {
      folder.fileCount = folder.files.length;
    });

    const count = await FolderModel.countDocuments({
      $or: [{ uploadedBy: loggedInUserId }, { uploadedBy: { $in: userIdsInSameDepartment } }]
    });
    const totalPages = Math.ceil(count / limit);

    return res.render('SaveScan', {
      limit,
      folders,
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
    const folder = await FolderModel.findById(folderId)
      .populate('uploadedBy', 'username department')
      .populate('files.uploadedBy', 'username department');
    // console.log(folder);
    if (!folder) {
      return res.status(404).render('error', { message: 'Folder not found' });
    }

    res.render('eachFiles.ejs', { folder, formatFileSize });
  } catch (err) {
    console.error('Error fetching folder contents:', err);
    res.status(500).render('error', { message: 'Internal Server Error' });
  }
};
module.exports = {
  multipleUpload,
  getScan,
  getFolderContents
};
