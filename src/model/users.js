const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  department: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    minlength: 6,
    required: true,
  },
});

UserSchema.statics.authenticate = async function (email, password) {
  try {
    const user = await this.findOne({ email: email });
    if (!user) {
      return null; // User not found
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return null; // Password doesn't match
    }
    return user; // Return the user object if authentication succeeds
  } catch (error) {
    throw new Error('Authentication failed');
  }
};


//hashing a password before saving it to the database
UserSchema.pre('save', function (next) {
  var user = this;
  bcrypt.hash(user.password, 10, function (err, hash) {
    if (err) {
      return next(err);
    }
    user.password = hash;
    next();
  })
});


const UserModel = mongoose.model('User', UserSchema);

module.exports = UserModel;