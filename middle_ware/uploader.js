var multer = require('multer');

var storage = multer.diskStorage({
	destination:function(req,file,cb){
		cb(null,"./public/resources");
	},
	filename:function(req,file,cb){
		cb(null,file.originalname+"_"+Date.now());
	}
});


var resUpload = multer({
	storage:storage
});

module.exports = resUpload;