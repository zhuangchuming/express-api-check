const express = require('express');
const router = express.Router();

const Store = require('../../models/Store');
const Group = require('../../models/Group');
const update = require('../../lib/sqlOperator').update;
var wrap = require('co-express');
const sendErr = require('../../lib/crashHandle').sendErr;
var Mongoose = require('mongoose');
var ObjectId = Mongoose.Types.ObjectId;

router.route('/group')
	.post(wrap(function* (req,res){//增加分组
		let body = req.body;
		let count = yield Group.count();
        if(count >= 10){
            throw Error(4001);
        }
        //分组名字不能重复
        let hone = yield Group.findOne({from:req.session.user._id,name:body.name}).exec();
        if(hone){
            throw Error(4003);
        }
        //新建分组id
        let g = yield Group.findOne({from:req.session.user._id}).sort({id:-1}).exec();
        let id = 0;
        if(!g){
            id = 1;
        }else{
            id = g.id+1;
        }
        let group = new Group({position:count+1,name:body.name,from:req.session.user._id,id:id,type:body.type});
        let t = yield group.save();
        if(!t || t.errors){
            throw Error(4002);
        }
        res.json({no:200});
	}))
	.delete(wrap(function* (req,res){//删除分组
		let body = req.body;
        if(body.gId == 1){//不能删除默认分组
            throw Error(4006);
        }

        //查看删除分组是否存在
        let sgroup =  yield Group.findOne({from:req.session.user._id,id:body.gId}).exec();//找到需要删除的分组
        if(!sgroup){
            throw Error(4005)
        }
        //删除
        let d = yield Group.remove({_id:sgroup._id}).exec();
        if(d && d.result.ok ){
            if(d.result.n == 1){
                //移除分组成功后,需要把原来的分组的收藏题目移动到默认分组
                let group = yield Group.findOne({from:req.session.user._id,id:1}).exec();//找到默认分组
                let uobj = yield update(Store,{from:req.session.user._id,group:sgroup._id},{$set:{group:group._id,date:new Date()}},{multi:true});
                if(!uobj || uobj.no != 200){
                    throw Error(4007)
                }
                res.json({no:200});
            }else if(d.result.n == 0){
                throw Error(4005);
            }
        }else{
            throw Error(4004);
        }
	}))
	.get(wrap(function* (req,res){
	    //获取分组
        // let count = yield Group.count({from:req.session.user._id});
        let data = yield Group.find({from:req.session.user._id},{__v:0,from:0}).sort({position:1}).exec();

        //获取分组的时候,要先判断用户有没有分组,没有的话则为用户自动创建一个默认分组,并且这个默认分组是不能删除的
        if(data.length==0){
            //为用户创建默认分组
            let group = new Group({position:1,name:"默认分组",from:req.session.user._id,id:1,type:1});
            // let t = yield group.save();

            //并把用户以前未关联的收藏分组自动添加到默认分组
            let gId = group._id;
            let dc = yield update(Store,{from:req.session.user._id},{$set:{group:gId}},{multi:true});
            if(dc.no == 200 || dc.no == 481){

                let t = yield group.save();//关联用户表成功后再保存,该分组
                if(!t || t.errors){
                    throw Error(4007);
                }
                group._doc.count = dc.n;
            }else{
                sendErr({title:"这是一条警告信息:用户关联默认收藏失败",sId:req.session.user.sId});
                throw Error(4008)
            }

            res.json({no:200,data:group});
            return ;
        }

        //如果这个学生有未归类的,先将其
        // let sc = yield Store.count({from: req.session.user._id, group: null});
        // if (sc > 0) {
        //     let dc = yield update(Store, {from: req.session.user._id}, {$set: {group: gId}}, {multi: true});
        //     if(dc.no == 200 || dc.no == 481){
        //
        //         let t = yield group.save();//关联用户表成功后再保存,该分组
        //         if(!t || t.errors){
        //             throw Error(4007);
        //         }
        //         group._doc.count = dc.n;
        //     }
        // }

        let store = yield Store.aggregate([
            {$match:{from:{$eq:new ObjectId(req.session.user._id)}}},
            {$group:{_id:'$group',count:{$sum:1}}},
            // {$lookup:{from:"groups",localField:"_id",foreignField:"_id",as:"array"}},
            // {$sort:}
        ]).exec();

        //过滤 store的聚合中出现 _id为null的情况,总数添加到 默认收藏中
        if(store) {

            for (let st in store){
                if(!store[st]._id){//null
                    data[0]._doc.count = store[st].count;
                    break;
                }
            }
        }
        // //合并所有项
        if( data && store){
            for(let d in data) {
                for(let s in store){
                    if (store[s]._id && store[s]._id.toString() == data[d]._id.toString()){
                        data[d]._doc.count = store[s].count;
                    }
                }
            }
        }
        res.json({no:200,data});
	}))
	.patch(wrap(function* (req,res){//修改分组
		let body = req.body;
        //gIds只能是整型
        for(let t in body.gIds){
            if( typeof body.gIds[t] != 'number'){
                throw Error(4005)
            }
        }
		//修改分组名字
        if(body.name){
            //分组名字不能重复
            if(body.gIds.length > 1){
                throw Error(4006)
            }
            if(body.gIds.indexOf(1) != -1){
                throw Error(4007);
            }
            let hone = yield Group.findOne({from:req.session.user._id,name:body.name}).exec();
            if(hone){
                throw Error(4004);
            }
            let dc = yield update(Group,{from:req.session.user._id,id:body.gIds[0]},{$set:{name:body.name}})
            if(dc.no == 200){
                res.json({no:200});
            }else{
                throw Error(4008);
            }
        }else if(body.gIds && body.gIds.length > 1) {
            //修改分组位置
            let position = body.gIds.indexOf(1);
            if(position != 0){
                throw Error(4009);
            }
            for(let po in body.gIds){
                console.log(typeof po)
                let dc = yield update(Group,{from:req.session.user._id,id:body.gIds[po]},{$set:{position:parseInt(po)}})
                if(dc.no != 200){
                    throw Error(4008);
                }
            }
            res.json({no:200});
        }
	}))




module.exports = router