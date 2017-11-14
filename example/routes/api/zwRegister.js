/**
 * Created by cxj on 17-3-27.
 */
const express = require('express');
const router = express.Router();

const RegisterRequest = require('../../services/request').RegisterRequest;

router.route('/cxj').get((req,res)=>{
        console.log("1111");
        res.send("4111")
    });


router.route('/zwFastRegister')
    .post((req,res)=>{
    let DEV_ID = req.body;
    let r = new RegisterRequest();
    r.zwFastRegister(DEV_ID,function (err,rlt) {
        if(err){
            if(typeof err == 'number'){
                res.sendStatus(err);
            }
            else{
                res.status(400).send(err);
            }
        }else{
            if(rlt.no == 200){
                res.send(rlt);
            }else{
                res.sendStatus(400);
            }
        }
    });
});

module.exports = router;