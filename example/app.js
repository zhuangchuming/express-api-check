var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
require('body-parser-xml')(bodyParser);
var session = require('express-session');
var RedisStore = require('connect-redis')(session);
var redis = require('redis');
var redisClient = redis.createClient({host: require('./config/redis').db.host});
var mongoose = require('mongoose');

var routes = require('./routes/index');//app路由
var crashHandle = require('./lib/crashHandle');
crashHandle.init();//初始化崩溃捕获机制
var app = express();
mongoose.Promise = global.Promise;
mongoose.connect(require('./config/mongodb').db.url);
var nunjucks = require('nunjucks');

app.set('redisClient', redisClient);
require('./lib/event');
global.redisClient = redisClient;

var apiInit = require('express-api-check').Init;
let interFaceRoot = path.join(__dirname, '../gaomuxuexi-interface-desc/gaomuxuexi-app-student-server/');//所有的用户目录
let itCFace = path.join(__dirname, '/routes/itCount.json');
// console.log('process',process.env.NODE_ENV )
let upFileDir = path.join(__dirname,'/public/uploads/');
// console.log('upFileDir',upFileDir)
apiInit(interFaceRoot, itCFace, null, process.env.NODE_ENV == 'production'? false:true,upFileDir);//初始化接口检测功能

var rootPath = __dirname;
// 开发环境是 node ./bin/www,__dirname的根目录地址变了
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

// require('./lib/cleanSession')(redisClient);
// view engine setup
app.set('views', path.join(rootPath, 'views'));
app.set('view engine', 'html');
var env = nunjucks.configure('views', {
    autoescape: false,
    express: app
});
//用来处理寒假包数据报告的数据转换
env.addFilter('parseInt', function (num) {
    return parseInt(num);
});
// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
// app.use(bodyParser.xml({
//   limit: '2MB',   // Reject payload bigger than 1 MB
//   xmlParseOptions: {
//     normalize: true,     // Trim whitespace inside text nodes
//     normalizeTags: true, // Transform tags to lowercase
//     explicitArray: false // Only put nodes in array if >1
//   }
// }));//处理微信支付回调处理流
// app.post('/app/notify_url',function(req,res){
//   let body = req.body;
//   console.log('body',body);
// });

//保存原始参数的数据
/*app.use(function (req, res, next) {
    var reqData = [];
    var size = 0;
    //有流数据就读出来
    //过滤掉上传文件接口的流
    let url = req.url.substring(req.url.lastIndexOf('/'), req.url.length);
    if (['/upload', '/uploads','/s_qCommit'].indexOf(url) != -1) {
        next();
        return;
    }
    req.on('data', function (data) {
        reqData.push(data);
        size += data.length;
    });
    req.on('end', function () {
        req.rawData = Buffer.concat(reqData, size);
    });
    next();
});*/

// parse application/json 
app.use(bodyParser.json());
// parse application/x-www-form-urlencoded 
app.use(bodyParser.urlencoded({extended: false}));

app.use(cookieParser());
app.use('/app', express.static(path.join(rootPath, 'public')));
app.use(session({
    key: "appServer",//不能改动,会影响代理的重新登录
    store: new RedisStore({host: require('./config/redis').db.host, client: redisClient, port: 6379}),
    secret: 'gaomu here',
    resave: false,
    saveUninitialized: false,
    cookie: {httpOnly: true},//,maxAge: 1*60*1000
}));

app.use('/app', routes);//app请求统一入口

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
