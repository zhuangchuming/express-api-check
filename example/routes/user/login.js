const express = require('express');
const router = express.Router();
let User = require('../../model/User');
var wrap = require('co-express');

router.post('/login',wrap(function *(req,res){
    let body = req.body;
    let query = {pwd:body.pwd};
    switch(body.type){
        case 1:
        query.account = body.account;
        break;
        case 2:
        query.mail = body.account;
        break;
        case 3:
        query.phone = body.account;
        break;
    }
    let person = yield User.findOne(query,{__v:0,_id:0}).exec();
    if(!person){
        throw Error(400);
    }
    let data = Object.assign({no:200},person._doc);
    req.session.user = person._doc;
    res.send(data);
}))



module.exports = router