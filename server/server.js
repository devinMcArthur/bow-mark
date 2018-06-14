require('./config/config');
require('newrelic');
const express = require('express');
const _ = require('lodash');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const {ObjectID} = require('mongodb');
const path = require('path');
const request = require('request');
const {mongoose} = require('./db/mongoose');
const nodemailer = require('nodemailer');
const passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt-nodejs');
const async = require('async');
const crypto = require('crypto');
const flash = require('express-flash');
const querystring = require('querystring');
const pdf = require('html-pdf');

const {User} = require('./models/user');
const {Jobsite} = require('./models/jobsite');
const {Employee} = require('./models/employee');
const {Vehicle} = require('./models/vehicle');
const {Crew} = require('./models/crew');
const {DailyReport} = require('./models/dailyReport');
const {EmployeeWork} = require('./models/employeeWork');
const {VehicleWork} = require('./models/vehicleWork');
const {Production} = require('./models/production');
const {MaterialShipment} = require('./models/materialShipment');
const {ReportNote} = require('./models/reportNote');

const port = process.env.PORT || 3000;
var app = express();
var sess = {
  secret: "bow-marks-big-secret",
  cookie: {},
  resave: false,
  saveUninitialized: false,
  store: new MongoStore({
    mongooseConnection: mongoose.connection
  })
};

passport.use(new LocalStrategy({
  usernameField: 'email'
},function(username, password, done) {
  User.findOne({ email: username }, function(err, user) {
    if (err) return done(err);
    if (!user) return done(null, false, { message: 'Incorrect username.' });
    user.comparePassword(password, function(err, isMatch) {
      if (isMatch) {
        return done(null, user);
      } else {
        return done(null, false, { message: 'Incorrect password.' });
      }
    });
  });
}));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session(sess));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, '../public')));
app.use((req, res, next) => {
  res.locals.session = req.session;
  res.locals.baseUrl = req.headers.host;
  res.locals.user = req.user;
  res.locals.query = req.query;
  next();
});

// root
app.get('/', async (req, res, next) => {
  const user = req.user;
  if (user) {
    if(!user.employee) {
      req.flash('error', 'Please link your account with a Bow Mark employee');
      res.redirect(`/user/${user._id}/`);
    }
    var crewArray = [];
    var jobArray = [];
    var crewArray = await Crew.find({employees: user.employee}, (err, crews) => {
      if(err) {return console.log(err);}
    });
    Jobsite.find({}, async (err, jobsites) => {
      if(err) {return console.log(err);}
      await jobsites.forEach((jobsite) => {
        jobArray[jobsite._id] = jobsite;
      });
      res.render('index', {jobArray, crewArray});
    });
  } else {
    req.flash('info', 'You must be logged in to use this site');
    res.render('login');
  }
})

// GET /login
app.get('/login', (req, res) => {
  if (!req.user) {
    res.render('login');
  } else {
    res.redirect('/');
  }
});

// POST /login
app.post('/login', function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (err) {
      console.log(err)
      req.flash('error', err.message);
      res.redirect('back');
    };
    if (!user) {
      req.flash('error', 'User was not authenticated')
      res.redirect('/login');
      return;
    }
    req.logIn(user, function(err) {
      if (err) return next(err);
      return res.redirect('/');
    });
  })(req, res, next);
});

// GET /logout
app.get('/logout', (req, res) => {
  req.logout();
  req.flash('success', 'Successfully logged out!');
  res.redirect('/');
});

// GET /signup
app.get('/signup', (req, res) => {
  if (!req.user) {
    res.render('users/signup');
  } else {
    req.flash('error', 'You cannot do this while logged in');
    res.redirect('back');
  }
});

// POST /signup
app.post('/signup', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    req.logIn(user, (err) => {
      req.flash('success', 'Account successfully created and logged in');
      res.redirect('/');
    }); 
  } catch (e) {
    console.log(e);
    req.flash('error', e.message);
    res.redirect('back');
  }
});

// GET /forgot
app.get('/forgot', (req, res) => {
  res.render('users/forgot');
});

// POST /forgot
app.post('/forgot', (req, res, next) => {
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({ email: req.body.email }, function(err, user) {
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/forgot');
        }
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: 'app98138005@heroku.com',
          pass: 'z2ilzs7v6175'
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'passwordreset@bowmark.ca',
        subject: 'Bow Mark Password Reset',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('info', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/forgot');
  });
});

// GET /reset/:token
app.get('/reset/:token', (req, res) => {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot');
    }
    res.render('users/reset', {
      token: req.params.token
    });
  });
});

// POST /reset/:token
app.post('/reset/:token', function(req, res) {
  async.waterfall([
    function(done) {
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }
        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        user.save(function(err) {
          req.logIn(user, function(err) {
            done(err, user);
          });
        });
      });
    },
    function(user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: 'app98138005@heroku.com',
          pass: 'z2ilzs7v6175'
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'passwordreset@bowmark.ca',
        subject: 'Your password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('success', 'Success! Your password has been changed.');
        done(err);
      });
    }
  ], function(err) {
    res.redirect('/');
  });
});

// GET /users
app.get('/users', async (req, res) => {
  if (req.user.admin == true) {
    try {
      await User.find({}, (err, users) => {
        var userMap = [];
        users.forEach((user) => {
          userMap[user._id] = user;
        });
        res.render('users/userIndex', {array: userMap});
      });
    } catch (e) {
      return console.log(e);
    }
  } else {
    req.flash('error', 'You are not authorized to view this page');
    res.redirect('back');
  }
});

// GET /user/:id
app.get('/user/:id', (req, res) => {
  if (req.user) {
    User.findById(req.params.id, (err, user) => {
      if (err) {
        console.log(err);
        req.flash('error', err.message);
        res.redirect('back');
      }
      if (req.user._id.equals(user._id) || req.user.admin == true) {
        employeeArray = [];
        Employee.find({}, (err, employees) => {
          employees.forEach((employee) => {
            employeeArray[employee._id] = employee;
          });
          res.render('users/user', {user, employeeArray});
        });
      } else {
        req.flash('error', "You are not authorized to view this account");
        res.redirect(`/users/`);
      }
    });
  } else {
    req.flash('error', 'Must be logged in');
    res.render('login');
  }
  
});

