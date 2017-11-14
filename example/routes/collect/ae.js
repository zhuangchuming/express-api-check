const express = require('express');
const router = express.Router();
var wrap = require('co-express');
const path = require('path');
const fs = require('fs');
const JSON5 = require('json5');
let aepath = path.join(__dirname,'../../models/ae.json');

router.get('/store_ae',wrap(function* (req,res){
	let ae = readAeFile();
	res.json({
		no:200,
		data:ae
	})
}));

let ae = null;
function readAeFile(){
	if(!ae){
		if(fs.existsSync(aepath)){
			ae =fs.readFileSync(aepath, 'utf-8');
			if(typeof ae != 'object'){
				ae = JSON5.parse(ae)
			}
		}
	}
	return ae;
}

exports.router = router;
exports.readAeFile = readAeFile;