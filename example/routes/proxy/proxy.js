const express = require('express');
const router = express.Router();
let {timeString} = require('../../lib/common');
var wrap = require('co-express');
const isOauth = require('../../lib/isOauth');
const RequestParent = require('../../services/request').RequestParent;

const StudentRequest = require('../../services/netUtil').StudentRequest;
var requestUrl = require('../../config/config').requestUrl;

var request = require('request');
var http=require('http');
/***********************************************************************/
const reLoginLogic = require('../../logic/replaceLogin');
const loginLogic = require('../../logic/s_login');
const rankLogic = require('../../logic/s_query');
/************************************************************************/

//url的判断
function defineUrl(method,url) {
    let realUrl ;
    if (method == 'GET') {
        realUrl = url.substr(url.lastIndexOf('app/') + 4, url.lastIndexOf('?') > 0 ? url.lastIndexOf('?') - 5 : url.length);
    } else {
        realUrl = url.substr(url.lastIndexOf('app/') + 4, url.length);
    }
    return realUrl;
}

//data大多数接口直接在这里转
//'s_query',s_login这几个接口需要另外处理,所以保持原来的不变
const route = ['GQB_buy', 'GQB_qry', 'GQB_s_rpt',
    's_login','s_qErrLog','s_query',     //需要特殊处理的data请求写在这里
    'k_lecture',
    's_bookSelect', 's_bookSet', 's_chgPwd', 's_edit', 's_getpwd', 's_bindMail', 's_K4testJudge',//
    's_logout', 's_qCommit', 's_qPick',
    's_taskGet', 's_taskDoneK', 's_retrieve',
    'vip/buy', 'vip/qry', 'vip/rpt',
    's_ccgQry','s_ccgLstQ','s_testEnd','get_extQ','s_rank'];


var proxy = require('express-http-proxy');

const isMultipartRequest = function (req) {
  let contentTypeHeader = req.headers['content-type'];
  return contentTypeHeader && contentTypeHeader.indexOf('multipart') > -1;
};

router.use(proxy(requestUrl,{
    filter: function(req, res) {
        // console.log('aaaa')
        let url = req.originalUrl;
        let method = req.method;
        let realUrl = defineUrl(method,url);
        // return req.method == 'GET';
        if (isMultipartRequest(req) || route.indexOf(realUrl) == -1) {//不属于陈老师接口
            return false;
        }else {
            // if (req.session.user) {
                return true;
            // } else {
            //     res.sendStatus(403);
            //     return false;
            // }
        }

    },
    //修改路径
    proxyReqPathResolver: function(req) {
        let t = require('url').parse(req.url).path;
        return t;
    },

    //提前处理  只处理body
    proxyReqBodyDecorator: function(bodyContent, srcReq) {
        let method = srcReq.method; //请求模式
        let url = srcReq.originalUrl;//获取返回url

        // console.log("url----->"+url);

        let realUrl = defineUrl(method,url);
        if(realUrl == 's_login'){//处理登录后的数据
            bodyContent = loginLogic.deal_login_body(bodyContent);
        }else if(realUrl == 's_edit'){
            bodyContent.SID = srcReq.session.user.sId;//学生id
        }else if(realUrl == 's_K4testJudge'){ //单次报告
            bodyContent = {
                COURSE:parseInt(srcReq.session.COURSE),
                BOOKVER:parseInt(srcReq.session.BOOKVER),
                KIDS:srcReq.body.KIDS,
            }
        }else if(['s_taskDoneK' ,'s_bookSelect','s_ccgQry','k_lecture'].indexOf(realUrl) != -1){//弱点击破增加课程
           bodyContent.COURSE = srcReq.session.COURSE;
        }else if(['s_taskGet' ,'s_qCommit','s_testEnd'].indexOf(realUrl) != -1 ){
            bodyContent.COURSE = srcReq.session.COURSE;
            bodyContent.BOOKVER = parseInt(srcReq.session.BOOKVER);

        }else if('s_qPick' == realUrl){
            bodyContent.COURSE = srcReq.session.COURSE;
            if(!bodyContent.BOOKVER){
                bodyContent.BOOKVER = parseInt(srcReq.session.BOOKVER);
            }
        }
        return bodyContent;
    },

    proxyReqOptDecorator: function(proxyReqOpts, srcReq) {
        return proxyReqOpts;
    },

    //intercept选项用于在将响应返回给客户端之前，对响应做处理
    userResDecorator: wrap(function *(proxyRes, proxyResData, userReq, userRes) {
        let method = userReq.method; //请求模式
        let data ;//返回内容
        try {
            data = JSON.parse(proxyResData.toString('utf8'));//返回的数据
        }catch(err){
            return JSON.stringify({no:500,data:proxyResData.toString('utf8')});
        }
        let url = userReq.originalUrl;//获取返回url
        let realUrl = defineUrl(method,url);
        if(data.no != 200){ //不是200直接返回
            if(data.no ==  401){  //需要重新登录的情况下
                let {err,rlt} = yield reLoginLogic.reLogin(userReq,userRes);
                if(err){
                    return JSON.stringify(err);//{err:err}
                }else{
                    return JSON.stringify(rlt);
                }
            }else{
                return JSON.stringify(data);
            }
        }
        // console.log('userReq.body',userReq.body)
        //200 在此处决定是否要特殊处理一些请求。
        if(realUrl == 's_login'){//处理登录后的数据
            let {err,rlt} = yield loginLogic.deal_login(userReq,data);
            if(err){
                return JSON.stringify({no:400,msg:err.message});
            }else{
                data = rlt;
                data.no  = 200; //直接加no返回登录
            }
        }else if(realUrl == 's_query' && !userReq.body.VERSION){//处理排行榜数据
            let {err,rlt} = yield rankLogic.deal_rank(userReq,data);
            if(err){
                return JSON.stringify({no:400,msg:err ? err.message:'s_query 或者 s_rank出错'});
            }else{
                data = rlt;
                data.no  = 200; //成功处理
            }
        }else if(realUrl == 's_bookSelect'){
            userReq.session.BOOKVER = data.book.ver;
            userReq.session.COURSE = data.book.couID;
        }else if(realUrl == 's_bookSet'){
            userReq.session.COURSE = userReq.body.COURSE;
            userReq.session.BOOKVER = userReq.body.BOOKVER;
        }else if(realUrl == 's_taskGet'){
            if(!!data.Q){
                userReq.session.taskError = data.Q;
            };
        }

        return JSON.stringify(data);
    })
}));



