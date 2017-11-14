
var express = require('express');
var router = express.Router();
var wrap = require('co-express');
const Student = require('../../models/User').Student;

//临时获取用户信息的接口
router.post('/prtdecla',wrap(function *(req,res){
    let sIds = req.body.sIds;
    sIds.map((i)=>{
        // console.log(typeof i);
        if(i.constructor != Number){
            throw Error(4001);
        }
    })
    let data = yield Student.find({sId:{$in:sIds}},{portrait:1,declaration:1,sex:1,sId:1,_id:0}).exec();
    let results = data.map((i)=>{
        let item = i.toObject();
        if(!item.portrait)
            item.portrait = 'default0';
        if(!item.declaration)
            item.declaration = '';
        if(item.sex == undefined)
            item.sex = 1;//默认是男
        return item;
    });
    res.send({no:200,data:results});
}));
module.exports = router;