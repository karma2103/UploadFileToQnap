const handleFileUpload = require("../middleware/upload");
const FolderModel = require("../model/File")
const UserModel = require("../model/users")
const path = require('path')
const ftp = require('basic-ftp');
const fs = require('fs');
const { Readable } = require('stream');
require('dotenv').config()


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
const countFolder = () => {
  const count = 0;
  const folderData = FolderModel.find();
  folderData.forEach(folderElement => {
    if (folderElement.uploadType == 'Folder') {
      count++;
    }
  });

}
function getFileIcon(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  switch (ext) {
    case 'pdf':
      return 'fas fa-file-pdf';
    case 'doc':
    case 'docx':
      return 'fas fa-file-word';
    case 'xls':
    case 'xlsx':
      return 'fas fa-file-excel';
    case 'ppt':
    case 'pptx':
      return 'fas fa-file-powerpoint';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return 'fas fa-file-image';
    case 'zip':
    case 'rar':
      return 'fas fa-file-archive';
    case 'txt':
      return 'fas fa-file-alt';
    default:
      return 'fas fa-file';
  }
}

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
      getFileIcon,
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

    res.render('eachFiles.ejs', { folder, formatFileSize, getFileIcon });
  } catch (err) {
    console.error('Error fetching folder contents:', err);
    res.status(500).render('error', { message: 'Internal Server Error' });
  }
};

const getFileFromQNAP = async (req, res) => {
  const fileId = req.params.fileId;
  const loggedInUserId = req.session.userId;

  try {
    // Fetch user and folder from the database
    const user = await UserModel.findById(loggedInUserId);
    if (!user) return res.status(404).send('User not found');

    const department = user.department;
    const ftpConfig = ftpCredentials[department];
    if (!ftpConfig) return res.status(404).send('Department not configured');

    // Find the file details in the database
    const folder = await FolderModel.findOne({ 'files._id': fileId });
    if (!folder) return res.status(404).send('File not found in database');

    const file = folder.files.id(fileId);
    if (!file) return res.status(404).send('File not found');

    // Use the original name to construct the file path on QNAP
    const remoteFilePath = `${department}/${file.originalname}`.trim(); // Adjust the path as necessary

    console.log(`Attempting to download file from path: ${remoteFilePath}`);

    // Create FTP client and download file
    const client = new ftp.Client();
    await client.access(ftpConfig);

    // Set the response headers
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalname}"`);
    res.setHeader('Content-Type', file.mimetype || 'application/octet-stream');

    // Stream the file from QNAP to the response
    client.downloadTo(res, remoteFilePath)
      .then(() => {
        console.log('File downloaded successfully');
        client.close();
      })
      .catch(err => {
        console.error('Error downloading file:', err);
        client.close();
        if (!res.headersSent) {
          res.status(500).send('Error downloading file');
        }
      });

  } catch (err) {
    console.error('Error retrieving file:', err);
    if (!res.headersSent) {
      res.status(500).send('Internal Server Error');
    }
  }
};



module.exports = {
  multipleUpload,
  getScan,
  getFolderContents,
  getFileFromQNAP,
};
