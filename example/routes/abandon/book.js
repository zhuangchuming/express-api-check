const express = require('express');
const router = express.Router();

const RequestParent = require('../../services/request').RequestParent;
const isOauth = require('../../lib/isOauth');


//2017.8.21之后统一使用代理请求
router.route('/book')
	.all(isOauth)
	.get((req,res,next)=>{
		let account = {ACCOUNT:req.session.user.account,
								PWD:req.session.user.passwd,
								for:'student'
		};
		let r = new RequestParent(account,req.session);
		r.getBook(req.query.COURSE,(err,rlt)=>{
			if(err)
				res.sendStatus(400);
			else{
				// console.log('rlt',rlt)
				req.session.COURSE = req.query.COURSE;
				req.session.BOOKVER = rlt.book.ver;
				res.send({
					COURSE:rlt.book.couID,
					BOOKVER:rlt.book.ver,
					RANGE:rlt.book.rng,
					FROM:rlt.book.from,
					REPORT:rlt.report
				});
			}
		});
	}).post((req,res,next)=>{
		//paramRequest:COURSE,BOOKVER,RANGE
		let account = {ACCOUNT:req.session.user.account,
								PWD:req.session.user.passwd,
								for:'student'
		};
		let r = new RequestParent(account,req.session);
		let data = req.body;
		r.setBook(data,(err,rlt)=>{
			if(err){
				res.sendStatus(400);
			}
			else{
				if(rlt.no==409){
					res.sendStatus(409);
				}else{
					req.session.COURSE = req.body.COURSE;
					req.session.BOOKVER = req.body.BOOKVER;
					res.sendStatus(200);
				}
				
			}
		});
	})
	module.exports = router;