const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  filename: String,
  originalname: String,
  mimetype: String,
  size: Number,
  date: { type: Date, default: Date.now },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }
});

const folderSchema = new mongoose.Schema({
  folderName: String,
  files: [fileSchema],
  uploadType: { type: String, default: 'Folder' },
  date: { type: Date, default: Date.now },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }
});

const FolderModel = mongoose.model('Folder', folderSchema);

module.exports = FolderModel;