const mongoose = require('mongoose');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const _ = require('lodash');
const bcrypt = require('bcryptjs');
const {Employee} = require('./employee');


var UserSchema = new mongoose.Schema({
  name: {
    type: String,
    require: true,
    minlength: 1,
    time: true
  },
  email: {
    type: String,
    required: true,
    minlength: 1,
    trim: true,
    unique: true,
    validate:  {
      validator: validator.isEmail,
      message: '{VALUE} is not a valid email'
    }
  }, 
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  admin: {
    type: Boolean,
    required: true,
    default: false
  },
  projectManager: {
    type: Boolean
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null
  }
});

UserSchema.methods.comparePassword = function(candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
    if (err) return cb(err);
    cb(null, isMatch);
  });
};

UserSchema.pre('save', function (next) {
  var user = this;
  if (user.isModified('password')) {
    bcrypt.genSalt(10, (err, salt) => {
      bcrypt.hash(user.password, salt, (err, hash) => {
        user.password = hash;
        next();
      });
    });
  } else {
    next();
  }
});

UserSchema.statics.getAll = function() {
  var User = this
  var userArray = [];
  return User.find({}).sort({name: 'asc'}).then((users) => {
    if (!users) {return Promise.reject();}
    return new Promise(async (resolve, reject) => {
      await users.forEach((user) => {
        userArray[user._id] = user;
      });
      if (Object.keys(userArray).length > 0) {
        resolve(userArray);
      } else {
        reject('Error: Unable to create Employee array (check to ensure Employees have been created)');
      }
    });
  });
};

var User = mongoose.model('User', UserSchema);

module.exports = {User};

