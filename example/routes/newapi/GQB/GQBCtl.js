const express = require('express');
const router = express.Router();
const socketManager = require('../../../websocket');
const oauth5050 = require('../../../lib/oauth5050');
const serverName = require('../../../lib/crashHandle').serverName;

var redis = require('redis');
var pub = redis.createClient({host:require('../../../config/redis').db.host});

var eventNotifi = require('../../../lib/event').eventNotifi;

//关卡包状态切换按钮
router.route('/GQB')
	.post((req,res)=>{
		// console.log('req.session',req.session)
		let data =parseInt( req.body.status);
		let redisClient = req.app.get('redisClient');
		redisClient.set(`GQB:${serverName}`,data,(error,replies)=>{
			res.send({no:200});
		});
		// console.log(pub)
		redisClient.publish(eventNotifi, JSON.stringify({'route':'isGQB',data:data}));

		// socketManager.broadcast({'route':'isGQB',data:data});
	}).get((req,res)=>{
		// console.log('serverName',serverName)
		let redisClient = req.app.get('redisClient');
		redisClient.get(`GQB:${serverName}`,(error,reply)=>{
			// console.log('reply',reply);
			res.send({no:200,status:reply});
		});
	});

//答疑模式切换
router.route('/aq_status')
	.post((req,res)=>{
		// console.log('req.session',req.session)
		let data =parseInt( req.body.status);
		let redisClient = req.app.get('redisClient');
		redisClient.set(`aq:${serverName}`,data,(error,replies)=>{
			res.send({no:200});
		});
		redisClient.publish(eventNotifi, JSON.stringify({'route':'isAQ',data:data}));
		// socketManager.broadcast({'route':'isAQ',data:data});
	}).get((req,res)=>{
		// console.log('serverName',serverName)
		let redisClient = req.app.get('redisClient');
		redisClient.get(`aq:${serverName}`,(error,reply)=>{
			// console.log('reply',reply);
			res.send({no:200,status:reply});
		});
	});

module.exports = router;
