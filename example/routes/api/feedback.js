const express = require('express');
const router = express.Router();

const Feedback = require('../../models/Feedback');
const isOauth = require('../../lib/isOauth');
const Applog = require('../../models/Applog');
// const mq = require('../../lib/mq');

router.route('/feedback')
	.all(isOauth)
	.get((req,res,next)=>{
		res.send('ok');
	})
	.post((req,res)=>{
		let feedback = new Feedback({
			from:req.session.user._id,
			content:req.body.content,
		});
		feedback.save((err,rlt)=>{
			if(!err){
				res.sendStatus(201);
			}else{
				res.sendStatus(400);
			}
		});
	})
router.get('/forgetpass',(req,res)=>{
	// mq.send('AppLog',{info:'登录页-忘记密码'});
	let applog = new Applog({
		sid: '',
		wsId: '',
		info: '1a',
	});
	applog.save();
	res.sendStatus(200);
})

module.exports = router;