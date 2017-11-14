const fs = require('fs');
const express = require('express');
const router = express.Router();
const mime = require('mime');
const RequestVideo = require('../../services/request').RequestVideo;
var path = require('path');
//视频目录
const config = require('../../config/config');

//下载目录
const downloadPath = "/Users/gaomu/Documents/shareFile/download/";

var courseData = null;//缓存读取的配置文件到内存中
const tenMin = 1000*60*10;//10分钟的长度
const rootPath = path.join(__dirname,'../../');//所有的用户目录
const ufpath = path.join(rootPath,'userData');
const video = config.videoBasePath + 'video/';//视频地址
const min_5 = config.videoBasePath + 'min_5/';//5分钟视频地址
function isOauth(req,res,next){
     if(!!req.cookies.oledu){
         next();
     }else{
         res.sendStatus(401);
     }
}
/********************************************************
 *
 *                      断点续传模块
 *
 * ******************************************************/

//判断是否需要扣除点数,结果回去给客户端后，客户端带着参数来播放视频
router.route('/videocounter')
    .all(isOauth)
    .get((request, response)=> {
        let sid = request.query.sid;
        let cID = request.query.class_id;
        var jsonFilePath = ufpath+'/'+sid+'.json';
        excute(request,response,cID,sid,jsonFilePath);
    })
    .post((request, response)=> {
        let sid = request.body.sid;
        let cID = request.body.class_id;
        var jsonFilePath = ufpath+'/'+sid+'.json';
        excute(request,response,cID,sid,jsonFilePath);
    })

//功能描述，断点续传视频文件
router.route('/video')
    // .all(isOauth)
    .get((request, response,next)=> {
        let sid = request.query.sid;//用户id
        let cId = parseInt(request.query.class_id);
        // var jsonFilePath = ufpath+'/'+sid+'.json';
        let path = getResourcePath(cId, response);
        if(!sid||!request.cookies.oledu||!request.session.lastWatch){//试看5分钟视频,lastWatch要调用扣点数接口后才有会有
            if(!path || !isFileExist(min_5+path+'.mp4')){//保证文件不存在的时候不扣除学生播放视频点数
                console.error(`用户:${sid} 访问5min视频-->${min_5+path+'.mp4'} 文件不存在, 请求源:${request.originalUrl} `)
                return ;//文件不存在
            }
            playVideoWithPipe(request,response,cId,min_5+path+'.mp4');
            return ;
        }
        if(!path || !isFileExist(video+path+'.mp4')){//保证文件不存在的时候不扣除学生播放视频点数
            console.error(`用户:${sid} 访问-->${video+path+'.mp4'} 文件不存在, 请求源:${request.originalUrl} `)
            return ;//文件不存在
        }
        path = video+path+'.mp4';//拼凑完整路径
        playVideoWithPipe(request,response,cId,path);
    });

//下载路由
router.route('/download')
    .get((request, response)=> {
        let requestPath = request.originalUrl;
        // console.log('head',request.headers);
        var transfer = new Transfer(request, response);
        let fileName = decodeURI(escape(request.query.fileName));//支持中文请求url
        // console.log('fileName', fileName, request.fresh);
        let path = getResourcePath(cId, response);
        if (!path || !isFileExist(path)) {
            console.error(`用户:${sid} 访问-->${fileName} 文件不存在, 请求源:${requestPath} `)
            response.status(404).send("未能找到对应资源文件");
            return;
        }
        transfer.Download(downloadPath + fileName);//返回文件
    });


//videocounter 逻辑使用
function excute(request,response,cID,sid,jsonFilePath){
    if(!cID || ! sid){
        response.status(400).send('Bad StudentRequest,请求参数错误。');
        return;
    }
    let path = getResourcePath(cID, response);
    if(!path || !isFileExist(video+path+'.mp4')){//保证文件不存在的时候不扣除学生播放视频点数
        console.error(`用户:${sid} 访问-->${video+path+'.mp4'} 文件不存在, 请求源:${request.originalUrl} `)
        return ;//文件不存在
    }
    readLocalFile(request,response,jsonFilePath,path,(value,data)=>{
            if(value){//需要扣除点数
                takeAWatch(request,response,cID,(val,count)=>{//调用扣除
                    if(val){//处理扣除成功的情况
                        let utime = new Date().getTime();
                        console.log(`用户:${sid} 访问-->${video+path+'.mp4'} 扣除点数成功,已经观看次数:${count}`);
                        updateFile(jsonFilePath,data,sid,path,utime);//更新本地文件
                        request.session.lastWatch = utime;//放到会话中与返回的参数做对比
                        response.status(201).send({no:200,time:utime});//可以播放
                    }
                });
            }else{
                let utime = new Date().getTime()
                request.session.lastWatch = utime;//放到会话中与返回的参数做对比
                response.status(201).send({no:200,time:utime});//继续播放
            }
        });
}

