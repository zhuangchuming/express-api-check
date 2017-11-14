'use strict'
//for user login,logout
var express = require('express');
var router = express.Router();
const request = require('request');
const async = require('async');
const _ = require('underscore');

const Teacher = require('../../models/User').Teacher;
const Student = require('../../models/User').Student;
const Role = require('../../models/Role').Role;

const socketManager = require('../../websocket');
const Request = require('../../services/request').Request;
const RequestParent = require('../../services/request').RequestParent;
const getGQBStatus = require('../../lib/common').getGQBStatus;
const getAQStatus = require('../../lib/common').getAQStatus;
const fullcharge = require('../../lib/common').fullcharge;//全功能支付

function validateEmail(email) {
    var re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}
function validateID(id){
    var re = /^\d/;
    return re.test(id);
}
//params:{role:'teacher/student',username:'',password:''}
router.post('/login',(req,res)=>{
    // if(!!req.session.user){
    // console.log('req.session',req.session);
    //   return res.sendStatus(200);
    // }
    const ATYPE = validateID(req.body.username)?"2":(validateEmail(req.body.username)?"3":"1");
    const ACCOUNT = req.body.username;
    const PWD = req.body.password;
    function login(cb){
        let request = new Request({
            ACCOUNT,ATYPE,'for':req.body.role,PWD
        },req.session);
        request.login(cb);
    }
    function uniqLogin(data,cb){
        socketManager.updateWs(req.session.ws_id,data.sID,req.app.get('redisClient'),(err,rlt)=>{
            cb(err,data);
        });
    }
    let dbStore,makeSession;
    if(req.body.role=='teacher'){
        dbStore = function(data,cb){
            let teacher = {
                name:data.name,
                tId:data.tID,
                passwd:PWD,
                mail:data.mail,
                account:ACCOUNT,
                schId:data.school.schID,
                lastLogin:new Date(),


            };
            Teacher.findOneAndUpdate({tId:data.tID},{$set:teacher},{upsert:true,new:true},(err,rlt)=>{
                cb(err,rlt);
            });
        }
        makeSession = function(teacher,cb){
            req.session.user = teacher;
            req.session.user.role = 'teacher';
            cb(null);
        }
    }else if(req.body.role=='student'){
        dbStore = function(data,cb){
            console.log('students',data)
            let student = {
                sId:data.sID,
                passwd:PWD,
                account:ACCOUNT,
                cId:data.class && data.class.cID,
                schId:data.school && data.school.schID,
                schoolName:data.school && data.school.schName,
                className:data.class && data.class.cName,
                lastLogin:data.tLoginOld,
                // tVIP:data.tVIP,
                No:data.sNo,
                declaration:data.slogan,
                portrait:'default'+data.txIdx,

                //这些数据都保持与data的名字一致
                tSrv:new Date().getTime(),
                sex:data.sex,
                phone:data.phone,
                name:data.name,
                mail:data.mail,

                //给app3.2.0使用
                book:data.book,
                class:data.class,
                school:data.school,
                tLogin:data.tLogin,
                tLoginOld:data.tLoginOld,
                slogan:data.slogan,
                txIdx:data.txIdx,
                sNo:data.sNo,
                sID:data.sID
            };
            // console.log('students',student)
            Student.findOneAndUpdate({sId:data.sID},{$set:student},{upsert:true,new:true},(err,rlt)=>{
                cb(err,rlt);
            });
        }
        makeSession = function(student,cb){

            req.session.user = student.toObject();
            req.session.user.role = 'student';
            req.session.COURSE = 1;
            cb(null,student);
        }

    }
    let addRole = (st,cb)=>{
        Role.findOne({sId:st.sId},(err,role)=>{
            if(err) role = null;
            st.role = role;
            cb(null,st);
        })
    };
    async.waterfall([login,dbStore,makeSession,getGQBStatus,addRole,getAQStatus,fullcharge],(err,rlt)=>{
        if(!!err){
            res.sendStatus(400);
        }else{

            let ck = req.session.requestCookie;
            // console.log('----------------',ck.key);
            // let aa = ck.key
            // res.cookie("aaa","bbbb")
            // res.cookie(ck.key,ck.value,{domain:'',expires:ck.expires,httpOnly:ck.httpOnly});//domain:ck.domain,
            res.send(rlt);
        }
    });
});
//test route

