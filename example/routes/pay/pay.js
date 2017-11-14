var express = require('express');
var router = express.Router();
var wxpay = require('../../lib/payUtil').WxPay;
//商户ID
var mch_id = require('../../lib/payUtil').mch_id;
let notify_url = require('../../config/config').notify_url;//支付回调地址
var timeString = require('../../lib/common').timeString;

var wrap = require('co-express');
const fs = require('fs');
var json5 = require('json5');

const Request = require('../../services/netUtil').StudentRequest;
const sendErr = require('../../lib/crashHandle').sendErr;
const update = require('../../lib/sqlOperator').update;

const Pay = require('../../models/Pay');
const Product = require('../../models/Product');
let productData ;//价格表

router.route('/pay')
    .post(wrap(function *(req,res){
        let body = req.body;
        // console.log('body',body);
        //是否已经支付
        let pd = yield Pay.findOne({from:req.session.user._id,type:body.type,pay_time:{$gt:0},outDate:{$gt:Date.now()}}).exec();
        if(pd){
            throw Error(4032);
        }
        //读文件
        // productData = readfcgFile();
        let productData = yield Product.findOne({id:body.type,schIds:req.session.user.schId}).exec();
        //该学校是否有这个功能
        if(!productData){
            throw Error(4033);
        }
        let obj = yield requestOrderNo(req,11);
        let VCODE = Math.random().toString(36).substr(2, 15);//随机数,来判断是否是我这边发起的
        if (obj.err) {
            res.send(obj.err);
        } else {
            // res.send(obj.data);
            //创建订单号成功后,保存订单
            //计算价格
            let price ;
            if(body.tType == 1){
                price = productData.dishprice;
            }else{
                price = productData.disprice;
            }
            //判断是否是折扣的学校
            if(productData.disschId.indexOf(req.session.user.schId) != -1){
                //使用折扣
                price = productData.discount * price;
            }
            let pay = new Pay({from:req.session.user._id,out_trade_no:obj.data.outTradeNo,
                type:body.type,price:price,attach:{tType:body.tType,VCODE:VCODE},trade_type:body.PAYWAY});
            let rlt = yield pay.save();
            if(!rlt){
                throw Error(4031)
            }
            let payParams = {
                TRADENO: obj.data.outTradeNo,
                PAYWAY: body.PAYWAY,
                AGENT: 2,
                PRICE: price,//价钱,分
                RET: 'PARM',
                VCODE: VCODE,
                CURL: notify_url,//支付回调地址
                SID: req.session.user.sId
            };
            requestPay(req, res, payParams);
        }
    }))
    .get(wrap(function *(req,res){//获取支付商品内容或者列表
        let body = req.query;
        // let data = productData;
        //读文件
        // readfcgFile();
        let data = 1;
        if(body.type){
            data = yield Product.findOne({id:body.type,$or:[{schIds:req.session.user.schId},{schIds:-1}]},{_id:0,__v:0}).exec();
        }else{
            data = yield Product.find({$or:[{schIds:req.session.user.schId},{schIds:-1}]},{__v:0,_id:0}).exec();
        }
        //获取指定的商品内容
        // if(body.type){
        //     for(let item in productData){
        //         if(productData[item].id == parseInt(body.type)){
        //             data = productData[item];
        //             break;
        //         }
        //     }
        // }
        res.json({no:200,data:data});
    }));

//支付成功后的回调
router.post('/notify_url',wrap(function *(req,res) {
    let body = req.body;
    // outTradeNo、price、vcode(调用此接口的VCODE
    let order = yield Pay.findOne({out_trade_no:body.outTradeNo,"attach.VCODE":body.vcode}).exec();
    if(!order){
        let data = `支付回调错误,错误的返回参数为:${JSON.stringify(body)}`;
        sendErr({user:"app支付回调错误",errorMsg:data});
        throw Error(data);
    }
    dealNotify(order,body);
    res.json({no:200});
}));
//支付回调类型判断
let dealNotify = wrap(function *(order,body) {
    //全功能收费
    if(order.type == 11){
        let outDate ;
        let t = new Date();
        if(order.attach && order.attach.tType == 1){//半年
            outDate = t.setMonth(t.getMonth()+6);
        }else{
            outDate = t.setYear(t.getFullYear()+1);
        }
        let data = yield update(Pay,{out_trade_no:body.outTradeNo},{$set:{pay_time:Date.now(),outDate:outDate}});
        if(data.no != 200){
            let data = `支付回调错误,错误的返回参数为:${JSON.stringify(body)}`;
            sendErr({user:"app支付回调错误",errorMsg:data});
            throw Error(data);
            // res.json({no:500,msg:data});
        }
    }
})



//查询是否支付
router.post('/pay_query',wrap(function *(req,res) {
    let body = req.body;
    // outTradeNo、price、vcode(调用此接口的VCODE
    let pay = yield Pay.findOne({from:req.session.user._id,type:body.type}).exec();
    if(pay && pay.pay_time > 0){
        res.json({no:200,isPay:true,data:pay});
    }else{
        res.json({no:200,isPay:false});
    }
}));

//获取请求订单号
let requestOrderNo = wrap(function *(req,btype) {
    let account = {
        ACCOUNT: req.session.user.account,
        PWD: req.session.user.passwd,
        for: 'student'
    };
    let r = new Request(account, req.session);
    return yield r.CommonPost('/getTradeNo', {BTYPE:btype});
})

//请求生成支付参数
let requestPay = wrap(function *(req,res,params){
    let account = {
        ACCOUNT: req.session.user.account,
        PWD: req.session.user.passwd,
        for: 'student'
    };
    let r = new Request(account, req.session);
    let obj = yield r.CommonPost('/pay', params)
    if (obj.err) {
        res.json(obj.err);
    } else {
        res.json(obj.data);
    }
})

// function readfcgFile() {
//     //读文件
//     if(!productData){
//         productData = fs.readFileSync(`./models/file/pricelist.json`, 'utf-8');
//         if(typeof productData != 'object'){
//             productData = json5.parse(productData);
//         }
//     }else{
//         if(typeof productData != 'object'){
//             productData = json5.parse(productData);
//         }
//     }
//     return productData;
// }


exports.router = router;
// exports.readfcgFile = readfcgFile;
