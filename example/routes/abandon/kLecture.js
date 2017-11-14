const express = require('express');
const router = express.Router();
const _ = require('underscore');

const RequestParent = require('../../services/request').RequestParent;

//2017.8.21之后统一使用代理请求

function isOauth(req,res,next){
	//debug(req);
	if(!!req.session.user){
		next();
	}else{
		res.sendStatus(403);
	}
}

function debug(req){
	req.session.COURSE = 1;
	req.session.BOOKVER = 1;
	req.session.user = { "_id" : "578c7088d25866a43e812c0c", 
  "sId" : 851, 
  "name" : "sunt", 
  "passwd" : "123456", 
  "mail" : null, 
  "account" : "@@010", 
  "cId" : 1, 
  "schId" : 1, 
  "lastLogin" : "2016-09-08T12:14:48.497Z",
  role: 'student',
	}
}
//paramRequest kid
//
router.get('/kLecture',isOauth,(req,res,next)=>{
	let account = {ACCOUNT:req.session.user.account,
								PWD:req.session.user.passwd,
								for:'student'
	};
	let r = new RequestParent(account,req.session);
	r.getKLecture(req.session.COURSE,req.query.kid,(err,rlt)=>{
		if(err){
			console.log(err);
			res.sendStatus(400);
		}else{
			res.send(rlt);
		}
	});
});

module.exports = router;