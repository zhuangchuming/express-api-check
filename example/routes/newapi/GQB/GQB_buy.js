'use strict';
const express = require('express');
const router = express.Router();

const RequestParent = require('../../../services/request').RequestParent;
const isOauth = require('../../../lib/isOauth');

function makeAcount(req){
	let account = {ACCOUNT:req.session.user.account,
								PWD:req.session.user.passwd,
								for:'student'
	};
	let r = new RequestParent(account,req.session);
	return r;
}

//认证参数

//关卡包购买
router.get('/GQB_buy',isOauth,function(req,res){
	// res.render('store');
	let r = makeAcount(req);
	let query = req.query;
	let uri = `/GQB_buy?SID=${query.SID}&PAYWAY=${query.PAYWAY}&AGENT=${query.AGENT}&RET=${query.RET}&T=${new Date().getTime()}`;
	r.CommonGet(uri,(err,rlt)=>{
		// console.log(err,rlt)
		if(err){
			res.send(err);
		}else{
			res.send(rlt);
		}
	})

});

//关卡包状态查询
router.post('/GQB_qry',isOauth,function(req,res){
	// res.render('store');
	let r = makeAcount(req);
	let data = req.body;
	// console.log(typeof(data.RANK),data);
	r.CommonPost('/GQB_qry',data,(err,rlt)=>{
		// console.log('GQB_qry',err,rlt);
		if(err){
			res.send(err);
		}else{
			res.send(rlt);
		}
	})

});

//关卡包数据报告
router.post('/GQB_rpt',isOauth,function(req,res){
	// res.render('store');
	let r = makeAcount(req);
	let data = req.body;
	r.CommonPost('/GQB_rpt',data,(err,rlt)=>{
		if(err){
			res.send(err);
		}else{
			res.send(rlt);
		}
	})
});

//查询班级学生关卡作业完成情况
router.get('/GQB_s_query',isOauth,function(req,res){
	// res.render('store');
	let r = makeAcount(req);
	let query = req.query;
	let uri = `/GQB_s_query?CID=${query.CID}`;
	r.CommonGet(uri,(err,rlt)=>{
		if(err){
			res.send(err);
		}else{
			res.send(rlt);
		}
	})

});

//查询班级学生关卡作业完成情况
router.route('/GQB_s_rpt')
	.all(isOauth)
	.get((req,res)=>{
		let r = makeAcount(req);
		let query = req.query;
		let uri = `/GQB_s_rpt?SID=${query.SID}`;
		r.CommonGet(uri,(err,rlt)=>{
			if(err){
				res.send(err);
			}else{
				res.send(rlt);
			}
		})
	})
	.post((req,res)=>{
		let r = makeAcount(req);
		let data = req.body;
		r.CommonPost('/GQB_s_rpt',data,(err,rlt)=>{
			if(err){
				res.send(err);
			}else{
				res.send(rlt);
			}
		})
	})

//
module.exports = router;
