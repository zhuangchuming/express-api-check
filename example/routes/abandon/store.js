const express = require('express');
const router = express.Router();
const _ = require('underscore');
const EventEmitter = require('events');
const async = require('async');

const socketManager = require('../../websocket/index');
const Store = require('../../models/Store');
const Jyeoo = require('../../models/Jyeoo');
const isOauth = require('../../lib/isOauth');


//2017.8.21  app2.3.6版本之后不再使用
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
			res.send('1');
		else
			res.send('0');
	});
});
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
						return res.send([]);
					req.session.storelogMark = _.last(rlt).date;
					res.send(rlt.map((item)=>_.pick(item.jyeoo,'id','type','bref','A')));
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
			console.log('rlt',rlt)
			if(!rlt){
				return cb(new Error('hav no item'));
			}
			let store = new Store({
				jyeoo:rlt._id,
				from:req.session.user._id,
				userChoice:req.body.userChoice
			});
			req.session.storeMark = new Date();
			store.save(cb);
		}
		async.waterfall([step0,step1],(err,rlt)=>{
			console.log('err',err)
			if(err)
				res.sendStatus(400);
			else{
				socketManager.sendMsg(req.session.ws_id,{route:'storeUpdate'});
				res.sendStatus(201);
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
				socketManager.sendMsg(req.session.ws_id,{route:'storeUpdate'});
				res.sendStatus(200);
			}
		});
	});

module.exports = router;
