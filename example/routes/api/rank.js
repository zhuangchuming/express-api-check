const express = require('express');
const router = express.Router();
const async = require('async');

const Rank = require('../../services/rank');
const Student = require('../../models/User').Student;
const isOauth = require('../../lib/isOauth');


router.get('/rank',isOauth,function(req,res){
	var sid = req.session.user.sId;
	var cid = req.session.user.cId;
	var schid = req.session.user.schId;
	//var rank = new Rank(sid,cid,schid);
	var rank = new Rank(sid,req.session.user.account,req.session.user.passwd,req.session);
	function getDecla(s,cb){
		Student.findOne({sId:s.sid},{declaration:1,portrait:1},(err,rlt)=>{
			if(!!rlt){
				if(!!rlt.declaration)
					s.decla = rlt.declaration;
				if(!!rlt.portrait)
					s.portrait = rlt.portrait;
			}
			cb(null);
		});
	}
	async.parallel({
		// N:function(callback){rank.getRank('N',callback)},//做题数
		// avg:function(callback){rank.getRank('avg',callback)},//平均数
		// ok:function(callback){rank.getRank('ok',callback)},//正确数
		// OPN:function(callback){rank.getRank('OPN',callback)},//
		Honor:function(callback){rank.getHonor(callback)},
	},(err,results)=>{
		// console.log('results',results);
		if(err){
			console.log(err);
			res.sendStatus(400);
		}else{
			async.each(results.Honor,getDecla,(err)=>{
				if(err){
					res.sendStatus(400);
				}else{
					results.sid = req.session.user.sId;
          			results.tSrv = Date.now();
					res.send(results);
				}
			});
		}
	});
});


module.exports = router;