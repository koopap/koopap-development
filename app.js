var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var partials = require('express-partials');
var session = require('express-session');
var methodOverride = require('method-override');
var flash = require('express-flash');

const passport = require('passport');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

global.token = "1";

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride('_method', {methods: ["POST", "GET"]}));
app.use(partials());

// Express-flash: it is stored over express-session (req.session) in an array
// Create message: req.flash("name", "message")
// Available in res.locals.messages.name
app.use(flash());

// session configuration
app.use(session({
  secret: "jb83bdi94nc9248jdnkq938rf",
  resave: false,
  saveUninitialized: true
}));

// passport and user session configuration
app.use(passport.initialize( {
  userProperty: 'loginUser'
}));
app.use(passport.session());

app.use(function(req, res, next) {
  // To use req.loginUser in the views
  res.locals.loginUser = req.loginUser && {
      id: req.loginUser.id,
      displayName: req.loginUser.name,
      isAdmin: req.loginUser.isAdmin
  };
  next();
});


app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
