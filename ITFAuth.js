var fs = require('fs');

let interFaceRoot = null;//所有的用户目录
var JSON5 = require('json5');
var wrap = require('co-express');

//指定输出接口访问统计目录
let itCountpath = 'itCount.json';//默认是根目录

//是否是调试模式,调试模式下,支持
let isDebug = false;

let itGrantFunc = null;
/**
 * 初始接口认证服务
 * @param itFaceUrl 接口文档的路径
 * @param itCPath 接口访问统计文件目录
 * @param grantFunc 接口授权访问的时候,授权未通过时可以特殊处理 eg:比如自己写一个登陆,然后来给自己设置session
 *          该参数通过判断grantFunc方法返回值, true:授权通过,可以访问接口;false:授权未通过,返回错误值。
 * @param isDebug 是否是调试模式,如果是的话,则接口文档可以实时更新,不需要每次重启服务器,上线后需要把这个参数设置为false
 */
function init(itFaceUrl,itCPath,grantFunc,Debug){
    if(!itFaceUrl){
        throw Error('尚未初始化接口文档路径');
    }
    interFaceRoot = itFaceUrl;
    if(itCPath){
        itCountpath = itCPath;
        readitCount();
    }
    if(grantFunc){
        itGrantFunc = grantFunc;
    }
    if(Debug != undefined){
        isDebug = Debug;
    }
}

/*
读取文件,返回promise
 */
function readFile(path) {
    return new Promise((resolve, reject) => {
        let data = fs.readFileSync(path, 'utf-8');
        // console.log('data',data)
        resolve(data);
    })
}