// DELETE /users/:id
app.delete('/user/:id', async (req, res) => {
  var id = req.params.id;
  if (!ObjectID.isValid(id)) {
    req.flash('error', 'User ID is not valid for request, check with Admin');
    res.redirect('back');
  }
  try {
    const user = await User.findOneAndRemove({
      _id: id
    });
    if(!user) {
      req.flash('error', 'User could not be found for whatever reason, maybe try again?');
      res.redirect('back');
    }
    req.session.destroy();
  } catch (e) {
    req.flash('error', 'Something wen\'t wrong and I don\'t know what it was');
    res.redirect('back');
  }
});

// POST /user/:id/update
app.post('/user/:id/update', async (req, res) => {
  try {
    var id = req.params.id;
    var body = _.pick(req.body, ['name', 'admin']);
    if (!ObjectID.isValid(id)) {
      req.flash('error', 'ID used in the request was wrong, that\'s odd');
      res.redirect('back');
    }
    var user = await User.findOneAndUpdate({_id: id}, {$set: body}, {new: true});
    req.flash('success', 'User successfully updated! Isn\'t that just fantastic?!');
    res.redirect('back');
    res.end();
  } catch (e) {
    req.flash('error', 'There was a weird error, maybe try again with your fingers crossed?');
    res.redirect('back');
  }
});

// POST /user/:userId/employee/
app.post('/user/:id/employee', (req, res) => {
  var userId = req.params.id;
  var employeeId = req.body.employee;
  User.findById(userId, (err, user) => {
    if(err) {
      console.log(err);
      req.flash('error', 'User countn\'t be found with the ID you gave me... what the hell!');
      res.redirect('back');
    }
    user.employee = employeeId;
    req.user.employee = employeeId;
    user.save((err) => {
      if(err) {
        console.log(err);
        req.flash('error', err.message);
        res.redirect('back');
      }
    })
    Employee.findById(employeeId, (err, employee) => {
      if(err) {
        console.log(err);
        req.flash('error', err.message);
        res.redirect('back');
      }
      employee.user = userId;
      employee.save((err) => {
        if(err) {
          console.log(err);
          req.flash('error', err.message);
          res.redirect('back');
        }
      });
      req.flash('success', 'User successfully linked with Employee :)');
      res.redirect('back');
    });
  });
});

// PATCH /user/:id/employee
app.patch('/user/:id/employee', async (req, res) => {
  try {
    var userId = req.params.id;
    await User.findById(userId, async (err, user) => {
      if (err) {return console.log(err);}
      await Employee.findById(user.employee, async (err, employee) => {
        if (err) {return console.log(err);}
        user.employee = undefined;
        req.user.employee = undefined;
        employee.user = undefined;
        await user.save();
        await employee.save();
      });
    });
    req.flash('success', "Hey it worked!");
    res.redirect('back');
  } catch (e) {
    console.log(e);
    req.flash('error', e.message);
    res.redirect('back');
  }
});

// POST /jobsite/new
app.post('/jobsite/new', async (req, res) => {
  var jobsite = new Jobsite(req.body);
  try {
    await jobsite.save();
    req.flash('success', 'New jobsite added, some great bidding guys!')
    res.redirect('/jobsites');
  } catch (e) {
    console.log(e);
    req.flash('error', e.message);
    res.redirect('back');
  }  
});

// GET /jobsites
app.get('/jobsites', (req, res) => {
  var jobArray = [];
  var crewArray = [];
  Jobsite.find({}, (err, jobsites) => {
    jobsites.forEach((jobsite) => {
      jobArray[jobsite._id] = jobsite;
    });
    Crew.find({}, (err, crews) => {
      crews.forEach((crew) => {
        crewArray[crew._id] = crew;
      });
      res.render('jobsiteIndex', {jobArray, crewArray});
    });
  });
});

// GET /jobsite/:id
app.get('/jobsite/:id', (req, res) => {
  try {
    var reportArray = [];
    Jobsite.findById(req.params.id, async (err, jobsite) => {
      await DailyReport.find({jobsite}, (err, reports) => {
        reports.reverse().forEach((report) => {
          reportArray[report._id] = report;
        });
      });
      reportArray.slice().reverse().forEach((report) => {
        console.log(report);
      })
      var crewArray = await Crew.getAll();
      res.render('jobsite', {jobsite, reportArray, crewArray});
    });
  } catch (e) {
    console.log(e);
    req.flash('error', e.message);
    res.redirect('back');
  }
});

// DELETE /jobsite/:id
app.delete('/jobsite/:id', async (req, res) => {
  try {
    var id = req.params.id;
    if (!ObjectID.isValid(id)) {
      req.flash('error', 'Your browser seems to have given me (the server) the wrong jobsite ID');
      return res.status(404).send;
    }
    const jobsite = await Jobsite.findOneAndRemove({_id: id});
    if(!jobsite) {
      req.flash('error', 'Unable to find jobsite to be deleted, it gets to live a bit longer');
      res.status(404).send();
    }
    var crews = await Crew.find({jobsites: jobsite._id});
    for (var i in crews) {
      await Crew.findByIdAndUpdate({_id: crews[i]._id}, {$pull: {jobsites: jobsite._id}}, {new: true});
    }
  } catch (e) {
    console.log(e);
    req.flash('error', e.message);
    res.redirect('back');
  }
});

// POST /jobsite/:jobId/crew/:crewId
app.post('/jobsite/:jobId/crew/:crewId', async (req, res) => {
  try {
    var crewId = req.params.crewId;
    var jobId = req.params.jobId;
    if (!ObjectID.isValid(crewId) && !ObjectID.isValid(jobId)) {
      return res.status(404).send();
    }
    await Crew.findById(crewId, async (err, crew) => {
      await Jobsite.findById(jobId, async (err, jobsite) => {
        crew.jobsites.push(jobsite);
        await crew.save();
        jobsite.crews.push(crew);
        await jobsite.save();
      });
    });
  } catch (e) {
    console.log(e);
    req.flash('error', e.message);
    res.redirect('back');
  }
});

