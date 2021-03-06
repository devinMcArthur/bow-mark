const mongoose = require('mongoose');

const {DailyReport} = require('./dailyReport');
const {Crew} = require('./crew');

var JobsiteSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: 1,
    trim: true
  },
  location_url: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true,
  },
  jobcode: {
    type: String,
    trim: true,
    unique: true
  },
  active: {
    type: Boolean,
    default: false
  },
  crews: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Crew'
  }],
  dailyReports: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DailyReport'
  }]
});

JobsiteSchema.statics.getAll = function() {
  var Job = this
  var jobArray = [];
  return Job.find().sort({jobcode: 'desc'}).then((jobs) => {
    if (!jobs) {return Promise.reject();}
    return new Promise(async (resolve, reject) => {
      await jobs.forEach((job) => {
        jobArray[job._id] = job;
      });
      if (Object.keys(jobArray).length > 0) {
        resolve(jobArray);
      } else {
        reject('Error: Unable to create Job array (check to ensure there are jobs created)');
      }
    });
  });
}

var Jobsite = mongoose.model('Jobsite', JobsiteSchema);

module.exports = {Jobsite};