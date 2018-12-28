const express = require('express');
const router = express.Router();
var wrap = require('co-express');
const fs = require('fs');
router.get('/test',wrap(function *(req,res){
	let aa= fs.statSync('test.js');
	console.log('stat',aa)
	console.log('header',req.headers)
	res.sendStatus(aa)
}))
module.exports=router;