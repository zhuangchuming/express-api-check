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
function parseRlt(rlt){
	let {qID,Q,kID} = rlt;
	Q = JSON.parse(Q);
	return ({
					qID,
					type:Q.type,
					answer:Q.A[0]['A']?Q.A[0]['A']:0,
					kID,
					HJB:Q.HJB,
				});
}

//当前接口已经弃用
//获取作业
router.get('/taskHomework',isOauth,(req,res,next)=>{
	let r = makeAcount(req);
	let data = {
		COURSE:req.session.COURSE,
		TASK:1,
		BOOK:0,
		CID:req.session.user.sId,
	};
	r.cc_get(data,(err,rlt)=>{
		if(err){
			console.error(`get route:${req.originalUrl},请求参数：${data}，错误内容${err}`);
			if(typeof err == 'number'){
				res.sendStatus(err);
			}
			else{
				res.status(400).send(err);
			}
		}else{
			let ids = JSON.parse(rlt.task);
			ids = !!ids?ids.map(item=>item[0]):[];
			Jyeoo.find({id:{$in:ids}},{id:1,A:1,bref:1,_id:0,type:1},(err,docs)=>{
				if(err){
					res.sendStatus(400);
				}else{
					let data = _.sortBy(docs,item=>item.type==9);
					res.send(data);
				}
			});
		}
	});
});

//2017.8.21 错误回顾功能已经取消
//获取错题简介
router.get('/taskerror',isOauth,(req,res,next)=>{
	let ids = _.map(req.session.taskError,(item)=>item.id);
	Jyeoo.find({id:{$in:ids}},{id:1,A:1,bref:1},(err,rlt)=>{
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

//2017.8.21之后统一使用代理请求
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

//2017.8.21之后统一使用代理请求
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
				// res.sendStatus(400);
			}else{
				
				if(!!rlt.Q){
					req.session.taskError = rlt.Q;
				};
				res.send(rlt);
				// Jyeoo.find({id:{$in:rlt.ccg.Q}},{bref:1,id:1,_id:0,type:1,A:1},(err,docs)=>{
				// 	if(err){

				// 		res.sendStatus(400);
				// 	}else{
				// 		rlt.Homework = docs;
				// 		// console.log(rlt);
				// 		res.send(rlt);
				// 	}
				// });
			}	
		});
	})
	.post((req,res,next)=>{
		//paramRequest: opt value
		// console.log(req.body);
		let r = makeAcount(req);
		switch(req.body.opt){

			//这中情况使用再 错题回顾,已经不再使用
			case 'doneQ':
			if(req.body.value==0){
				req.session.taskError = [];
			}else{
				req.session.taskError = _.reject(req.session.taskError,item=>item==req.body.value);
			}
			// console.log(req.body);
			// console.log(req.session.taskError);
			r.s_taskDoneQ(req.session.COURSE,req.body.value,(err,rlt)=>{
				if(err){
					console.error(`post route:${req.originalUrl},请求参数：${req.session.COURSE},${req.body.value}，错误内容${err}`);
					if(typeof err == 'number'){
						res.sendStatus(err);
					}
					else{
						res.status(400).send(err);
					}
				}else{
					res.sendStatus(200);
				}
			});
			break;
			case 'doneK':
			r.s_taskDoneK(req.session.COURSE,req.body.value,(err,rlt)=>{
				if(err){
					console.error(`post route:${req.originalUrl},请求参数：${req.session.COURSE},${req.body.value}，错误内容${err}`);
					if(typeof err == 'number'){
						res.sendStatus(err);
					}
					else{
						res.status(400).send(err);
					}
				}else{
					res.sendStatus(200);
				}
			});
			break;
		}
	});

//2017.8.21之后统一使用代理请求
router.route('/commit')
	.all(isOauth)
	.get((req,res,next)=>{
		//paramNoRequest:minPg,maxPg
		let r =makeAcount(req);
		let data = {
			COURSE:req.session.COURSE,
			BOOKVER:req.session.BOOKVER,
			MINPG:req.query.minPg?parseInt(req.query.minPg):0,
			MAXPG:req.query.maxPg?parseInt(req.query.maxPg):0,
			HJB:req.query.HJB?parseInt(req.query.HJB):0,
		};
		r.s_qPick(data,(err,rlt)=>{
			if(err){
				console.error(`get route:${req.originalUrl},请求参数：${data},错误内容${err}`);
				if(typeof err == 'number'){
					res.sendStatus(err);
				}
				else{
					res.send(err);
				}
			}else{
				// console.log('arlt commit',rlt);
				if(!!rlt.qID){
					res.send(parseRlt(rlt));
				}else if(!!data.HJB){
					data.MINPG = 0;
					data.MAXPG = 0;
					r.s_qPick(data,(err,rlt)=>{
						if(err||!rlt.qID){
							if(err){
								console.error(`get route:${req.originalUrl},请求参数：${data},错误内容${err}`);
								if(typeof err == 'number'){
									res.sendStatus(err);
								}
								else{
									res.status(400).send(err);
								}
							}else{
								res.sendStatus(400);
							}
						}else{
							res.send(parseRlt(rlt));
						}
					});
				}else{
					res.send({isNull:true,errorNO:rlt.no});
				}
			}
		})
	})
	.post((req,res,next)=>{
		//paramRequest:Q,
		//paramNoRequest:next,minPg,maxPg
		// console.log(req.body.next);
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
		Jyeoo.findOne({id:req.body.Q[0]},{bref:1},(error,doc)=>{
			if(error||!doc){
				return res.sendStatus(400);
			}
			// console.log(doc.bref.slice(0,40));
			let data = {
				COURSE:req.session.COURSE,
				BOOKVER:req.session.BOOKVER,
				Q:JSON.stringify(req.body.Q),
				QTXT:doc.bref.slice(0,20),
				HJB:req.body.HJB?parseInt(req.body.HJB):0,
				NEXTQ,MINPG,MAXPG
			};
			r.s_qCommit(data,(err,rlt)=>{
				if(err){
					// console.error(`post route:${req.originalUrl},请求参数：${data},错误内容${err}`);
					if(typeof err == 'number'){
						res.sendStatus(err);
					}
					else{
						res.status(400).send(err);
					}
				}else{
					if(NEXTQ==0){
						res.send({});
					}else{
						if(!!rlt.qID){
							res.send(parseRlt(rlt));
						}else if(!!data.HJB){
							data.MINPG = 0;
							data.MAXPG = 0;
							delete data.Q;
							delete data.QTXT;
							r.s_qCommit(data,(err,rlt)=>{
								if(err||!rlt.qID){
									if(err){
										console.error(`post route:${req.originalUrl},请求参数：${data},错误内容${err}`);
										if(typeof err == 'number'){
											res.sendStatus(err);
										}
										else{
											res.status(400).send(err);
										}
									}else{
										res.sendStatus(400);
									}
								}else{
									res.send(parseRlt(rlt));
								}
							});
						}else{							
							res.send({isNull:true,errorNO:rlt.no});
						}
					}
					
				}
			});
		});	
	});


module.exports = router;
