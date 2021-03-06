const mongoose = require('mongoose');
const async = require('async');

const {EmployeeWork} = require('./employeeWork');
const {VehicleWork} = require('./vehicleWork');
const {Production} = require('./production');
const {MaterialShipment} = require('./materialShipment');
const {Jobsite} = require('./jobsite');

var DailyReportSchema = new mongoose.Schema({
  id: {
    type: String
  },
  date: {
    type: Date,
    required: true
  },
  jobsite: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Jobsite',
    required: true
  }, 
  crew: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Crew',
    required: true
  },
  approved: {
    type: Boolean,
    required: true,
    default: false
  },
  employeeWork: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeWork'
  }],
  vehicleWork: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VehicleWork'
  }],
  production: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Production'
  }],
  materialShipment: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MaterialShipment'
  }],
  reportNote: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReportNote'
  }
});

DailyReportSchema.statics.getAll = function() {
  var Report = this;
  var reportArray = [];
  return Report.find({}).sort({date: 'asc'}).then((reports) => {
    if (!reports) {return Promise.reject();}
    return new Promise(async (resolve, reject) => {
      await reports.reverse().forEach((report) => {
        reportArray[report._id] = report;
      });
      if (Object.keys(reportArray).length > 0) {
        resolve(reportArray);
      } else {
        reject('Error: Unable to create Report array (check to ensure there are reports created)');
      }
    });
  });
}

var DailyReport = mongoose.model('DailyReport', DailyReportSchema);

module.exports = {DailyReport};