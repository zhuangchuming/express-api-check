const express = require('express');
const router = express.Router();
var wrap = require('co-express');
const fs = require('fs');
const path = require('path');
const Store = require('../../models/Store');
const Jyeoo = require('../../models/Jyeoo');
const Group = require('../../models/Group');
const update = require('../../lib/sqlOperator').update;
const imagepath = path.join(__dirname,'../..');
router.route('/store')
    .post(wrap(function *(req,res) {
        //添加收藏
        let body = req.body;
        //判断分组是否存在
        let g = yield Group.findOne({from:req.session.user._id,id:body.gId}).exec();
        if(!g){
            throw Error(4011)
        }
        //判断题目是否存在
        let jye = yield Jyeoo.findOne({id:body.qId}).exec();
        if(!jye){
            throw Error(4010)
        }
        //判断该题是否已经收藏
        let stojye = yield Store.findOne({from:req.session.user._id,jyeoo:jye._id});//group:body.gId
        if(stojye){
            throw Error(4013)
        }
        //判断当前分组是否超过100个
        let storeCount = yield Store.count({from:req.session.user._id,group:g._id});
        if(storeCount>=100){
            throw Error(4009);
        }
        //收藏
        let store = new Store({from:req.session.user._id,group:g._id,jyeoo:jye._id});
        let t = yield store.save();
        if(!t || t.errors){
            throw Error(4012);
        }else{
            res.json({no:200})
        }
    }))
    .get(wrap(function *(req,res) {
        //是否已经收藏
        let body = req.query;
        if(isNaN(parseInt(body.qId))){
            throw Error(4021);
        }
        let jye = yield Jyeoo.findOne({id:parseInt(body.qId)}).exec();
        if(!jye){
            throw Error(4020)
        }
        let data = yield Store.findOne({from:req.session.user._id,jyeoo:jye._id}).exec();
        if(data){
            res.json({no:200,isStore:true});
        }else{
            res.json({no:200,isStore:false});
        }
    }))
    .delete(wrap(function *(req,res) {
        //取消收藏
        let body = req.body;
        for(let item in body.qIds){
            if(typeof body.qIds[item] != 'number'){
                throw Error(4014);
            }
        }
        //找到分组
        let group = yield Group.findOne({id:body.gId}).exec();
        if(!group){
            throw Error(4018);
        }
        //找到那些题目
        let jyeoos = yield Jyeoo.find({id:{$in:body.qIds}},{_id:-1}).exec();
        if(!jyeoos || jyeoos.length != body.qIds.length){
            throw Error(4016);
        }
        //删除的是否都在收藏夹中
        let delCount = yield Store.find({from:req.session.user._id,jyeoo:{$in:jyeoos}}).exec();
        if(!delCount || delCount.length != body.qIds.length){
            throw Error(4017);
        }
        //移除题目
        let rc = yield Store.remove({from:req.session.user._id,jyeoo:{$in:jyeoos}})//
        if(rc && rc.result && rc.result.ok  == 1) {
            if (rc.result.n == jyeoos.length) {
                res.json({no: 200});
            } else {
                //找出删除失败的项目,告诉客户端
                // throw Error(4015);
                let data = yield Store.find({from:req.session.user._id,jyeoo:{$in:jyeoos}},{jyeoo:-1}).exec();
                let arr = []
                for(let ti in data){
                    arr.push(data[ti].jyeoo);
                }
                data = yield Jyeoo.find({_id:{$in:arr}},{id:-1}).exec();
                res.json({no:4019,data});
            }
        }else{
            throw Error(4015);
        }
    }))
    .patch(wrap(function *(req,res) {
        //单个或者批量修改某个部位
        let body = req.body;
        let qIds = body.qIds
        for(let item in qIds){
            if(typeof qIds[item] != 'number'){
                throw Error(4014);
            }
        }

        let jyes = yield Jyeoo.find({id:{$in:qIds}},{_id:-1,id:-1,A:-1}).exec();
        if(jyes.length != qIds.length){
            throw Error(4020);
        }
        //原分组
        let group;
        if(body.gId != undefined){
            group = yield Group.findOne({id:body.gId},{_id:-1}).exec();
            if(!group){
                throw Error(4022)
            }
        }

        let updateObj = {};//更新的对象

        //需要切换分组
        if(body.tgId != undefined){
            let group = yield Group.findOne({_id:body.tgId},{_id:-1}).exec();
            if(!group){
                throw Error(4021)
            }
            updateObj.group = group._id;
            updateObj.date = new Date();//移动分组,更新时间
            // noteObj.group = group._id;
        }

        //更新内容
        if(body.content){
            updateObj["note.content"]=body.content;
        }
        //图片需要同时删除图片
        if(body.imgs){
            updateObj["note.imgs"]=body.imgs;
            //删除成功后,需要删除图片
        }
        //标记id
        if(body.tagId){
            updateObj["note.tagId"]=body.tagId;
        }
        //错题归因列表
        if(body.aeIds){
            updateObj["note.aeIds"]=body.aeIds;
        }
        //知识盲点
        if(body.bK){
            //检查知识点
            if(jyes[0].A[0]){
                let A = jyes[0].A[0];
                if(!A.kpt){
                    throw Error(4024);
                }
                for(let item in body.bK){
                    if(A.kpt.indexOf(body.bK[item]) == -1){
                        throw Error(4024);
                    }
                }
            }else{
                throw Error(4024);
            }
            updateObj["note.bK"]=body.bK;
        }

        //发送失败的内容
        let updatefail =[];

        let jyeoo ;
        if( body.imgs ) {//更新题目前,先找到该题目
            jyeoo = yield Store.findOne({from: req.session.user._id, jyeoo: jyes[0]._id}).exec();
        }
        for(let item in jyes) {
            let dc = yield update(Store, {from: req.session.user._id, jyeoo: jyes[item]._id}, {$set: updateObj});//原本未分组的在默认收藏group:group._id
            if (dc.no != 200) {
                updatefail.push(jyes[item]);
            }
        }

        if(updatefail.length > 0){
            res.json({no:4023,msg:"部分题目更新失败",updatefail});
        }else{
            res.json({no:200});
            //删除本地文件
            if(body.imgs && jyeoo){
                let imgs = jyeoo._doc.note.imgs;
                console.log('imgs',imgs.length)
                for(let i =0 ; i< imgs.length ; i++){
                    if( body.imgs.indexOf(imgs[i]) == -1 && fs.existsSync(imagepath+imgs[i])){
                        //找不到文件,删除
                        fs.unlink(imagepath+imgs[i],(err) => {
                            if (err) {
                                console.error(`删除失败: 用户id为:${req.session.user.sId},删除的文件路径为:${imagepath}${imgs[i]}`);
                            };
                            // console.log('成功删除 /tmp/hello');
                        });
                    }
                }
            }
        }

        //可能出现批量修改 tagId,tgId移动分组

    }))
module.exports = router