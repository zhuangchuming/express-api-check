const express = require('express');
const router = express.Router();

router.route('/test')
	.get((req,res)=>{
	// console.log('aaaa')
        res.send({no:200})
    })
    .post((req,res)=>{
	// console.log('aaaa')
        res.send({no:4001,msg:"您已提交，不可重复提交"})
    }).patch((req,res)=>{
        res.send({no:200,patch:true})
    })



module.exports = router