// DELETE /jobsite/:jobId/crew/:crewId
app.delete('/jobsite/:jobId/crew/:crewId', async (req, res) => {
  try {
    var crewId = req.params.crewId;
    var jobId = req.params.jobId;
    if (!ObjectID.isValid(crewId) && !ObjectID.isValid(jobId)) {
      return res.status(404).send();
    }
    await Crew.findByIdAndUpdate({_id: crewId}, {$pull: {jobsites: jobId}}, (err, crew) => {
      if (err) {
        console.log(err);
      }
    });
    await Jobsite.findByIdAndUpdate({_id: jobId}, {$pull: {crews: crewId}}, (err, jobsite) => {
      if (err) {
        console.log(err);
      }
    })
  } catch (e) {
    console.log(e);
    req.flash('error', e.message);
    res.redirect('back');
  }
});

// GET /employees
app.get('/employees', (req, res) => {
  var employeeArray = [];
  var crewArray = [];
  var userArray = [];
  Employee.find({}, (err, employees) => {
    if (err) {
      console.log(err);
      req.flash('error', err.message);
      return;
    }
    employees.forEach((employee) => {
      employeeArray[employee._id] = employee;
    });
    Crew.find({}, (err, crews) => {
      if (err) {
        console.log(err);
        req.flash('error', err.message);
        return;
      }
      crews.forEach((crew) => {
        crewArray[crew._id] = crew;
      });
      User.find({}, (err, users) => {
        if (err) {
          console.log(err);
          req.flash('error', err.message);
          return;
        }
        users.forEach((user) => {
          userArray[user._id] = user;
        });
        res.render('employees/employeeIndex', {employeeArray, crewArray, userArray});
      });
    });
  });
});

// GET /employee/:id
app.get('/employee/:id', (req, res) => {
  Employee.findById(req.params.id, (err, employee) => {
    crewArray = [];
    Crew.find({
      '_id': {$in: employee.crews}
    }, (err, crews) => {
      if (err) {
        req.flash('error', err.message);
        return console.log(err);
      }
      crews.forEach((crew) => {
        crewArray[crew._id] = crew;
      })
      res.render('employees/employee', {employee, crewArray});
    });
  })
});

// POST /employee
app.post('/employee', async (req, res) => {
  try {
    var employee = await new Employee(req.body);
    await employee.save();
    req.flash('success', 'A new employee has been added... how exciting!')
    res.redirect('back');
  } catch (e) {
    console.log(e);
    req.flash('error', e.message);
    res.redirect('back');
  } 
});

// POST /employee/user/:id
app.post('/employee/user/:id', async (req, res) => {
  try {
    var employee = await new Employee(req.body);
    await employee.save();
    await User.findById(employee.user, (err, user) => {
      if (err) {return console.log(err);}
      user.employee = employee._id;
      user.save((err) => {
        if (err) {
          console.log(err); 
          req.flash('error', err.message);
          res.redirect('back');
        }
      });
    });
    req.flash('success', 'You have created a new employee, AND linked it with your account, congrats!');
    res.redirect('back');
  } catch (e) {
    console.log(e);
    req.flash('error', e.message);
    res.redirect('back');
  }  
  
});

// DELETE /employee/:id
app.delete('/employee/:id', async (req, res) => {
  try {
    var id = req.params.id;
    if (!ObjectID.isValid(id)) {
      throw new Error('The ID sent from the browser was invalid');
    }
    const employee = await Employee.findOneAndRemove({
      _id: id
    });
    if(!employee) {
      throw new Error('Could not remove employee for whatever reason, maybe try again?');
    }
    var crews = await Crew.find({employees: employee._id});
    for (var i in crews) {
      await Crew.findByIdAndUpdate({_id: crews[i]._id}, {$pull: {employees: employee._id}}, {new: true});
    }
    req.flash('success', 'Employee deleted... that\'s too bad');
  } catch (e) {
    console.log(e);
    req.flash('error', e.message);
    res.redirect('back');
  }
});

// GET /vehicles
app.get('/vehicles', async (req, res) => {
  try {
    var vehicleArray = await Vehicle.getAll();
    res.render('vehicles/vehicleIndex', {vehicleArray});
  } catch (e) {
    console.log(e);
    res.render('vehicles/vehicleIndex', {vehicleArray});
  }
});

// POST /vehicle
app.post('/vehicle', async (req, res) => {
  try {
    var vehicle = await new Vehicle(req.body);
    await vehicle.save();
    req.flash('success', 'Ooooooo a new vehicle, Kelly\'s gonna love this');
    res.redirect('back');
  } catch (e) {
    console.log(e);
    req.flash('error', e.message);
    res.redirect('back');
  }
}); 

// DELETE /vehicle/:id
app.delete('/vehicle/:id', async (req, res) => {
  try {
    var id = req.params.id;
    if (!ObjectID.isValid(id)) {return res.status(404).send();}
    const vehicle = await Vehicle.findOneAndRemove({_id: id});
    if (!vehicle) {return res.status(404).send();}
    var crews = await Crew.find({vehicles: vehicle._id});
    for (var i in crews) {
      await Crew.findByIdAndUpdate({_id: crews[i]._id}, {$pull: {vehicles: vehicle._id}}, {new: true});
    }
    req.flash('success', 'Vehicle successfully deleted');
    res.redirect('back');
  } catch (e) {
    console.log(e);
    req.flash('error', e.message);
    res.redirect('back');
  }
});

// POST /crew
app.post('/crew', async (req, res) => {
  try {
    var crewLength = await Crew.getAll();
    crewLength = Object.keys(crewLength).length;
    var crew = new Crew(req.body);
    await crew.save();
    req.flash('success', `New crew has been added! Fun fact: Bow Mark now has ${crewLength + 1} crews`);
    res.redirect('back');
  } catch (e) {
    console.log(e);
    req.flash('error', e.message);
    res.redirect('back');
  }
});

