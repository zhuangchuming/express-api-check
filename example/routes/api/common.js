'use strict';
const express = require('express');
const router = express.Router();
const fs = require('fs');
const config = require('../../config/config');
const appVersionPath = config.appVersionPath;
const socketManager = require('../../websocket');
/********************************************************
 *
 *                      通用接口
 *
 * ******************************************************/

//获取服务器时间
router.get('/getTime', (req, res)=> {
    // console.log('session',req.session);
    var time = {time: Date.now()};
    res.send(time);
});
//高木学习app的app版本信息
let appStatus = null;
router.get('/getAppStatus', (req, res)=> {
    if(!appStatus){
        appStatus = JSON.parse(fs.readFileSync(appVersionPath, 'utf8'));
    }
    if (appStatus) {
        res.status(201).send(appStatus.app);
    } else {
        res.status(500).send('资源错误！');
    }
});
//中微版本的高木学习app的app版本信息
let zwappStatus = null;
router.get('/zw_getAppStatus', (req, res)=> {
    var data = JSON.parse(fs.readFileSync(appVersionPath, 'utf8'));
    if (data) {
        res.status(201).send(data.zw_app);
    } else {
        res.status(500).send('资源错误！');
    }
});

//判断账号是否登录
router.post('/isLogin', (req, res)=> {
    if(!req.body.wsId){
        res.send({no:400,msg:"缺少ws参数!"})
        return ;
    }
    let body = {no:200};
    if(socketManager.getWs(req.body.wsId)){
        body.islogin = true;
    }else{
        body.islogin = false;
    }
    res.send(body);
});
module.exports = router;
