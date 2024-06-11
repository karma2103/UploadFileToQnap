const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  filename: String,
  originalname: String,
  mimetype: String,
  size: Number,
  date: { type: Date, default: Date.now }
});

const FileModel = mongoose.model('File', fileSchema);

module.exports = FileModel;