// GET /crews
app.get('/crews', (req, res) => {
  if (req.user.admin == true) {
    Crew.find({}, (err, crews) => {
      var crewMap = [];
      crews.forEach((crew) => {
        crewMap[crew._id] = crew;
      });
      Employee.find({}, (err, employees) => {
        var employeeMap = [];
        employees.forEach((employee) => {
          employeeMap[employee._id] = employee;
        });
        Jobsite.find({}, async (err, jobsites) => {
          var jobArray = [];
          if(err){return console.log(err);}
          jobsites.forEach((jobsite) => {
            jobArray[jobsite._id] = jobsite;
          });
          try {
            var vehicleArray = await Vehicle.getAll();
            res.render('crews', {crewArray: crewMap, employeeArray: employeeMap, jobArray, vehicleArray});
          } catch (e) {
            console.log(e);
            req.flash('error', e.message);
            res.redirect('back');
          }
        });
      });
    });
  } else {
    req.flash('error', 'You are not authorized to view this page');
    res.redirect('back');
  }
});

// GET /crew/:id
app.get('/crew/:id', (req, res) => {
  Crew.findById(req.params.id, async (err, crew) => {
    err && console.log(err);
    try {
      var jobArray = [];
      var employeeArray = await Employee.getAll();
      var vehicleArray = await Vehicle.getAll();
      var jobs = await Jobsite.find({crews: crew._id});
      for (var i in jobs) {
        jobArray[jobs[i]._id] = jobs[i];
      } 
      res.render('crew', {crew, employeeArray, vehicleArray, jobArray});
    } catch (e) {
      console.log(e);
      req.flash('error', e.message);
      res.redirect('back');
    }
  });
});

// DELETE /crew/:id
app.delete('/crew/:id', async (req, res) => {
  try {
    var id = req.params.id;
    if (!ObjectID.isValid(id)) {
      return res.status(404).send;
    }
    const crew = await Crew.findOneAndRemove({_id: id});
    if(!crew) {
      req.flash('error', 'Crew has been spared from deletion for some reason');
      res.redirect('back');
    }
    var vehicles = await Vehicle.find({crews: crew._id});
    for (var i in vehicles) {
      await Vehicle.findByIdAndUpdate({_id: vehicles[i]._id}, {$pull: {crews: crew._id}}, {new: true});
    }
    var employees = await Employee.find({crews: crew._id});
    for (var i in employees) {
      await Employee.findByIdAndUpdate({_id: employees[i]._id}, {$pull: {crews: crew._id}}, {new: true});
    }
    var jobsites = await Jobsite.find({crews: crew._id});
    for (var i in jobsites) {
      await Jobsite.findByIdAndUpdate({_id: jobsites[i]._id}, {$pull: {crews: crew._id}}, {new: true});
    }
    req.flash('success', 'Crew has been deleted from this site, but will remain in our hearts');
    res.end();
  } catch (e) {
    console.log(e);
    req.flash('error', e.message);
    res.redirect('back');
  }
});

// POST /crew/:crewId/employee/:employeeId
app.post('/crew/:crewId/employee/:employeeId', async (req, res) => {
  try {
    var crewId = req.params.crewId;
    var employeeId = req.params.employeeId;
    if (!ObjectID.isValid(crewId) && !ObjectID.isValid(employeeId)) {
      return res.status(404).send();
    }
    Crew.findById(crewId, (err, crew) => {
      Employee.findById(employeeId, async (err, employee) => {
        employee.crews.push(crew);
        await employee.save();
        crew.employees.push(employee);
        await crew.save();
        req.flash('success', `${employee.name} is the newest crew member, this should be interesting`);
        res.end();  
      });
    });
  } catch (e) {
    console.log(e);
    req.flash('error', e.message);
    res.redirect('back');
  }
});

// DELETE /crew/:crewId/employee/:employeeId
app.delete('/crew/:crewId/employee/:employeeId', async (req, res) => {
  try {
    var crewId = req.params.crewId;
    var employeeId = req.params.employeeId;
    if (!ObjectID.isValid(crewId) && !ObjectID.isValid(employeeId)) {
      return res.status(404).send();
    }
    await Crew.findByIdAndUpdate({_id: crewId}, {$pull: {employees: employeeId}});
    await Employee.findByIdAndUpdate({_id: employeeId}, {$pull: {crews: crewId}});
    req.flash('success', 'Employee has been removed from the crew, good riddance');
    res.end();
  } catch (e) {
      console.log(e);
      req.flash('error', e.message);
      res.redirect('back');
  }
});

// POST /crew/:crewId/vehicle/:vehicleId
app.post('/crew/:crewId/vehicle/:vehicleId', async (req, res) => {
  try {
    var crewId = req.params.crewId;
    var vehicleId = req.params.vehicleId;
    if (!ObjectID.isValid(crewId) && !ObjectID.isValid(vehicleId)) {
      return console.log('ID is invalid');
    }
    var crew = await Crew.findById(crewId);
    var vehicle = await Vehicle.findById(vehicleId);
    vehicle.crews.push(crew);
    await vehicle.save();
    crew.vehicles.push(vehicle);
    await crew.save();
    req.flash('success', `Nice, ${crew.name} now get's to play with ${vehicle.name}`)
    res.end();
  } catch (e) { 
    console.log(e);
    req.flash('error', e.message);
    res.redirect('back');
  }
});

// DELETE /crew/:crewId/vehicle/:vehicleId
app.delete('/crew/:crewId/vehicle/:vehicleId', async (req, res) => {
  try {
    var crewId = req.params.crewId;
    var vehicleId = req.params.vehicleId;
    if (!ObjectID.isValid(crewId) && !ObjectID.isValid(vehicleId)) {
      return console.log('ID is invalid');
    }
    await Crew.findByIdAndUpdate({_id: crewId}, {$pull: {vehicles: vehicleId}});
    await Vehicle.findByIdAndUpdate({_id: vehicleId}, {$pull: {crews: crewId}});
    req.flash('success', 'Vehicle removed... it was fun while it lasted');
    res.end();
  } catch (e) {
    console.log(e);
    req.flash('error', e.message);
    res.redirect('back');
  }
});

