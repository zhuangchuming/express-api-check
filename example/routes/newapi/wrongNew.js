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


//v2.3.4之后使用这个接口
router.route('/s_qErrLog')
	.all(isOauth)
	.post((req,res)=>{
		let account = {
			ACCOUNT:req.session.user.account,
			PWD:req.session.user.passwd,
			for:'student'
		}
		// if(req.query.start){
		// 	req.session.errorLogMark = 0;
		// }
		let r = new RequestParent(account,req.session);
		r.CommonPost('/s_qErrLog',req.body,(err,data)=>{

			if(err){
				res.send(err);
			}else{
				res.send(data);
			}
		});
	});

//新的api在使用中
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
			// console.log('getErrorLog',rlt);
			if(err){
				console.error('errorlog get error',err);
				res.sendStatus(400);
			}else{
				req.session.errorLogMark = _.min(rlt,item=>item[2])[2];
				let sort_rlt = _.sortBy(rlt,(item)=>-item[2]);
				let ids = _.map(sort_rlt,item=>item[0]);
				if(ids.length==0)
					return res.send({no:200,data:[]})
				Jyeoo.find({id:{$in:ids}},{bref:1,id:1,_id:0,A:1,type:1},(err,docs)=>{
					if(err){
						res.sendStatus(400);
					}else{
						let result = docs.map((item)=>{
							item = item.toObject();
							item['answer'] = _.find(rlt,i=>i[0]==item['id'])[1];
							return item;
						});
						let data = _.sortBy(result,(item)=>ids.indexOf(item['id']));
						res.send({no:200,data:data});
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
