const express = require('express');
const router = express.Router();
const RequestParent = require('../../services/request').RequestParent;
const isOauth = require('../../lib/isOauth');

//2017.8.21之后统一使用代理请求

//vip购买接口
router.route('/vip/buy')
	.all(isOauth)
	.get((req,res,next)=>{
		let data = [];
		 data[0] = parseInt(req.query.KIND);
		 data[1] = parseInt(req.query.PAYWAY);
		 data[2] = parseInt(req.query.AGENT);
		 data[3] = req.query.RET;
		 // console.warn('dat',data)
		let account = {ACCOUNT:req.session.user.account,
								PWD:req.session.user.passwd,
								for:'student'
		};
		let r = new RequestParent(account,req.session);
		r.vipBuy(data,(err,rlt)=>{
			console.log(rlt);
			res.send(rlt);
		})
	})
//vip是否购买查询接口
router.route('/vip/qry')
	.all(isOauth)
	.post((req,res,next)=>{
		let account = {ACCOUNT:req.session.user.account,
								PWD:req.session.user.passwd,
								for:'student'
		};
		let r = new RequestParent(account,req.session);
		r.vipQuerry((err,rlt)=>{
			console.log(rlt);
			res.send(rlt);
		})
	})


module.exports = router;