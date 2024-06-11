const upload = require("../middleware/upload");
const FileModel = require("../model/File")
const path = require('path')
const multipleUpload = async (req, res) => {
  try {
    await upload(req, res);
    console.log(req.files);

    if (req.files.length <= 0) {
      return res.status(400).json({ message: 'You must select at least 1 file.' });
    }

    return res.redirect('/viewSave')
  } catch (error) {
    console.log(error);

    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({ message: 'Too many files to upload.' });
    }
    return res.status(500).json({ message: `Error when trying to upload files: ${error.message}` });
  }
};

const getScan = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const files = await FileModel.find().skip(skip).limit(limit);
    const count = await FileModel.countDocuments();

    const totalPages = Math.ceil(count / limit);

    return res.render('SaveScan', {
      limit,
      files,
      currentPage: page,
      totalPages
    });
  } catch (err) {
    console.error('Error fetching files:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
const downloadFile = async (req, res) => {
  try {
    const file = await FileModel.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    const filePath = path.join(__dirname, '../../upload', file.filename);
    res.download(filePath, file.originalname);
  } catch (err) {
    console.error('Error downloading file:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// const viewFile = async (req, res) => {
//   try {
//     const file = await FileModel.findById(req.params.id);
//     if (!file) {
//       return res.status(404).json({ message: 'File not found' });
//     }
//     const filePath = path.join(__dirname, '../../upload', file.filename);
//     res.sendFile(filePath);
//   } catch (err) {
//     console.error('Error viewing file:', err);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// };
// const deleteFile = async (req, res) => {
//   try {
//     const file = await FileModel.findById(req.params.id);
//     if (!file) {
//       return res.status(404).json({ message: 'File not found' });
//     }

//     // Delete file from local storage
//     const filePath = path.join(__dirname, '../../upload', file.filename);
//     await fs.unlink(filePath);

//     // Delete file from database
//     await FileModel.findByIdAndDelete(fileId);

//     res.status(200).json({ message: 'File deleted successfully' });
//   } catch (err) {
//     console.error('Error deleting file:', err);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// };
module.exports = {
  multipleUpload,
  getScan, 
  downloadFile,
  // deleteFile
  // viewFile
};
