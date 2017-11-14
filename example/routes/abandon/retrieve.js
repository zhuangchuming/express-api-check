const express = require('express');
const router = express.Router();

const RequestParent = require('../../services/request').RequestParent;
const isOauth = require('../../lib/isOauth');

//2017.8.21之后统一使用代理请求
router.get('/retrieve',isOauth,(req,res)=>{
	let account= {ACCOUNT:req.session.user.account,
								PWD:req.session.user.passwd,
								for:'student'};
	let r = new RequestParent(account,req.session);
	r.getRetrieve((err,rlt)=>{
		if(err)
			res.sendStatus(400);
		else{
			res.send(rlt);
		}
	});
});

module.exports = router;