//接口参数类型认证
//source:接口文档数据
//qs:请求的参数
function paramsType(data, query,req,res) {
    for (let key in data) {

        if (data[key] == undefined) {//多余的参数返回错误
            res.json({no: 497, msg: `错误的请求参数:${key}。`});
            return false;
        }
        if (data[key].rem == undefined) {//这里则认为是两层对象嵌套
            if(!paramsType(data[key],query[key],req,res)){//递归
                return false;
            }
        }else {
            //参数是否缺少
            if(!query){
                return true;
            }
            // if(!query[key]){
            //     return true;
            // }

            if (data[key].need && (query[key] == null || query[key] == undefined)) {//检验必要的请求参数,非必要参数则不验证
                res.json({no: 498, msg: `缺少${key}参数。`})
                return false;
            }
            if(query[key] != undefined || query[key] != null) {
                //参数类型
                if(data[key].type) {
                    let method = req.method;
                    if(method == 'GET'){//get参数需要去解析
                        if(data[key].type == 'number' && isNaN(parseInt(query[key]))){
                            res.json({no: 499, msg: `${key}参数类型错误。`});
                            return false;
                        }
                    }else {
                        if (data[key].type == 'object' || data[key].type == 'array') {//验证参数类型是否正确
                            if ((data[key].type == 'array' && typeof query[key] != 'object') ||
                                (data[key].type == 'object' && typeof query[key] != 'object')) {//数组
                                res.json({no: 499, msg: `${key}参数类型错误。`});
                                return false;
                            }
                        } else if (data[key].type != typeof(query[key])) {//验证参数类型是否正确
                            res.json({no: 499, msg: `${key}参数类型错误。`});
                            return false;
                        }
                    }
                }
                // if (data[key].type != typeof(query[key])) {//验证参数类型是否正确
                //     ctx.body = {no: 499, msg: `${key}参数类型错误。`};
                //     return false;
                // }

                //参数长度控制
                if(data[key].len){
                    //接口文档在定义的时候定义为一个对象
                    let ol = null;
                    let name = "长度";
                    switch (data[key].type){
                        case 'array':
                            ol =  query[key].length;
                            name = "数组长度";
                            break;
                        case 'object'://数组或者对象
                            // if(query[key].length != undefined){//数组
                            //     ol =  query[key].length;
                            // }else{//对象
                                ol =  Object.keys(query[key]).length;
                                name = "对象长度";
                            // }
                            break;
                        case 'number':
                            ol = query[key];
                            name = "值";
                            break;
                        case 'string':
                            ol = query[key].length;
                            name = "字符串长度";
                            break;

                    }
                    if (typeof(data[key].len) == 'object') {//双闭区间有时候会解析成数组结构
                        if (data[key].len.length == 2) {
                            if (data[key].len[0] != undefined && ol < data[key].len[0]) {
                                res.json({no: 496, msg: `${key}的${name}不能小于${data[key].len[0]}。`});
                                return false;
                            }
                            if (data[key].len[1] != undefined && ol > data[key].len[1]) {
                                res.json({no: 496, msg: `${key}的${name}不能大于${data[key].len[1]}。`});
                                return false;
                            }
                        } else {
                            res.json({no: 496, msg: `${key}接口文档错误。`});
                            return false;
                        }
                    }else{
                        //接口文档定义为字符串
                        let k = data[key].len.trim().split(',');
                        if (k.length > 2) {
                            res.json({no: 496, msg: `${key}指定的长度有误。`});
                            return false;
                        }

                        //null表示无穷大
                        var left = k[0].substring(1);
                        if (left.toLowerCase() == 'null') {
                            left = 'null';
                        } else {
                            left = parseFloat(left);
                        }
                        var right = k[1].substring(0, k[1].length - 1);
                        if (k[1].substring(0, k[1].length - 2).toLowerCase() == 'null') {
                            right = 'null';
                        } else {
                            right = parseFloat(right);
                        }

                        if (left != 'null') {//判断是否是左无穷

                            if (k[0].substring(0, 1) == '[') {//左边闭区间
                                if (ol < left) {
                                    res.json({no: 496, msg: `${key}的${name}不能小于${left}。`});
                                    return false;
                                }
                            } else {
                                if (ol <= left) {
                                    res.json({no: 496, msg: `${key}的${name}不能小于等于${left}。`});
                                    return false;
                                }
                            }
                        }
                        if (right != 'null') {//判断是否是右无穷
                            if (k[1].substring(k[1].length - 1, k[1].length) == ']') {//右边闭区间
                                if (ol > right) {
                                    res.json({no: 496, msg: `${key}的${name}不能大于${right}。`});
                                    return false;
                                }
                            } else {
                                if (ol >= right) {
                                    res.json({no: 496, msg: `${key}的${name}不能大于等于${right}。`});
                                    return false;
                                }
                            }
                        }
                    }
                }

                //枚举型判断参数是否在设置范围内
                if (data[key].enum) {
                    for (var i = 0; i <= data[key].enum.length; i++) {
                        if (data[key].enum[i] == query[key]) {
                            break;
                        }
                    }
                    if (i > data[key].enum.length) {//表示不能在枚举的范围内找到该值
                        res.json({no: 495, msg: `${key}参数取值范围只能在${data[key].enum}。`});
                        return false;
                    }
                }
            }
        }
    }
    return true;
}



//保存接口文档参数
var itFace = {};
var itCount = {};
async function readitCount() {
    itCount = await readFile(itCountpath).catch(err=>{
        // console.log('err',err)
        return {};
    });
    if(typeof itCount != "object") {
        itCount = JSON5.parse(itCount);
    }
    console.log('itCount',itCount)
}

//捕获系统推出信息,并做响应的保存动作
process.on('SIGINT', () => {
    // console.error('Received SIGINT.  Press Control-D to exit.');
    fs.writeFileSync(itCountpath,JSON.stringify(itCount));
    process.exit(0);
});