//看视频之前都应该先更新一下本地缓存文件
//data 写入文件的内容
//sid 用户id
//requestPath 请求的地址
//utime 操作的时间
function updateFile(filePath,data,sid,requestPath,utime){
    try{
        if(!data){
            data = new Array();
            data.push({url:requestPath,time:utime});
        }else{
            // try{
            //     data = JSON.parse(data);
            // }catch(error){
            //     data = new Array();
            // }
            for (var i = 0; i < data.length ; i++) {
                if(data[i].url == requestPath){//时间小于10min
                    //扣除点数继续播放视频
                    data[i].time = utime;
                    break; 
                }
            }
            if(i == data.length){
                data.push({url:requestPath,time:utime});
            }
        }
        fs.writeFileSync(filePath, JSON.stringify(data), 'utf8');
    }catch(err){
        console.error(`${sid}:updateFile fail 更新文件失败,${requestPath}`);
        return false;
    }
    return true;
}

//读取文件判断是否需要扣除点数
//callback 回调是否需要扣除点数 true/false
function readLocalFile(request,response,jsonFilePath,urlPath,callback){
    try {
        fs.readFile(jsonFilePath, 'utf8',function (err, data) {
            if (err) {
                //response.sendStatus(500);
                console.log(`${jsonFilePath} file not found ${err} 尝试创建。`);
                return callback(true);
            }
            try {
                var data = JSON.parse(data);
            } catch (error) {
                var data = new Array();
            }
            for (var i = 0; i < data.length; i++) {
                if (data[i].url == urlPath) {//时间小于10min
                    //扣除点数继续播放视频
                    let ltime = new Date().getTime();
                    if (ltime - data[i].time > tenMin) {//tenMin
                        callback(true, data); //扣除点数
                    } else {
                        callback(false);
                    }
                    break;
                }
            }
            //如果未找到匹配项
            if (i == data.length) {
                callback(true,data); //扣除点数
            }
        });
    }catch(error){
        console.error(`${jsonFilePath} error ${error}。`);
        response.sendStatus(500);
        // return callback(true);
    }
}

//调用扣除点数接口
//callback 回调扣除成功与否 true/false
function takeAWatch(request,response,cId,callback){
    let account = {ACCOUNT:'',PWD:'',for:'student'};
    let r = new RequestVideo(account,request.session);
    let value = '';
    for (var key in request.cookies) {
        value = value + key+'='+ encodeURIComponent(request.cookies[key])+';';
    }
    value = value.substring(0,value.length-1);
    let header = {
        cookie:value
    }
    r.watchVideo({class_id:cId},header,(err,body)=>{
        if(err){
            callback(false);
            console.error(`${cId} watchVideo,${err} , 请求源:${request.originalUrl}`);
            if(typeof err == 'number'){
                response.sendStatus(err);
            }
            else{
                response.status(500).send(err);
            }
            // response.status(500).send('服务器出错请稍后重试。');
        }else if(body.watched>0) {// 该课时本次观看后的观看次.
            callback(true,body.watched);
        }
    });
}


//调用方法解析并播放视频
// cId 教室id，path文件路径
function playVideoWithPipe(request,response,cId,path){
    if (!cId) {
        response.status(400).send('Bad StudentRequest,请求参数错误。');
        return;
    }
    var transfer = new Transfer(request, response);
    // let path = getResourcePath(cId, response);
    if (!path) {
        response.status(404).send("未能找到对应资源文件");
        return;
    }
    transfer.DownloadWithPipe(path);//返回文件
}

function playVideoWithUrl(request,response){
    var transfer = new Transfer(request, response);
    let fileName = decodeURI(escape(request.query.fileName));//支持中文请求url
    // console.log('fileName', fileName, request.fresh);
    fs.readFile(realPath+'course.json', (err, data) => {
        //读取course.json文件,获取文件编码标准内部的数据编码
        if (err) {
            console.error(`playVideoWithUrl,${err} , 请求源:${request.originalUrl}`);
            response.sendStatus(500);
            // throw err;
        }else if(fileName) {
            transfer.Download(realPath + fileName);//返回文件
        }else {
            response.end();
        }
    });
}



