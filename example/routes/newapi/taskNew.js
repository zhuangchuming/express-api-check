const express = require('express');
const router = express.Router();
const _ = require('underscore');
const multer = require('multer');

const Jyeoo = require('../../models/Jyeoo');
const RequestParent = require('../../services/request').RequestParent;
const isOauth = require('../../lib/isOauth');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads')
  },
  filename: function (req, file, cb) {
    cb(null,Date.now()+'-'+file.originalname );
  }
});
const upload = multer({ storage: storage });

function makeAcount(req){
	let account = {ACCOUNT:req.session.user.account,
								PWD:req.session.user.passwd,
								for:'student'
	};
	let r = new RequestParent(account,req.session);
	return r;
}

//获取作业简要
router.post('/taskHomework',isOauth,(req,res,next)=>{
	let ids = req.body.qIds;
	Jyeoo.find({id:{$in:ids}},{_id:0,id:1,bref:1,type:1,A:1},(err,rlt)=>{
		// console.log(rlt);
		if(err){
			res.send({no:500,msg:"服务器错误"});
		}else{
			res.send({no:200,data:rlt});
		}
	});
});
//获取错题简介
router.get('/taskerror',isOauth,(req,res,next)=>{
	let ids = _.map(req.session.taskError,(item)=>item.id);
	Jyeoo.find({id:{$in:ids}},{_id:0,id:1,A:1,bref:1},(err,rlt)=>{
		if(err){
			res.sendStatus(400);
		}else{
			// console.log(rlt);
			let d = rlt.map(item=>{
				let i = _.find(req.session.taskError,item0=>item0.id==item.id);
				let o = item.toObject();
				if(!!i){
					o.a = i.a;
				}
				return o;
			});
			// console.log(d);
			res.send(d);
		}
	});
});
//生成单次报告数据
router.post('/testJudge',isOauth,(req,res,next)=>{
	let r = makeAcount(req);
	let data ={
		COURSE:parseInt(req.session.COURSE),
		BOOKVER:parseInt(req.session.BOOKVER),
		KIDS:req.body.kids
	};
	// console.log('data',data);
	r.s_K4testJudge(data,(err,rlt)=>{
		if(err){
			console.error(`get route:${req.originalUrl},请求参数：${JSON.stringify(data)},错误内容${err}`);
			if(typeof err == 'number'){
				res.sendStatus(err);
			}
			else{
				res.status(400).send(err);
			}
		}else{
			res.send(rlt);
		}
	});
});

//返回包含作业的等等的任务接口
router.route('/task')
	.all(isOauth)
	.get((req,res,next)=>{
		let r = makeAcount(req);
		r.getTask(req.session.COURSE,req.session.BOOKVER,(err,rlt)=>{
			if(err){
				console.error(`get route:${req.originalUrl},请求参数：${req.session.COURSE},${req.session.BOOKVER}，错误内容${err}`);
				if(typeof err == 'number'){
					res.sendStatus(err);
				}
				else{
					res.status(400).send(err);
				}
				console.log('pickCommit error:',err);
			}else{
				// console.log(rlt)
				if(!!rlt.Q){
					req.session.taskError = rlt.Q;
				};
				res.send(rlt);
			}	
		});
	})

//学生完成知识点呈现
router.post('/s_taskDoneK',isOauth,(req,res)=>{
	let r = makeAcount(req);
	r.s_taskDoneK(req.session.COURSE,req.body.KID,(err,rlt)=>{
		if(err){
			res.send(err)
		}else{
			res.send(rlt)
		}
	})
})


router.route('/commit')
	.all(isOauth)
	.get((req,res,next)=>{
		//paramNoRequest:minPg,maxPg
		let r =makeAcount(req);
		let data = {
			COURSE:req.session.COURSE,//
			BOOKVER:req.session.BOOKVER,
			MINPG:req.query.minPg?parseInt(req.query.minPg):0,
			MAXPG:req.query.maxPg?parseInt(req.query.maxPg):0,
			GQB:req.query.GQB?parseInt(req.query.GQB):0,
		};
		// if(!!data.GQB){//如果传了GQB参数过来的话就把范围去掉
		// 	data.MINPG = 0;
		// 	data.MAXPG = 0;
		// }
		r.s_qPick(data,(err,rlt)=>{//智选一题
			// console.log('data',rlt);
			if(!err){
				res.send(rlt);//不再修改陈老师数据,直接返回,修改部分直接放回前端 
			}else{
				res.send(err);
			}
		})
	})
	.post((req,res,next)=>{
		//paramRequest:Q,
		//paramNoRequest:next,minPg,maxPg
		// console.error('commit body',req.body);
		let r = makeAcount(req);
		let NEXTQ; //= req.body.next?req.body.next:-1;
		if(req.body.next==0){
			NEXTQ = 0;
		}else if(req.body.next==undefined){
			NEXTQ = -1;
		}else{
			NEXTQ = req.body.next;
		}

		let MINPG = req.body.minPg?req.body.minPg:0;
		let MAXPG = req.body.maxPg?req.body.maxPg:0;
		let QTXT = req.body.QTXT;//题干简要

		let data = {
			COURSE:req.session.COURSE,
			BOOKVER:req.session.BOOKVER,
			Q:JSON.stringify(req.body.Q),
			QTXT:QTXT,
			GQB:req.body.GQB?parseInt(req.body.GQB):0,
			NEXTQ:NEXTQ,
			MINPG:MINPG,
			MAXPG:MAXPG
		};
		// if(!!data.GQB){
		// 	data.MINPG = 0;
		// 	data.MAXPG = 0;
		// 	delete data.Q;
		// 	delete data.QTXT;
		// }
		r.s_qCommit(data,(err,rlt)=>{
			// console.log('commit return',rlt,err);
			if(!err){
				res.send(rlt);
			}else{
				res.send(err);
			}
		});
	});

//任然有在使用
//根据题目id获取id列表
router.get('/getQById',isOauth,(req,res)=>{

	if(!req.query.qId ){
		res.send({no:400,msg:"qId参数错误"});
		return ;
	}
	let r = makeAcount(req);
	let qid = parseInt(req.query.qId);
	// console.log('cal',qid)
	r.getQById(qid,(err,json)=>{
		// console.log('getQById',json,err);
		if(!err){
			let obj = {no:200,qID:qid,Q:json};
			// console.log('cal',obj)
			res.send(obj);
		}else{
			res.send({no:404,msg:"题目不存在"});
		}
	});
});

module.exports = router;
