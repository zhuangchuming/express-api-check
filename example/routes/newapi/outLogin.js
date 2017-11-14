/**
 * Created by cxj on 17-9-7.
 */
'use strict';
const express = require('express');
const router = express.Router();
var http=require('http');
var request = require('request');

router.get('/outLogin',function(req,res){
    let sessionId  = req.sessionID;
    let redisClient = req.app.get('redisClient');
    if(redisClient&&sessionId){
        redisClient.del('sess:'+sessionId);
    }
    res.send({no:200,msg:'退出登录成功!'})
});




module.exports = router;