//获取资源文件中对应的资源路径
function getResourcePath(cId, response) {
    try {
        if(!courseData){//如果为读取过,那就不再读取
            courseData = JSON.parse(fs.readFileSync(config.general_configuration, 'utf8'));
        }
        let courses = courseData ? courseData.courses : null;
        if (courses != null) {
            for (let item = 0; item < courses.length; item++) {
                for (let k = 0; k < courses[item].ksInfo.length; k++) {
                    for(let co =0; co < courses[item].ksInfo[k].cons.length;co++){
                        let kItem = courses[item].ksInfo[k].cons[co];
                        if (kItem.id == cId) {
                            return  courses[item].zt_id + '/' + kItem.title;
                        }
                    }
                    // console.log('k', k);
                    // let kItem = courses[item].ksInfo[k];
                    // if (kItem.id == cId) {
                    //     return  courses[item].zt_id + '/' + kItem.title;
                    // }
                }
            }
            return null;//对应id找不到资源文件
        }
    } catch (err) {
        console.error(`${cId} getResourcePath,${err}`);
        response.sendStatus(500);
        return null;
    }
}

//判断文件是否存在
function isFileExist(filePath){
    try {
        fs.accessSync(filePath, fs.constants.R_OK);
        return true;
    }catch(error){
        return false;
    }
}


/**
 * [@description] 生成大文件文档流，并发送
 * [@param] {string} filePath 文件地址
 *
 */
Transfer.prototype.Download = function (filePath) {
    var self = this;
    self._initFile(filePath, write.bind(this,filePath));

}

/**
 * [@description] 生成大文件文档流，并发送
 * [@param] {string} filePath 文件地址
 */
Transfer.prototype.DownloadWithPipe = function (filePath) {
    var self = this;
    self._initVideo(filePath, pipe.bind(this,filePath));
 
}


/**
 * 通过管道的形式,全自动,数据流将被自动管理。这样，即使是可读流较快，目标可写流也不会超负荷（overwhelmed）
 */
function pipe(filePath){
    var self = this;
    var config = self.config
        resp = self.resp;
    //Node的读文件流，原生支持range读取。 
    config.stopPos = config.stopPos == 0 ? config.fileSize : config.stopPos;
    if (config.startPos > config.stopPos ) {//避免受到不明攻击
        resp.end();
        return;
    }
    var fReadStream = fs.createReadStream(filePath, {
        highWaterMark:  4 * 1024 * 1024,
        start: config.startPos,
        end: config.stopPos
    });
    fReadStream.pipe(resp);
    fReadStream.on('end', function () {// 当没有数据时，关闭数据流
        resp.end();
    });
}

/**
 * 如果整个数据被成功刷新到内核缓冲区，则返回 true。 如果全部或部分数据在用户内存中排队，则返回 false。 当缓冲区再次空闲时，则触发 'drain' 事件
 */
function write(filePath){
    var self = this;
    var config = self.config
    resp = self.resp;
    //Node的读文件流，原生支持range读取。
    if (config.startPos > config.fileSize) {//避免受到不明攻击
        resp.end();
        return;
    }
    var fReadStream = fs.createReadStream(filePath, {
        encoding: 'binary',
        highWaterMark:  1024 * 1024,
        start: config.startPos,
        end: config.stopPos == 0 ? config.fileSize : config.stopPos
    });
    fReadStream.on('data', function (chunk) { // 当有数据流出时，写入数据
        let tt = resp.write(chunk, 'binary');
        if(tt === false){
            fReadStream.pause();
        }
    });
    fReadStream.on('end', function () {// 当没有数据时，关闭数据流
        resp.end();
    });
    fReadStream.on('drain',function () {//等待发完后继续发
        console.log('drain continue');
        fReadStream.resume();
    });
    fReadStream.on('error', function(err) {
        console.log('error',err);
        resp.end(err);
    });
}



function Transfer(req, resp) {
    this.req = req;
    this.resp = resp;
}

/**
 * [@description] 计算上次的断点信息
 * [@param] {string} Range 请求http头文件中的断点信息，如果没有则为undefined，支持两种格式（range: bytes=232323-）range: bytes=0-12122）
 * [@return] {integer} startPos 开始的下载点
 */
