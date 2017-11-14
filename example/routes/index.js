'use strict';

const express = require('express');
const router = express.Router();

const jyeoo = require('./api/jyeoo');
const users = require('./api/users');
const rank = require('./api/rank');
const retrieve = require('./abandon/retrieve');
const store = require('./abandon/store');
const websocket = require('./api/websocket');
const book = require('./abandon/book');
const wrong = require('./api/wrong');
// const singleWork = require('./api/singleWork');
const task = require('./api/task');
const kLecture = require('./abandon/kLecture');
const feedback = require('./api/feedback');
// const likeCard = require('./api/likeCard');
// const jpushRouter = require('./api/jpush');
// const appMail = require('./api/backMgServer');
// const hjbReport = require('./api/hjb_report');
//cxj add
const zwRegister = require('./api/zwRegister');


const common = require('./api/common');
//文件的下载和断点续传接口
// const resumeDownload = require('./api/resumedownload');

const pay = require('./abandon/pay');
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

//在这里统一代理data的接口
router.use(require('./proxy/proxy'));

router.use('/jyeoo',jyeoo);
router.use('/api',users);
router.use('/api',rank);
router.use('/api',retrieve);
router.use('/api',store);
router.use('/api',websocket);
router.use('/api',book);
router.use('/api',wrong);
// router.use('/api',singleWork);
router.use('/api',task);
router.use('/api',kLecture);
router.use('/api',feedback);
// router.use('/api',likeCard);
// router.use('/api',jpushRouter);
// router.use('/api',appMail);
// router.use('/api',hjbReport);

router.use('/api',zwRegister);

// router.use('/file',resumeDownload);//视频播放,
router.use('/api',common);
router.use('/api',pay);


//重构接口
router.use('/jyeooNew',require('./newapi/jyeooNew'));//改变题目加载方式
router.use('/apiNew',require('./newapi/taskNew'));
router.use('/apiNew',require('./newapi/wrongNew'));
router.use('/apiNew',require('./newapi/storeNew'));
router.use('/apiNew',require('./newapi/GQB/GQB_buy'));//关卡包
router.use('/apiNew',require('./newapi/GQB/GQBCtl'));//关卡包状态控制
router.use('/apiNew',require('./newapi/GQB/CreatRole'));//创建角色接口
router.use('/apiNew',require('./newapi/outLogin'));//退出登录
router.use('/apiNew',require('./newapi/operator'));//渲染操作指南


//从这里开始使用接口检测功能
router.use(require('express-api-check').JustifyReq);
router.use('/api',require('./api/prtdecla'));//临时获取用户数据接口
router.use(require('./newapi/test'));
router.use('/collect',require('./collect/group'));
router.use('/collect',require('./collect/ae').router);
router.use('/collect',require('./collect/store'));
router.use('/collect',require('./collect/store_query'));
router.use(require('./upload/upload'));
router.use(require('./pay/pay').router);

router.use(require('express-api-check').onError);
module.exports = router;
