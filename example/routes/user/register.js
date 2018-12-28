const express = require('express');
const router = express.Router();
let User = require('../../model/User');
var wrap = require('co-express');
router.post('/register',wrap(function *(req,res){
	let body = req.body;
	let t;
	t.out;
	if(yield User.findOne({account:body.account}).exec()){
		throw Error(5001);
	}
	if(body.head) {
		let path = body.head.path;
		let url = '/uploads' + path.substring(path.lastIndexOf('/'), path.length);
		body.head = url;
	}
	let mP = yield User.find({}).sort({uID:-1}).limit(1).exec();
	let uID = 1;
	if(mP && mP[0]){
		uID = mP[0].uID+1;
	}
	body.uID = uID;
	let user = new User(body);
	yield user.save();
	res.send({no:200});
}))



module.exports = router