// GET /jobreport/:jobId/crew/:crewId/report?date=date
app.get('/jobreport/:jobId/crew/:crewId/report?', async (req, res) => {
  try {
    const jobId = req.params.jobId;
    const crewId = req.params.crewId;
    if (!ObjectID.isValid(crewId) && !ObjectID.isValid(jobId)) {
      return res.status(404).send();
    }
    const date = new Date(decodeURI(req.query.date));
    var report = await DailyReport.find({jobsite: jobId, crew: crewId, date: {$gte: date.setHours(0,0,0,0), $lte: date.setHours(23,59,59,999)}});
    if (!_.isEmpty(report[0])) {
      res.redirect(`/report/${report[0]._id}`);
    } else {
      var report = await new DailyReport({
        date: new Date(),
        jobsite: jobId,
        crew: crewId
      });
      await report.save();
      res.redirect(`/report/${report._id}`);
    }
  } catch (e) {
    console.log(e);
    req.flash('error', e.message);
    res.redirect('back');
  }
});

// GET /reports
app.get('/reports', async (req, res) => {
  try {
    var reportArray = await DailyReport.getAll();
    var crewArray = await Crew.getAll();
    var jobArray = await Jobsite.getAll();
    var html = await res.render('reportIndex', {reportArray, crewArray, jobArray});
    console.log(html);
  } catch (e) {
    console.log(e);
    req.flash('error', e.message);
    res.redirect('back');
  }
});

// GET /report/:reportId
app.get('/report/:reportId', async (req, res) => {
  try {
    const reportId = req.params.reportId;
    var report = await DailyReport.findById(reportId);
    var crew = await Crew.findById(report.crew);
    var job = await Jobsite.findById(report.jobsite);
    var employeeArray = await Employee.getAll();
    var employeeHourArray = await EmployeeWork.find({dailyReport: report});
    var vehicleArray = await Vehicle.getAll();
    var vehicleHourArray = await VehicleWork.find({dailyReport: report});
    var productionArray = await Production.find({dailyReport: report});
    var materialArray = await MaterialShipment.find({dailyReport: report});
    var reportNote = await ReportNote.find({dailyReport: report});
    if (crew.employees.some((employee) => employee.equals(req.user.employee)) || req.user.admin == true) {
      res.render('dailyReport', {report, crew, job, employeeArray, employeeHourArray, vehicleArray, vehicleHourArray, productionArray, materialArray, reportNote: reportNote[0]});
    } else {
      req.flash('error', 'You are not authorized to view this page');
      res.redirect('back');
    }
  } catch (e) {
    console.log(e);
    req.flash('error', e.message);
    res.redirect('back');
  } 
});

// GET /report/:reportId/pdf
app.get('/report/:reportId/pdf', async (req, res) => {
  try {
    const reportId = req.params.reportId;
    var report = await DailyReport.findById(reportId);
    var crew = await Crew.findById(report.crew);
    var job = await Jobsite.findById(report.jobsite);
    var employeeArray = await Employee.getAll();
    var employeeHourArray = await EmployeeWork.find({dailyReport: report});
    var vehicleArray = await Vehicle.getAll();
    var vehicleHourArray = await VehicleWork.find({dailyReport: report});
    var productionArray = await Production.find({dailyReport: report});
    var materialArray = await MaterialShipment.find({dailyReport: report});
    var reportNote = await ReportNote.find({dailyReport: report});
    if (crew.employees.some((employee) => employee.equals(req.user.employee)) || req.user.admin == true) {
      res.render('reportPDF', {report, crew, job, employeeArray, employeeHourArray, vehicleArray, vehicleHourArray, productionArray, materialArray, reportNote: reportNote[0]}, (err, html) => {
        if(err) {throw new Error(err);}
        pdf.create(html, {orientation: "landscape"}).toStream((err, pdfStream) => {
          if (err) {   
            console.log(err);
            return res.sendStatus(500);
          } else {
            res.statusCode = 200;             
            pdfStream.on('end', () => {
              return res.end();
            });
            pdfStream.pipe(res);
          }
        });
      });
    } else {
      req.flash('error', 'You are not authorized to view this page');
      res.redirect('back');
    }
  } catch (e) {
    console.log(e);
    req.flash('error', e.message);
    res.redirect('back');
  } 
});

// POST /report/:reportId/approve
app.post('/report/:reportId/approve', async (req, res) => {
  try {
    await DailyReport.findByIdAndUpdate(req.params.reportId, {$set: {approved: true}}, {new: true});
    req.flash('success', 'Report has been approved, it will now sync to Excel! (once that feature is implemented...)');
    res.end();
  } catch (e) {
    console.log(e);
    req.flash('error', e.message);
    res.redirect('back');
  }
});

// POST /report/:reportId/disapprove
app.post('/report/:reportId/disapprove', async (req, res) => {
  try {
    await DailyReport.findByIdAndUpdate(req.params.reportId, {$set: {approved: false}}, {new: true});
    req.flash('success', 'Report is no longer approved, it will not sync to Excel (once that feature is implemented...)');
    res.end()
  } catch (e) {
    console.log(e);
    req.flash('error', e.message);
    res.redirect('back');
  }
});