function getCommitOpt(){
    let options =null;
        if(requestUrl.indexOf(':8000') != -1){
           options={
               hostname:'112.74.23.97',
               port:8000,
               path:'/s_qCommit',
               method:'POST',
           };
        }else{
            options = {
                hostname:'data.gaomuxuexi.com',
		            path:'/s_qCommit',
                method:'POST',
            };
    }
    return options;
}

//提交题目(含图片部分)
router.route('/s_qCommit')
    .post((req,res)=>{
        var reqData = [];
        var size = 0;
        req.on('data', function (data) {
            reqData.push(data);
            size += data.length;
        });
        req.on('end', function () {
            req.rawData = Buffer.concat(reqData, size);
            let opt = getCommitOpt(req);//获取基本信息
            opt.headers = req.headers;//设置头部
            let getDataReq = http.request(opt, (getDataRes)=> {
                getDataRes.setEncoding('utf8');
                getDataRes.on('data', wrap(function *(data) {
                    try{
                        data = JSON.parse(data);
                    }catch(err){
                        res.send({no:500,msg:"登录失败"});
                        return;
                    }
                    if(data&&data.no == 401){
                        let {err,rlt} = yield reLoginLogic.reLogin(req,res);
                        if(err){
                            res.send(err);
                        }else{
                            res.send(rlt);
                        }
                        return ;
                    }
                    res.send(data);
                }));
                getDataRes.on('end', ()=> {

                });
            });
            getDataReq.on('error', function (e) {
                res.send('error');
            });
            getDataReq.write(req.rawData);
            getDataReq.end();
        });


    });


let reRequest = wrap(function *(req,res){
    let account = {
        ACCOUNT: req.session.user.account,
        PWD: req.session.user.passwd,
        for: 'student'
    };
    let r = new StudentRequest(account, req.session);
    let rd = yield r.login();
    let {err,rlt} = yield loginLogic.deal_login(req,rd.data);
    if(err){
        return false;
    }else {
        // let ck = req.session.requestCookie;
        // res.cookie(ck.key, ck.value, {expires: ck.expires, httpOnly: ck.httpOnly});//domain:ck.domain,
    }

})

// // var exampleProxy = proxy('/app',options);
//
// // router.use(exampleProxy)
//
// //data的接口,直接代理请求转过去
// router.use(wrap(function *(req, res, next) {
//     let url = req.originalUrl;
//     let method = req.method;
//     let realUrl;
//     if (method == 'GET') {
//         realUrl = url.substr(url.lastIndexOf('app/') + 4, url.lastIndexOf('?') > 0 ? url.lastIndexOf('?') - 5 : url.length);
//     } else if (method == 'POST') {
//         realUrl = url.substr(url.lastIndexOf('app/') + 4, url.length);
//     }
//     if (route.indexOf(realUrl) == -1) {//不属于陈老师接口
//         next();
//     } else {
//         //属于data的接口需要先判断是否已经登录
//         if (req.session.user) {
//             // proxy(req, res);
//             // yieldProxy(req, res)
//             // exampleProxy(req,res,next);
//             // proxy.web(req, res, { target: 'http://127.0.0.1:6060' });
//             // proxy('http://data.gaomuxuexi.com',{
//             //     proxyReqPathResolver: function(req) {
//             //         return require('url').parse(req.url).path;
//             //     }
//             // })
//         } else {
//             res.sendStatus(403);
//         }
//     }
// }))

//以回调的方式，代理请求
function proxy(req, res) {
    let account = {
        ACCOUNT: req.session.user.account,
        PWD: req.session.user.passwd,
        for: 'student'
    };
    let r = new RequestParent(account, req.session);
    let method = req.method;
    let url = req.originalUrl;
    let realUrl = url.substr(url.lastIndexOf('app/') + 3, url.length);
    if (method == 'GET') {
        r.CommonGet(realUrl, (err, rlt)=> {
            if (err) {
                res.send(err);
            } else {
                res.send(rlt);
            }
        })
    } else {
        r.CommonPost(realUrl, req.body, (err, rlt)=> {
            if (err) {
                res.send(err);
            } else {
                res.send(rlt);
            }
        })
    }
}

//以同步的方式yield，代理请求
let yieldProxy = wrap(function *(req, res) {
    let account = {
        ACCOUNT: req.session.user.account,
        PWD: req.session.user.passwd,
        for: 'student'
    };
    let r = new StudentRequest(account, req.session);
    let method = req.method;
    let url = req.originalUrl;
    let realUrl = url.substr(url.lastIndexOf('app/') + 3, url.length);
    if (method == 'GET') {
        let obj = yield r.CommonGet(realUrl);
        if (obj.err) {
            res.send(obj.err);
        } else {
            res.send(obj.data);
        }
    } else {
        let obj = yield r.CommonPost(realUrl, req.body)
        if (obj.err) {
            res.send(obj.err);
        } else {
            res.send(obj.data);
        }
    }
});


module.exports = router;