module.exports = {
    //带有 1、session.fromApp标志;2、请求参数中带有wsId的
    authInit:init,
    readFile:readFile,//读文件,返回promise
    itFace:itFace,
    //对请求,根据接口文档进行验证
    paramsOauth: wrap(function* (req,res, next) {
        try {
            //get请求不认证参数
            let method = req.method;
            let route = req.url;
            route = route.substring(route.lastIndexOf('/') + 1, route.length);
            var data = null;
            let routeName ;//路由名字

            //get请求要去掉请求头
            if(method == 'GET'){
                let r = route.split('?');
                route = r[0];
            }

            //解析接口文件
            if(((itFace[route] && itFace[route].method == method) || 
                (itFace[`${route}_${method}`] && itFace[`${route}_${method}`].method == method)) 
                && !isDebug){
                if(itFace[route] && itFace[route].method == method){
                    routeName = route;
                }
                if(itFace[`${route}_${method}`] && itFace[`${route}_${method}`].method == method){
                    routeName = `${route}_${method}`;
                }
                data = itFace[`${routeName}`];
            }else{
                //读取接口文档,并缓存起来
                if(fs.existsSync(`${interFaceRoot}${route}.json`)){
                    data = fs.readFileSync(`${interFaceRoot}${route}.json`, 'utf-8');
                    data = JSON5.parse(data);
                    //如果请求方法对不上,则清空现有数据
                    if(!data || data.method != method){//
                        data = null;
                    }else {
                        itFace[route] = data;
                        routeName = route;
                    }
                }
                //如果本文件不存在,则通过匹配文件名加上请求参数
                if(!data && fs.existsSync(`${interFaceRoot}${`${route}_${method}`}.json`)){
                    data = fs.readFileSync(`${interFaceRoot}${`${route}_${method}`}.json`, 'utf-8');
                    data = JSON5.parse(data);
                    itFace[`${route}_${method}`] = data;
                    routeName = `${route}_${method}`;
                }
            }


            if (data && routeName) {
                //接口访问计数
                itCount[routeName] = (itCount[routeName]?itCount[routeName]:0)+1;

                //请求方法认证
                if(req.method != data.method){
                    if (req.method != 'GET') {
                        res.json({no: 404, msg: "请求的方法错误！"});
                        return ;
                    }else{
                        next();
                        return;
                    }
                }

                //获取请求的参数
                let query;
                if (req.method == 'GET') {
                    query = req.query;
                }else {
                    query = req.body;
                }

                //认证接口授权状况
                let U = req.session;
                if (data.grant &&  !eval(data.grant)) {//授权未通过
                    if(!itGrantFunc || ! (yield itGrantFunc(req))) {//itGrantFunc 这个是个异步方法
                        if(Object.keys(U) <= 0){
                            res.json({no: 401, msg: "您尚未登录"});
                        }else {
                            res.json({no: 401, msg: "您无权访问该接口"});
                        }
                        return;
                    }
                }

                //请求参数认证
                if (data.params) {
                    if(!paramsType(data.params,query,req,res)){
                        return ;
                    }
                }else{
                    res.json({no:500,msg:"接口文件错误"});
                    return;
                }
                next();

                //可以在此对返回参数进行一个校验,标准化返回值
                // let t = ctx.body;
                // ctx.body = {no:200}
            } else {
                if (req.method === 'GET') {
                    next();
                }else{
                    res.json({no: 404, msg: "访问的模板不存在"})
                }
            }

        } catch (err) {
            // console.log(JSON5.parse(err))
            //这里统一处理 接口文档的error参数返回
            if (err.message && data && data.error && data.error[err.message]) {
                // console.log('tttt',data.error[err.message])
                res.json({no: err.message, msg: data.error[err.message]})
            } else {
                res.json({no: 500, msg: err.message+'/n'+err.stack});
            }
        }
    }),
    error:function (err, req, res, next){
        // error handling
        let method = req.method;
        let route = req.url;
        var routeName = null;
        route = route.substring(route.lastIndexOf('/') + 1, route.length);
        //get请求要去掉请求头
        if(method == 'GET'){
            let r = route.split('?');
            route = r[0];
        }
        if(itFace[route] && itFace[route].method == method){
            routeName = route;
        }
        if(itFace[`${route}_${method}`] && itFace[`${route}_${method}`].method == method){
            routeName = `${route}_${method}`;
        }
        if(routeName) {
            var data = itFace[`${routeName}`];
        }
        if (err.message && data && data.error && data.error[err.message]) {
            // console.log('tttt',data.error[err.message])
            res.json({no: parseInt(err.message), msg: data.error[err.message]})
        } else {
            res.json({no: 500, msg: err.message});//+err.stack
        }
    }
}