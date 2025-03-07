const mongoose = require('mongoose');

// Folder Schema
const folderSchema = new mongoose.Schema({
  folderName: {
    type: String,
    required: true,
    trim: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,  // Reference to the User model
    ref: 'User',
    required: true
  },
  path: {
    type: String, 
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now  // Automatically set the current date and time
  }
});

// Check if the model is already compiled
const CreateFolder = mongoose.model('CreateFolder', folderSchema);

module.exports = CreateFolder;
