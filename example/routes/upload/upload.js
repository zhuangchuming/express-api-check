const express = require('express');
const router = express.Router();
let {timeString} = require('../../lib/common');
var wrap = require('co-express');

var multer  = require('multer');
// var upload = multer({ dest: 'uploads/' })

var storage = multer.diskStorage({
    //文件保存路径
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/')
    },
    //修改文件名称
    filename: function (req, file, cb) {
        var fileFormat = (file.originalname).split(".");
        cb(null,req.session.user.sId + timeString() + "." + fileFormat[fileFormat.length - 1]);
    }
})
//加载配置
var upload = multer({ storage: storage });


//上传单个文件
router.post('/upload',upload.single('file'),wrap(function* (req,res,next){
    if(req.file){
        res.json({
            no:200,
            filename: `/${req.file.path}`//返回文件名
        })
    }else{
        res.json({
            no:400,
            filename: `上传的文件不能为空`//返回文件名
        })
    }

}));

// 上传多个文件
router.post('/uploads',upload.array('files'),wrap(function * (req,res,next){
    if(req.files.length >= 1){
        let filenames = [];
        for(let item in req.files){
            filenames[item] = `/${req.files[item].path}`;
        }
        res.json({
            no:200,
            filenames: filenames//返回文件名
        })
    }else{
        res.json({
            no:400,
            msg: "上传的文件不能为空"//返回文件名
        })
    }
}));
//错误捕获
// router.use(function (err, req, res,next){
//     res.json({no:500,msg:`错误文件参数${err.field}`});
// })

module.exports = router;