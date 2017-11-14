'use strict';
const express = require('express');
const router = express.Router();

const jyeooController = require('../../controller/jyeooController');
router.get('/storeQ',function(req,res){
	res.render('store');
});
router.get('/wrongQ',function(req,res){
	res.render('wrong');
});
router.get('/errorQ',function(req,res){
	res.render('errorQ');
});
router.get('/:id',function(req,res){
	jyeooController.getQuestion(req,res);
});
router.get('/solution/:id',function(req,res){
    jyeooController.getQsolution(req,res);
});
router.get('/knowledge/:id',function(req,res){
	res.render('knowledge');
});
router.get('/knowvieo/:id',function(req,res){
	res.render('knowvieo');
});
module.exports = router;
