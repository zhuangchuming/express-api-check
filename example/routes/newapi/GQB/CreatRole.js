/**
 * Created by cxj on 17-6-14.
 */
const express = require('express');
const router = express.Router();
const isOauth = require('../../../lib/isOauth');
const Role = require('../../../models/Role').Role;

router.route('/creatRole')
    .all(isOauth)
    .post((req,res)=>{
    let roleName = req.body.roleName;  //姓名
    let roleId = req.body.roleId; //角色id
    let phone = req.body.phone; //电话号码
    let sId = req.body.sId; //用户id
    if(!roleName){
        res.send({
            no:404,
            msg:'缺少参数roleName',
        });
        return ;
    }

    if(roleId == undefined || roleId == null){
        res.send({
            no:404,
            msg:'缺少参数roleId',
        });
        return ;
    }


    if(roleId > 3 || roleId<0){
        res.send({
            no:404,
            msg:'roleId>3   roleId<0',
        });
        return ;
    }


    if(!phone){
        res.send({
            no:404,
            msg:'缺少参数phone',
        });
        return ;
    }

    if(sId == undefined || sId ==null){
        res.send({
            no:404,
            msg:'缺少参数sId',
        });
        return ;
    }
    Role.update(
            {
                 sId : sId, //用户id
            },
            {$set: {
                roleName: roleName,  //姓名
                roleId : roleId, //角色id
                phone : phone, //电话号码
                sId : sId, //用户id
            }},
            {upsert: true, multi: true},
            (err,rlt)=>{
                res.send({
                    no:200,
                    msg:'创建角色成功',
                });
            });

});


module.exports = router;