const handleFileUpload = require("../middleware/upload");
const FolderModel = require("../model/File")
const UserModel = require("../model/users")
const path = require('path')
const ftp = require('basic-ftp');
const fs = require('fs');
const { Readable } = require('stream');
require('dotenv').config()
const Folder = require("../model/folder")

const ftpCredentials = {
  Finance: {
    host: process.env.FTP_HOST_FINANCE,
    user: process.env.FTP_USER_FINANCE,
    password: process.env.FTP_PASSWORD_FINANCE,
  },
  Insurance: {
    host: process.env.FTP_HOST_INSURANCE,
    user: process.env.FTP_USER_INSURANCE,
    password: process.env.FTP_PASSWORD_INSURANCE,
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

    // Construct file path on QNAP
    const remoteFilePath = `/${department}/${file.originalname}`.trim();

    console.log(`Downloading file: ${remoteFilePath}`);

    // Create FTP client and download file
    const client = new ftp.Client();
    await client.access(ftpConfig);

    res.setHeader('Content-Disposition', `attachment; filename="${file.originalname}"`);
    res.setHeader('Content-Type', file.mimetype || 'application/octet-stream');

    await client.downloadTo(res, remoteFilePath)
      .then(() => {
        console.log('File downloaded successfully');
        client.close();
      })
      .catch(err => {
        console.error('Error downloading file:', err);
        client.close();
        if (!res.headersSent) res.status(500).send('Error downloading file');
      });

  } catch (err) {
    console.error('Error retrieving file:', err);
    if (!res.headersSent) res.status(500).send('Internal Server Error');
  }
};

const createFolder = async (req, res) => {
  const client = new ftp.Client();
  client.ftp.verbose = true;

  try {
    if (!req.body || !req.body.folderName) {
      return res.status(400).json({ error: "Folder name is required." });
    }

    const { folderName } = req.body;

    // Sanitize folder name
    const sanitizeFolderName = (name) => name.replace(/[\\/:*?"<>|]/g, '').trim();
    const sanitizedFolderName = sanitizeFolderName(folderName);

    if (!sanitizedFolderName) {
      return res.status(400).json({ error: "Invalid folder name." });
    }

    const loggedInUserId = req.session.userId;
    if (!loggedInUserId) {
      return res.status(401).json({ error: "Unauthorized: User not logged in." });
    }

    const user = await UserModel.findById(loggedInUserId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const department = user.department;
    const ftpConfig = ftpCredentials[department];
    if (!ftpConfig) {
      return res.status(404).json({ error: "Department not configured." });
    }

    await client.access(ftpConfig);

    // Ensure the directory exists
    const folderPath = `/${department}/${sanitizedFolderName}`;
    await client.ensureDir(folderPath);

    console.log(`✅ Folder '${sanitizedFolderName}' created successfully in ${department}.`);

    // Save folder in MongoDB
    const newFolder = new Folder({
      folderName: sanitizedFolderName,
      createdBy: loggedInUserId,
      department,
      path: folderPath,
    });

    await newFolder.save();

    res.status(201).json({
      message: `Folder '${sanitizedFolderName}' created successfully.`,
      folderId: newFolder._id,
      folderPath,
    });

  } catch (err) {
    console.error("❌ Error creating folder:", err);
    res.status(500).json({ error: "Failed to create folder.", details: err.message });
  } finally {
    client.close();
  }
};


//testing
const checkFolder = async (req, res) => {
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
 

    const folders = await Folder.find({
      $or: [{ createdBy: loggedInUserId }]
    })
      .populate('createdBy', 'username ')
      .skip(skip)
      .limit(limit);

    

    const count = await FolderModel.countDocuments({
      $or: [{ createdBy: loggedInUserId }]
    });
    const totalPages = Math.ceil(count / limit);

    return res.render('check', {
      limit,
      folders,
      currentPage: page,
      totalPages,
      loggedInUserId,
      user
    });
  } catch (err) {
    console.error('Error fetching files:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

  const testCheck = async (req, res) => {
    try {
      let folderPath = req.params.path;
  
      // Decode URL-encoded path (in case of special characters like "%2F")
      folderPath = decodeURIComponent(folderPath);
  
      // Find folder by path
      const folder = await Folder.findOne({ path: folderPath });
  
      if (!folder) {
        return res.status(404).json({ error: 'Folder not found.' });
      }
  
      res.status(200).json({
        message: 'Folder found',
        folder
      });
    } catch (err) {
      console.error('Error fetching folder:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  };

module.exports = {
  multipleUpload,
  getScan,
  getFolderContents,
  getFileFromQNAP,
  createFolder,
  checkFolder,
  testCheck
};
