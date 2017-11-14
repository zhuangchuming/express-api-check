const express = require('express');
const router = express.Router();
const socketManager = require('../../websocket');
var eventNameStr = require('../../lib/event').eventNameStr;

// sub.on("message", (channel, message)=> {
//     if(channel){
//         if(channel == eventNameStr){
//             let data= JSON.parse(message);
//             if(data.wsId&&data.sid){
//                 socketManager.updateWs(data.wsId,data.sid);
//             }
//         }
//         if(channel == eventNotifi){//接收到发布消息
//             let data= JSON.parse(message);
//             socketManager.broadcast(data);
//         }
//     }
// });

// sub.subscribe(eventNameStr);//命令有限制
// sub.subscribe(eventNotifi);

router.get('/websocket',(req,res)=>{
	if(!req.query.shake){
		return res.sendStatus(400);
    }
  // console.log('dafdadas',req.app.get('redisClient'))
    let redisClient = req.app.get('redisClient');
    redisClient.publish(eventNameStr, JSON.stringify({  //参数不能传对象
        wsId:req.query.shake,
        sid:req.session.user.sId,
    }));

  // 	socketManager.updateWs(req.query.shake,req.session.user.sId,req.app.get('redisClient'));
	req.session.ws_id = req.query.shake;
	res.send('ok');
});

module.exports =router;
