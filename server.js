var express = require('express');
var bodyParser = require('body-parser');
var passport = require('passport');
var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

require('./models/db');
require('./config/passport');

app.set('port',(process.env.PORT || 3000));
var routeApi = require('./routes/index');

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT ,DELETE');
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  next();
});

app.use(passport.initialize());
app.use('/api',routeApi);

//设置基本环境变量
app.set('resources',__dirname+'/public/resources');

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// Catch unauthorized errors
app.use(function (err,req,res,next) {
  if(err.name === 'UnauthorizedError'){
    res.status(401);
    res.json({"message":err.name + ": " + err.message});
  }
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.json({"message":err.message});
});

app.listen(app.get('port'),function(){
  console.log('app running on port',app.get('port'));
});
