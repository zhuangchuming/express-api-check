const express = require('express');
const router = express.Router();
var wrap = require('co-express');

const Store = require('../../models/Store');
const Jyeoo = require('../../models/Jyeoo');
const Group = require('../../models/Group');

var Mongoose = require('mongoose');
var ObjectId = Mongoose.Types.ObjectId;

//获取收藏夹
router.post('/store_query',wrap(function *(req,res) {
    let body = req.body;
    let user = req.session.user._id;
    let group = yield Group.findOne({from:user,id:body.gId}).exec();
    if(!group){
        throw Error(4022)
    }
    // let data = yield Store.find({from:user,group:group._id},{__v:0,_id:0}).skip(body.count).limit(10).exec();
    let match ={$match:{from:new ObjectId(user),group:new ObjectId(group._id)}};
    if(body.gId == 1){
        match =  {$match:{from:new ObjectId(user),$or:[{group:new ObjectId(group._id)},{group:null}] }};

    }
    let data = yield Store.aggregate([
        match,
        {$sort:{date:-1}},
        {$skip : body.count },
        {$limit : 10 },
        {$lookup:{
            from:"Q_v2",
            localField:"jyeoo",
            foreignField:"_id",
            as:"jyeoo"
        }},
        {$project:{"jyeoo.bref":1,"jyeoo.id":1,note:1,date:1,_id:0}}
    ]).exec();
    res.json({no:200,data});
}))

module.exports = router;