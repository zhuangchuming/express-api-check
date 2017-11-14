const express = require('express');
const router = express.Router();
const _ = require('underscore');
const EventEmitter = require('events');
const async = require('async');

const socketManager = require('../../websocket');
const Store = require('../../models/Store');
const Jyeoo = require('../../models/Jyeoo');
const isOauth = require('../../lib/isOauth');

/**********************

		收藏夹

***********************/
//params: qid
router.get('/isStore',isOauth,(req,res)=>{
	let step0 = (cb)=>{
		Jyeoo.findOne({id:req.query.qid},(err,rlt)=>{
			cb(err||!rlt,rlt);
		});
	}
	let step1 = (rlt,cb)=>{
		Store.findOne({jyeoo:rlt._id,
			from:req.session.user._id
		},cb)
	}
	async.waterfall([step0,step1],(err,rlt)=>{
		if(!!rlt)
			res.send({no:200});
		else
			res.send({no:404});
	});
});

//新的api,在使用中
router.get('/storelog',isOauth,(req,res)=>{
		if(!req.session.storelogMark){
			req.session.storelogMark = new Date();
		}else if(req.query.start){
			req.session.storelogMark = new Date();
		}
		Store.find({from:req.session.user._id,date:{$lt:req.session.storelogMark}})
				.sort({date:-1})
				.limit(15) //chang by cxj
				.populate('jyeoo')
				.exec((err,rlt)=>{
					if(err)
						return res.sendStatus(400);
					else if(!rlt||rlt.length==0)
						return res.send({no:200,data:[]});
					req.session.storelogMark = _.last(rlt).date;
					console.log('req.session.storelogMark',req.session.storelogMark)
					let data = rlt.map((item)=>_.pick(item.jyeoo,'id','type','bref','A'));
					res.send({no:200,data:data});
				});
	});

//v2.3.4之后使用，storelog在v2.3.3以下使用
router.post('/s_qStorelog',isOauth,(req,res)=>{
		// if(!req.session.storelogMark){
		// 	req.session.storelogMark = new Date();
		// }else if(req.query.start){
		// 	req.session.storelogMark = new Date();
		// }
		if(req.body.MAXTLOG == undefined){
			res.send({no:400,msg:"缺少MAXTLOG参数"});
			return;
		}
		let MAXTLOG = req.body.MAXTLOG;
		let query = {from:req.session.user._id};
		if(MAXTLOG != 0){
			query.date = {$lt:MAXTLOG};
		}

		Store.find(query)
				.sort({date:-1})
				.limit(15) //chang by cxj
				.populate('jyeoo')
				.exec((err,rlt)=>{
					if(err)
						return res.sendStatus(400);
					else if(!rlt||rlt.length==0)
						return res.send({no:200,data:[]});
					// req.session.storelogMark = _.last(rlt).date;
					// console.log('rlt',rlt)
					let d  = rlt.map((item)=>{
						let udata = JSON.parse(JSON.stringify(item.jyeoo));
						udata['date'] = item.date;
						udata['userChoice'] = item.userChoice;
						return udata;
					})
					// console.log('req',d);
					let data = d.map((item)=>_.pick(item,'id','type','bref','A','date','userChoice'));
					// console.log('userChoice',d)
					res.send({no:200,data:data});
				});
	});

//get请求没有使用
router.route('/store')
	.all(isOauth)
	.get((req,res)=>{
		if(!req.session.storeMark){
			req.session.storeMark = new Date();
		}else if(req.query.start){
			req.session.storeMark = new Date();
		}
		Store.find({from:req.session.user._id,date:{$lt:req.session.storeMark}})
				.sort({date:-1})
				.limit(10)
				.populate('jyeoo')
				.exec((err,rlt)=>{
					if(err)
						return res.sendStatus(400);
					else if(!rlt||rlt.length==0)
						return res.send({state:'finish'});
					req.session.storeMark = _.last(rlt).date;
					res.send(rlt.map((item)=>_.pick(item.jyeoo,'id','type','Q','opts','_id')));
				});
	}).post((req,res)=>{
		//params: qid,
		let step0 = (cb)=>{
			Jyeoo.findOne({id:req.body.qid},cb);
		}
		let step1 = (rlt,cb)=>{
			if(!rlt){
				return cb('收藏失败，请稍后重试');//题库没有缺少这个题目
			}
			// console.log('req.body.userChoice',req.body.userChoice)
			let store = new Store({
				jyeoo:rlt._id,
				from:req.session.user._id,
				userChoice:req.body.userChoice
			});
			req.session.storeMark = new Date();
			store.save().catch(err=>{
				// console.log('catch',err)
				return cb('不能重复收藏同一个题目');
			});
			cb(null);
		}
		async.waterfall([step0,step1],(err,rlt)=>{
			// console.log('err',JSON.stringify(err),err.msg);
			if(err)
				res.send({no:400,msg: err||'收藏失败'});
			else{
				res.send({no:200});
			}
		});
		
	}).delete((req,res)=>{
		//params:qid,
		let step0 = (cb)=>{
			Jyeoo.findOne({id:req.body.qid},cb);
		}
		let step1 = (rlt,cb)=>{
			Store.remove({
				jyeoo:rlt._id,
				from:req.session.user._id,
			},cb);
			req.session.storeMark = new Date();
		}
		async.waterfall([step0,step1],(err,rlt)=>{
			if(err)
				res.sendStatus(400);
			else{
				res.sendStatus(200);
			}
		});
	});

module.exports = router;
