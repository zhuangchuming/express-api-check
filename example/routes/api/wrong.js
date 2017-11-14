const express = require('express');
const router = express.Router();
const _ = require('underscore');
const EventEmitter = require('events');
const async = require('async');

const socketManager = require('../../websocket');
const Store = require('../../models/Store');
const Jyeoo = require('../../models/Jyeoo');
const RequestParent = require('../../services/request').RequestParent;
const isOauth = require('../../lib/isOauth');


//params: qid
// router.get('/isStore',isOauth,(req,res)=>{
// 	let step0 = (cb)=>{
// 		Jyeoo.findOne({id:req.query.qid},cb);
// 	}
// 	let step1 = (rlt,cb)=>{
// 		Store.findOne({jyeoo:rlt._id,
// 			from:req.session.user._id
// 		},cb)
// 	}
// 	async.waterfall([step0,step1],(err,rlt)=>{
// 		if(!!rlt)
// 			res.send('1');
// 		else
// 			res.send('0');
// 	});
// });
router.route('/errorlog')
	.all(isOauth)
	.get((req,res)=>{
		let account = {
			ACCOUNT:req.session.user.account,
			PWD:req.session.user.passwd,
			for:'student'
		}
		if(req.query.start){
			req.session.errorLogMark = 0;
		}
		let r = new RequestParent(account,req.session);
		r.getErrorLog({
			COURSE:req.session.COURSE,
			BOOKVER:req.session.BOOKVER,
			MAXTLOG:req.session.errorLogMark,
		},(err,rlt)=>{
			if(err){
				console.error('errorlog get error',err);
				res.sendStatus(400);
			}else{
				req.session.errorLogMark = _.min(rlt,item=>item[2])[2];
				let sort_rlt = _.sortBy(rlt,(item)=>-item[2]);
				let ids = _.map(sort_rlt,item=>item[0]);
				if(ids.length==0)
					return res.send([])
				Jyeoo.find({id:{$in:ids}},{bref:1,id:1,_id:0,A:1,type:1},(err,docs)=>{
					if(err){
						res.sendStatus(400);
					}else{
						let result = docs.map((item)=>{
							item = item.toObject();
							item['answer'] = _.find(rlt,i=>i[0]==item['id'])[1];
							return item;
						});
						res.send(_.sortBy(result,(item)=>ids.indexOf(item['id'])));
					}
				});
			}
		});
	});
router.route('/wrong')
	.all(isOauth)
	.get((req,res)=>{
		let account = {
			ACCOUNT:req.session.user.account,
			PWD:req.session.user.passwd,
			for:'student'
		}
		if(req.query.start){
			req.session.wrongMark = 0;
		}
		let r = new RequestParent(account,req.session);
		r.getErrorLog({
			COURSE:req.session.COURSE,
			BOOKVER:req.session.BOOKVER,
			MAXTLOG:req.session.wrongMark,
		},(err,rlt)=>{
			if(err){
				console.log('errorlog get error',err);
				res.sendStatus(400);
			}else{			
				let ids = _.map(rlt,item=>item[0]);
				if(ids.length==0)
					return res.send({state:'finish'})
				req.session.wrongMark = _.min(rlt,item=>item[2])[2];
				Jyeoo.find({id:{$in:ids}},{id:1,type:1,Q:1,opts:1},(err,rlt)=>{
					if(err){
						res.sendStatus(400);
					}else{
						res.send(rlt);
					}
				});
			}
		});
});

module.exports = router;