Transfer.prototype._calStartPosition = function (Range) {
    var startPos = 0;
    let stopPos = 0;
    // console.log('Range', Range);
    if (typeof Range != 'undefined') {
        var startPosMatch = /^bytes=([0-9]+)-([0-9]*)$/.exec(Range);//修改支持自定义下载区间内容
        // console.log('startPosMatch', startPosMatch, Range);
        startPos = Number(startPosMatch[1]);
        if (typeof startPosMatch[2] == 'string') {
            stopPos = Number(startPosMatch[2]);
            // console.log('stopPos', stopPos);
        }
    }
    return {startPos, stopPos};
}

/**
 * [@description] 初始化配置信息
 * [@param] {string} filePath 文件路径
 * [@param] {function} down 下载开始的回调函数
 */
Transfer.prototype._initVideo = function (filePath, down) {
    var config = {};
    var self = this;
    fs.stat(filePath, function (error, state) {
        if (error)
            throw error;
        // console.log('state',state)
        config.fileSize = state.size;
        var range = self.req.headers.range;
        let obj = self._calStartPosition(range);//获取范围,支持自定义范围下载
        config.startPos = obj.startPos;
        config.stopPos = obj.stopPos;//设置自定义终点
        self.config = config;
        self._configVideoHeader(config);
        down();
    });
}

/**
 * [@description] 初始化配置信息
 * [@param] {string} filePath 文件路径
 * [@param] {function} down 下载开始的回调函数
 */
Transfer.prototype._initFile = function (filePath, down) {
    var config = {};
    var self = this;
    fs.stat(filePath, function (error, state) {
        if (error)
            throw error;
        // console.log('state',state)
        config.fileSize = state.size;
        var range = self.req.headers.range;
        let obj = self._calStartPosition(range);//获取范围,支持自定义范围下载
        config.startPos = obj.startPos;
        config.stopPos = obj.stopPos;//设置自定义终点
        self.config = config;
        self._configFileHeader(config);
        down();
    });
}

/**
 * [@description] 配置头文件
 * [@param] {object} Config 头文件配置信息（包含了下载的起始位置和文件的大小）
 * 状态码是206了
 */
Transfer.prototype._configVideoHeader = function (Config) {
    var startPos = Config.startPos,
        fileSize = Config.fileSize,
        resp = this.resp;
    // 如果startPos为0，表示文件从0开始下载的，否则则表示是断点下载的。
    // console.log('mime', mime.lookup(this.req.originalUrl));
    resp.setHeader('Content-Range', 'bytes ' + startPos + '-' + (fileSize - 1) + '/' + fileSize);
    resp.writeHead(206, 'Partial Content', {
        "Accept-Ranges": "bytes",
        "Content-Type": 'video/mp4',
        'Content-Length':fileSize - startPos,
        "Cache-control":'max-age=31536000',//一年后过期
        'last-modified':new Date().toUTCString()
    });
}

/**
 * [@description] 配置头文件
 * [@param] {object} Config 头文件配置信息（包含了下载的起始位置和文件的大小）
 * 起点传输位置为0的话,则是下载整个文件
 */
Transfer.prototype._configFileHeader = function (Config) {
    var startPos = Config.startPos,
        fileSize = Config.fileSize,
        resp = this.resp;
    // 如果startPos为0，表示文件从0开始下载的，否则则表示是断点下载的。
    resp.setHeader('content-length', fileSize - startPos);
    resp.setHeader('last-modified', new Date().toUTCString());
    resp.setHeader('Cache-control', 'max-age=31536000');//一年后过期
    resp.setHeader('Accept-Range', 'bytes');
    // console.log('mime', mime.lookup(this.req.originalUrl));
    if (startPos == 0) {
        resp.setHeader('content-range', 'bytes ' + startPos + '-' + (fileSize - 1) + '/' + fileSize);
        resp.writeHead(200, 'Partial Content', {
            'content-type': mime.lookup(this.req.originalUrl),
        });
    } else {
        resp.setHeader('content-range', 'bytes ' + startPos + '-' + (fileSize - 1) + '/' + fileSize);
        resp.writeHead(206, 'Partial Content', {
            'content-type': mime.lookup(this.req.originalUrl),
        });
    }
    // console.log('head');
}

module.exports = router;
