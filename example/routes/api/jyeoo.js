'use strict';
const express = require('express');
var url = require('url');
const router = express.Router();
const Jyeoo = require('../../models/Jyeoo');
router.get('/storeQ',function(req,res){
	res.render('store');
});
router.get('/wrongQ',function(req,res){
	res.render('wrong');
});


router.get('/errorQ',function(req,res){
	res.render('errorQ');
});
//暂时没有使用

//错题本渲染页面
router.get('/:id',function(req,res){
	Jyeoo.findOne({id:req.params.id},{way:0,step:0,notice:0,url:0},(err,rlt)=>{
		if(!rlt){
			console.log('jyeoo id can not found:',req.params.id);
			return res.send('have to this id');
		}
		if(rlt.type==1){
			res.render('Choice',{data:rlt});
		}else{
			res.render('Question',{data:rlt});
		}
		
	});
});
//错题本渲染页面
router.get('/solution/:id',function(req,res){
    var myParams =  url.parse(req.url, true).query;
	Jyeoo.findOne({id:req.params.id},(err,rlt)=>{
		if(!rlt||err){
			console.error('jyeoo solution id can not found:',req.params.id);
			return res.send('get data error');
		}

		var isShow = "true";
		if(myParams&&myParams.isShow){
	        isShow = myParams.isShow;
	    }
		rlt.isShow  = isShow;
		console.log(rlt)
		if(rlt.type==1){
			res.render('ChoiceSolution',{data:rlt});
		}else{
			res.render('QuestionSolution',{data:rlt});
		}

	});
});
router.get('/knowledge/:id',function(req,res){
	res.render('knowledge');
});
router.get('/knowvieo/:id',function(req,res){
	res.render('knowvieo');
});
module.exports = router;