// POST /employeehour
app.post('/employeehour', async (req, res) => {
  try {
    var report = await DailyReport.findById(req.body.dailyReport);
    var startTime = await timeHandling(req.body.startTime, report.date);
    var endTime = await timeHandling(req.body.endTime, report.date);
    var netEmployeeHours = 0;
    if (typeof req.body.employee == 'object') {
      for (var i in req.body.employee) {
        var employeeWork = new EmployeeWork({
          startTime, endTime,
          jobTitle: req.body.jobTitle,
          employee: req.body.employee[i],
          dailyReport: report._id
        });
        await employeeWork.save();
        await report.employeeWork.push(employeeWork);
        await report.save();
      };
      await EmployeeWork.find({dailyReport: report}, async (err, works) => {
        await works.forEach((work) => {
          netEmployeeHours += Math.round(Math.abs(work.endTime - work.startTime) / 3.6e6 * 100) / 100;
        });
      });
      req.flash('success', `Work added, that is a combined ${netEmployeeHours} hours on this job today!`);
      res.redirect(`/report/${report._id}`);
    } else {
      var employeeWork = await new EmployeeWork({
        startTime, endTime,
        jobTitle: req.body.jobTitle,
        employee: req.body.employee,
        dailyReport: report._id
      });
      await employeeWork.save();
      await report.employeeWork.push(employeeWork);
      await report.save();
      await EmployeeWork.find({dailyReport: report._id}, (err, works) => {
        works.forEach((work) => {
          netEmployeeHours += Math.round(Math.abs(work.endTime - work.startTime) / 3.6e6 * 100) / 100;
        });
      });
      req.flash('success', `Work added, that is a combined ${netEmployeeHours} employee hours on this job today!`);
      res.redirect(`/report/${report._id}`);
    }
  } catch (e) {
    try {
      if(req.body.startTime) {
        var startTime = await timeHandling(req.body.startTime, report.date);
        var start = new Date(startTime);
        startTime = `${start.getHours().toString()}:${start.getMinutes().toString()<10?'0':''}${start.getMinutes().toString()}`;
      } 
      if (req.body.endTime) {
        var endTime = await timeHandling(req.body.endTime, report.date);
        var end = new Date(endTime);
        endTime = `${end.getHours().toString()}:${end.getMinutes().toString()<10?'0':''}${end.getMinutes().toString()}`;
      }
      var query = querystring.stringify({
        item: 'employee',
        message: e.message,
        startTime, endTime,
        jobTitle: req.body.jobTitle,
        employee: req.body.employee,
        dailyReport: report._id
      });
      console.log(e);
      res.redirect(`/report/${report._id}/?` + query);
    } catch (e) {
      console.log(e);
      req.flash('error', e.message);
      res.redirect('back');
    }
  }
});

// POST /employeework/:id/update
app.post('/employeework/:id/update', async (req, res) => {
  try {
    var report = await DailyReport.findById(req.body.dailyReport);
    var startTime = await timeHandling(req.body.startTime, report.date);
    var endTime = await timeHandling(req.body.endTime, report.date);
    var netEmployeeHours = 0;
    await EmployeeWork.findByIdAndUpdate(req.params.id, {$set: {
      startTime, endTime,
      jobTitle: req.body.jobTitle,
      employee: req.body.employee,
      dailyReport: report
    }}, {new: true});
    await EmployeeWork.find({dailyReport: report._id}, (err, works) => {
      works.forEach((work) => {
        netEmployeeHours += Math.round(Math.abs(work.endTime - work.startTime) / 3.6e6 * 100) / 100;
      });
    });
    req.flash('success', `Work updated, that is a combined ${netEmployeeHours} employee hours on this job today!`);
    res.redirect('back');
  } catch (e) {
    console.log(e);
    req.flash('error', e.message);
    res.redirect('back');
  }
});

// DELETE /employeework/:id
app.delete('/employeework/:id', async (req, res) => {
  try {
    var id = req.params.id;
    var employeeWork = await EmployeeWork.findByIdAndRemove({_id: id});
    var report = await DailyReport.findByIdAndUpdate(employeeWork.dailyReport, {$pull: {employeeWork: employeeWork._id}}, (err) => err && console.log(err));
    req.flash('success', 'Employee work has been successfully deleted!');
    res.end();
  } catch (e) {
    console.log(e);
    req.flash('error', e.message);
    res.redirect('back');
  }
});

// POST /vehiclehour
app.post('/vehiclehour', async (req, res) => {
  try {
    var report = await DailyReport.findById(req.body.dailyReport);
    var startTime = await timeHandling(req.body.startTime, report.date);
    var endTime = await timeHandling(req.body.endTime, report.date);
    var netVehicleHours = 0;
    if (typeof req.body.vehicle == 'object') {
      for (var i in req.body.vehicle) {
        var vehicleWork = await new VehicleWork({
          startTime, endTime,
          jobTitle: req.body.jobTitle,
          vehicle: req.body.vehicle[i],
          dailyReport: report._id
        });
        await vehicleWork.save();
        await report.vehicleWork.push(vehicleWork);
        await report.save();
      };
      await VehicleWork.find({dailyReport: report._id}, (err, works) => {
        works.forEach((work) => {
          netVehicleHours += Math.round(Math.abs(work.endTime - work.startTime) / 3.6e6 * 100) / 100;
        });
      });
      req.flash('success', `Work added, that is a combined ${netVehicleHours} vehicle hours on this job today!`);
      res.redirect('back');
    } else {
      var vehicleWork = await new VehicleWork({
        startTime, endTime,
        jobTitle: req.body.jobTitle,
        vehicle: req.body.vehicle,
        dailyReport: report._id
      });
      await vehicleWork.save();
      await report.vehicleWork.push(vehicleWork);
      await report.save();
      await VehicleWork.find({dailyReport: report._id}, (err, works) => {
        works.forEach((work) => {
          netVehicleHours += Math.round(Math.abs(work.endTime - work.startTime) / 3.6e6 * 100) / 100;
        });
      });
      req.flash('success', `Work added, that is a combined ${netVehicleHours} vehicle hours on this job today!`);
      res.redirect('back');
    }
  } catch (e) {
    try {
      if(req.body.startTime) {
        var startTime = await timeHandling(req.body.startTime, report.date);
        var start = new Date(startTime);
        startTime = `${start.getHours().toString()}:${start.getMinutes().toString()<10?'0':''}${start.getMinutes().toString()}`;
      } 
      if (req.body.endTime) {
        var endTime = await timeHandling(req.body.endTime, report.date);
        var end = new Date(endTime);
        endTime = `${end.getHours().toString()}:${end.getMinutes().toString()<10?'0':''}${end.getMinutes().toString()}`;
      }
      var query = querystring.stringify({
        item: 'vehicle',
        message: e.message,
        startTime, endTime,
        jobTitle: req.body.jobTitle,
        vehicle: req.body.vehicle,
        dailyReport: report._id
      });
      console.log(e);
      res.redirect(`/report/${report._id}/?` + query);
    } catch (e) {
      console.log(e);
      req.flash('error', e.message);
      res.redirect('back');
    }
  }
});