//app 3.2.0版本起不再使用此接口
router.route('/userinfo')
    .all((req,res,next)=>{
        if(!!req.session.user){
            next();
        }else{
            res.sendStatus(403);
        }
    }).patch((req,res,next)=>{
    function setInfo(info){
        if(req.session.user.role=='student'){
            let datagaomu = (cb)=>{
                let account= {ACCOUNT:req.session.user.account,
                    PWD:req.session.user.passwd,
                    for:'student'};
                let r = new RequestParent(account,req.session);
                switch(req.body.opt){
                    case 'setName':
                    case 'setNo':
                    case 'setMail':
                    //新增
                    case 'setSex':
                    case 'setDecla':
                    case 'setPortrait':
                        r.editInfo(Object.assign({},{SID:req.session.user.sId},info),cb);
                        break;
                    case 'setPWD':
                        r.changePwd(info,cb);
                        break;
                }

            };
            let db = (data,cb)=>{
                let update;
                switch(req.body.opt){
                    case 'setNo':
                        update = {$set:{No:req.body.val,sNo:req.body.val}};
                        break;
                    case 'setName':
                        update = {$set:{name:req.body.val}};
                        break;
                    case 'setMail':
                        update = {$set:{mail:req.body.val}};
                        break;
                    case 'setPWD':
                        update = {$set:{passwd:req.body.val}};
                        req.session.user.passwd = req.body.val;
                        break;
                        //新增
                    case 'setSex':
                        update = {$set:{sex:req.body.val}};
                        break;
                    case 'setDecla':
                        update = {$set:{declaration:req.body.val,slogan:req.body.val}};
                        break;
                    case 'setPortrait':
                        update = {$set:{portrait:req.body.val,txIdx:req.body.val.substring(req.body.val.length-1,req.body.val.length)}};
                        break;
                }
                Student.update({account:req.session.user.account},update,(err,rlt)=>{
                    if(err){
                        cb(err);
                    }else{
                        req.session.user.name = req.body.val;
                        cb(null);
                    }
                });
            };
            async.waterfall([datagaomu,db],(err,rlt)=>{
                if(err){
                    res.status(400).send(''+err);
                }else{
                    res.sendStatus(200);
                }
            });
        }else if(req.session.user.role=='teacher'){

        }
    }
    //params:opt,val
    switch(req.body.opt){
        case 'setPWD':
            if(req.body.val.length<6 || req.body.val.length>12){
                return res.sendStatus(400);
            }
            setInfo({'PWD0':req.session.user.passwd,'PWD1':req.body.val});
            break;
        case 'setName':
            setInfo({NAME:req.body.val});
            break;
        case 'setNo':
            setInfo({NO:req.body.val});
            break;
        case 'setMail':
            setInfo({MAIL:req.body.val});
            break;
        case 'setSex':
            setInfo({SEX:req.body.val});
            break;
        case 'setDecla':
            setInfo({SLOGAN:req.body.val});
            break;
        case 'setPortrait':
            let val = req.body.val;
            let index = val.substring(val.length-1,val.length);
            setInfo({HEAD:index});
            break;
    }
})
router.get('/prtdecla',(req,res)=>{
    if(!req.query.sIds)
        return res.sendStatus(400);
    try{
        let sIds = JSON.parse(req.query.sIds);
        Student.find({sId:{$in:sIds}},{portrait:1,declaration:1,sex:1,sId:1,_id:0},(err,rlt)=>{
            if(err){
                res.sendStatus(400);
            }else{
                let results = rlt.map((i)=>{
                    let item = i.toObject();
                    if(!item.portrait)
                        item.portrait = 'default0';
                    if(!item.declaration)
                        item.declaration = '';
                    return item;
                });
                res.send(results);
            }
        });
    }catch(error){
        console.error(error);
        res.sendStatus(400);
    }
});

router.post('/logout',(req,res)=>{
    req.session.role = undefined;
    req.session.user = undefined;
    res.sendStatus(200);
});
module.exports = router;