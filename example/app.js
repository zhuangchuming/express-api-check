var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var RedisStore = require('connect-redis')(session);
var redis = require('redis');

var routes = require('./routes/index');
var app = express();
var nunjucks = require('nunjucks');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect("mongodb://localhost/test");

var redisClient = redis.createClient({host: '127.0.0.1'});

// var apiInit = require('express-api-check').Init;
var apiInit = require('../index').Init;
let interFaceRoot = path.join(__dirname, '/itFacepath/');//接口文档根目录
let itCFace = path.join(__dirname, '/routes/itCount.json');//接口统计地址
let upFileDir = path.join(__dirname,'/public/uploads/');//上传文件根目录
apiInit(interFaceRoot, itCFace, null, process.env.NODE_ENV == 'production'? false:true,upFileDir);//初始化接口检测功能


// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');
var env = nunjucks.configure('views', {
    autoescape: false,
    express: app
});
// uncomment after placing your favicon in /public
app.use(logger('dev'));

// parse application/json 
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.use(cookieParser());
app.use('/apiCheck', express.static(path.join(__dirname, 'public')));
app.use(session({
    key: "appServer",
    store: new RedisStore({host: '127.0.0.1', client: redisClient, port: 6379}),
    secret: 'test here',
    resave: false,
    saveUninitialized: false,
    cookie: {httpOnly: true},
}));

app.use('/apiCheck', routes);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});


redisClient.on("error", function (err) {
    console.log("Error " + err);
});

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

module.exports = app;