// POST /vehiclework/:id/update
app.post('/vehiclework/:id/update', async (req, res) => {
  try  {
    var report = await DailyReport.findById(req.body.dailyReport);
    var startTime = await timeHandling(req.body.startTime, report.date);
    var endTime = await timeHandling(req.body.endTime, report.date);
    var netVehicleHours = 0;
    await VehicleWork.findByIdAndUpdate(req.params.id, {$set: {
      startTime, endTime,
      jobTitle: req.body.jobTitle,
      vehicle: req.body.vehicle,
      dailyReport: report._id
    }}, {new: true});
    await VehicleWork.find({dailyReport: report._id}, (err, works) => {
      works.forEach((work) => {
        netVehicleHours += Math.round(Math.abs(work.endTime - work.startTime) / 3.6e6 * 100) / 100;
      });
    });
    req.flash('success', `Work updated, that is a combined ${netVehicleHours} vehicle hours on this job today!`);
    res.redirect('back');
  } catch (e) {
    console.log(e);
    req.flash('error', e.message);
    res.redirect('back');
  }
});

// DELETE /vehiclework/:id
app.delete('/vehiclework/:id', async (req, res) => {
  try {
    var id = req.params.id;
    var vehicleWork = await VehicleWork.findByIdAndRemove({_id: id});
    var report = DailyReport.findByIdAndUpdate(vehicleWork.dailyReport, {$pull: {vehicleWork: vehicleWork._id}}, (err) => err && console.log(err));
    req.flash('success', 'Vehicle hours has successfully been deleted!');
    res.end();
  } catch (e) {
    console.log(e);
    req.flash('error', e.message);
    res.redirect('back');
  }
});

// POST /production
app.post('/production', async (req, res) => {
  try {
    var report = await DailyReport.findById(req.body.dailyReport);
    var startTime = await timeHandling(req.body.startTime, report.date);
    var endTime = await timeHandling(req.body.endTime, report.date);
    var netProductionHours = 0;
    var production = await new Production({
      jobTitle: req.body.jobTitle,
      quantity: req.body.quantity,
      unit: req.body.unit,
      startTime, endTime,
      description: req.body.description,
      dailyReport: report._id
    });
    await production.save();
    await report.production.push(production);
    await report.save();
    await Production.find({dailyReport: report._id}, (err, works) => {
      works.forEach((work) => {
        netProductionHours += Math.round(Math.abs(work.endTime - work.startTime) / 3.6e6 * 100) / 100;
      });
    });
    req.flash('success', `Production has been added! That is ${netProductionHours} hours of production today!`)
    res.redirect(`/report/${report._id}`);
  } catch (e) {
    try {
      if(req.body.startTime) {
        var startTime = await timeHandling(req.body.startTime, report.date);
        var start = new Date(startTime);
        startTime = `${start.getHours().toString()}:${start.getMinutes().toString()<10?'0':''}${start.getMinutes().toString()}`;
      } 
      if (req.body.endTime) {
        var endTime = await timeHandling(req.body.endTime, report.date);
        var end = new Date(endTime);
        endTime = `${end.getHours().toString()}:${end.getMinutes().toString()<10?'0':''}${end.getMinutes().toString()}`;
      }
      var query = querystring.stringify({
        item: 'production',
        message: e.message,
        startTime, endTime,
        jobTitle: req.body.jobTitle,
        quantity: req.body.quantity,
        unit: req.body.unit,
        description: req.body.description,
        dailyReport: report._id
      });
      console.log(e);
      res.redirect(`/report/${report._id}/?` + query);
    } catch (e) {
      console.log(e);
      req.flash('error', e.message);
      res.redirect('back');
    }
  }
});

// POST /production/:id/update
app.post('/production/:id/update', async (req, res) => {
  try {
    var report = await DailyReport.findById(req.body.dailyReport);
    var startTime = await timeHandling(req.body.startTime, report.date);
    var endTime = await timeHandling(req.body.endTime, report.date);
    var netProductionHours = 0;
    await Production.findByIdAndUpdate(req.params.id, {$set: {
      startTime, endTime,
      jobTitle: req.body.jobTitle,
      quantity: req.body.quantity,
      unit: req.body.unit,
      description: req.body.description, 
      dailyReport: report._id
    }}, {new: true});
    await Production.find({dailyReport: report._id}, (err, works) => {
      works.forEach((work) => {
        netProductionHours += Math.round(Math.abs(work.endTime - work.startTime) / 3.6e6 * 100) / 100;
      });
    });
    req.flash('success', `Production has been updated! That is a combined ${netProductionHours} hours of production today!`)
    res.redirect('back');
  } catch (e) {
    console.log(e);
    req.flash('error', e.message);
    res.redirect('back');
  }
});

// DELETE /production/:id
app.delete('/production/:id', async (req, res) => {
  try {
    var id = req.params.id;
    var production = await Production.findByIdAndRemove({_id: id});
    var report = DailyReport.findByIdAndUpdate(production.dailyReport, {$pull: {production: production._id}});
    req.flash('success', 'Production has successfully been deleted');
    res.end();
  } catch (e) {
    console.log(e);
    req.flash('error', e.message);
    res.redirect('back');
  }
});

