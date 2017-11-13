'use strict'

/**
 * Module dependencies.
 * @private
 */
/**
 * 本文主要参考来自:https://github.com/expressjs/connect-multiparty
 */

var multiparty = require('multiparty');
var onFinished = require('on-finished');
var qs = require('qs');
var typeis = require('type-is');


/**
 * Module exports.
 * @public
 */

module.exports = multipart;


/**
 * Parse multipart/form-data request bodies, providing the parsed
 * object as `req.body` and `req.files`.
 *
 * The options passed are merged with [multiparty](https://github.com/pillarjs/multiparty)'s
 * `Form` object, allowing you to configure the upload directory,
 * size limits, etc. For example if you wish to change the upload
 * dir do the following:
 *
 *     app.use(multipart({ uploadDir: path }))
 *
 * @param {Object} options
 * @return {Function}
 * @public
 */
function multipart (req,options) {
    options = options || {};

    return new Promise((resolve,reject)=>{
        if (req._body) return resolve({no:200,msg:"已经解析"});
        req.body = req.body || {};
        req.files = req.files || {};

        // ignore GET
        if ('GET' === req.method || 'HEAD' === req.method) return next();

        // check Content-Type
        if (!typeis(req, 'multipart/form-data')) return resolve({no:400,msg:"没有包含文件"});

        // flag as parsed
        req._body = true;

        // parse
        var form = new multiparty.Form(options);
        var data = {};
        var files = {};//
        var done = false;

        function ondata(name, val, data){
            if (Array.isArray(data[name])) {
                data[name].push(val);
            } else if (data[name]) {
                data[name] = [data[name], val];
            } else {
                data[name] = val;
            }
        }

        form.on('field', function(name, val){
            ondata(name, val, data);
        });

        form.on('file', function(name, val){
            val.name = val.originalFilename;
            val.type = val.headers['content-type'] || null;
            ondata(name, val, files);//存放在files的东西转移到data里面,统一放到req.body中
        });

        form.on('error', function(err){
            if (done) return;

            done = true;
            // err.status = 400;

            if (!req.readable) return resolve({msg:err});

            req.resume();
            onFinished(req, function(){
                resolve({no:400,msg:err});
            });
        });

        form.on('close', function() {
            if (done) return;

            done = true;

            try {
                data = Object.assign(data, files);
                req.body = qs.parse(data,{ allowDots: true });
                req.files = qs.parse(files, { allowDots: true });
                resolve({no:200});
            } catch (err) {
                resolve({no:400,msg:err})
            }
        });

        form.parse(req);
    })
};