// POST /material
app.post('/material', async (req, res) => {
  try {
    var report = await DailyReport.findById(req.body.dailyReport);
    if(req.body.startTime) {var startTime = await timeHandling(req.body.startTime, report.date)};
    if(req.body.endTime) {var endTime = await timeHandling(req.body.endTime, report.date)};
    if (req.body.source && !req.body.vehicle) {
      var material;
      var vehicle = await Vehicle.find({name: req.body.source.trim() + " Truck - " + req.body.sourceTruckCode.trim()});
      console.log(req.body);
      if (_.isEmpty(vehicle)) {
        if (!req.body.sourceTruckCode) {
          throw new Error('Must include truck code');
        }
        vehicle = await new Vehicle({
          name: req.body.source.trim() + " Truck - " + req.body.sourceTruckCode.trim(),
          vehicleType: "Dump Truck",
          rental: true,
          sourceCompany: req.body.source.trim()
        });
        var crew = await Crew.findById(report.crew);
        vehicle.crews.push(crew);
        await vehicle.save();
        crew.vehicles.push(vehicle);
        await crew.save();
        material = await new MaterialShipment({
          startTime, endTime,
          shipmentType: req.body.shipmentType,
          quantity: req.body.quantity,
          unit: req.body.unit,
          source: req.body.source,
          vehicle: vehicle._id,
          dailyReport: report._id
        });
      } else {
        material = await new MaterialShipment({
          startTime, endTime,
          shipmentType: req.body.shipmentType,
          quantity: req.body.quantity,
          unit: req.body.unit,
          source: req.body.source,
          vehicle: vehicle[0]._id,
          dailyReport: report._id
        });
      }
    } else {
      material = await new MaterialShipment({
        startTime, endTime,
        shipmentType: req.body.shipmentType,
        quantity: req.body.quantity,
        unit: req.body.unit,
        source: req.body.source,
        vehicle: req.body.vehicle,
        dailyReport: report._id
      });
    }
    await material.save();
    await report.materialShipment.push(material);
    await report.save();
    req.flash('success', 'The shipment has successfully been added');
    res.redirect(`/report/${report._id}`);
  } catch (e) {
    console.log(e);
    try {
      if(req.body.startTime) {
        var startTime = await timeHandling(req.body.startTime, report.date);
        var start = new Date(startTime);
        startTime = `${start.getHours().toString()}:${start.getMinutes().toString()<10?'0':''}${start.getMinutes().toString()}`;
      } 
      if (req.body.endTime) {
        var endTime = await timeHandling(req.body.endTime, report.date);
        var end = new Date(endTime);
        endTime = `${end.getHours().toString()}:${end.getMinutes().toString()<10?'0':''}${end.getMinutes().toString()}`;
      }
      var query = querystring.stringify({
        item: 'shipment',
        message: e.message,
        startTime, endTime,
        shipmentType: req.body.shipmentType,
        quantity: req.body.quantity,
        unit: req.body.unit,
        source: req.body.source,
        sourceTruckCode: req.body.sourceTruckCode,
        vehicle: req.body.vehicle,
        dailyReport: report._id
      });
      res.redirect(`/report/${report._id}/?` + query);
    } catch (e) {
      console.log(e);
      req.flash('error', e.message);
      res.redirect('back');
    }
  }
});

// POST /material/:id/update
app.post('/material/:id/update', async (req, res) => {
  try {
    var report = await DailyReport.findById(req.body.dailyReport);
    await MaterialShipment.findByIdAndUpdate(req.params.id, {$set: {
      shipmentType: req.body.shipmentType,
      quantity: req.body.quantity,
      unit: req.body.unit,
      vehicle: req.body.vehicle, 
      dailyReport: report
    }}, {new: true});
    req.flash('success', 'Shipment successfully updated');
    res.redirect('back');
  } catch (e) {
    console.log(e);
    req.flash('error', e.message);
    res.redirect('back');
  }
});

// DELETE /material/:id
app.delete('/material/:id', async (req, res) => {
  try {
    var id = req.params.id;
    var material = await MaterialShipment.findByIdAndRemove({_id: id});
    var report = DailyReport.findByIdAndUpdate(material.dailyReport, {$pull: {materialShipment: material._id}}, (err) => err && console.log(err));
    req.flash('success', 'Shipment has been successfully deleted');
    res.end();
  } catch (e) {
    console.log(e);
    req.flash('error', e.message);
    res.redirect('back');
  }
});

// POST /reportnote
app.post('/reportnote', async (req, res) => {
  try {
    var report = await DailyReport.findById(req.body.dailyReport);
    if (report.reportNote) {
      var note = await ReportNote.findByIdAndUpdate(report.reportNote, {note: req.body.note});
      await report.save();
      req.flash('success', 'Note updated successfully');
      res.redirect('back');
    } else {
      var note = await new ReportNote(req.body);
      await note.save();
      var report = await DailyReport.findById(req.body.dailyReport);
      report.reportNote = note._id;
      await report.save();
      req.flash('success', 'Note successfully added');
      res.redirect('back');
    }
  } catch (e) {
    console.log(e);
    req.flash('error', e.message);
    res.redirect('back');
  }
});

async function timeHandling(time, date) {
  try {
    var today = new Date(date);
    if (time.split(':')[1].split(' ')[1] == 'AM' ||
        time.split(':')[1].split(' ')[1] == undefined || 
        time.split(':')[0] == '12' && time.split(':')[1].split(' ')[1] == 'PM') {
      var hour = parseInt(time.split(':')[0]);
      if (time.split(':')[0] == '12' && time.split(':')[1].split(' ')[1] == 'AM') {
        var hour = parseInt(time.split(':')[0]) - 12;
      }
    } else {
      var hour = parseInt(time.split(':')[0]) + 12;
    }
    var minute = parseInt(time.split(':')[1].split(' ')[0]);
    var time = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), hour, minute));
    return time.setHours(time.getHours() + 6);
  } catch (err) {
    throw Error('Time info given was invalid');
  }
}

app.listen(port, () => {
  console.log(`Started on port ${port}`);
});

module.exports = {app}