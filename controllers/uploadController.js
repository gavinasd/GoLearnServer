var mongoose = require('mongoose');
var util = require('../util/util');
let multer = require('multer');

var storage = multer.diskStorage({ //multers disk storage settings
    destination: function (req, file, cb) {
        cb(null, './public/uploads/');
    },
    filename: function (req, file, cb) {
        var datetimestamp = Date.now();
        cb(null, file.originalname.split('.')[0] + '-' + datetimestamp + '.' + file.originalname.split('.')[file.originalname.split('.').length -1]);
    }
});

var upload = multer({ //multer settings
    storage: storage
}).single('record');

module.exports.saveFile = function (req,res) {
    console.log('***upload file');
    upload(req,res,function(err){
        console.log(req.file);
        if(err){
            util.errorWithParameters(res,err);
            return;
        }
        util.sendJSONresponse(res, 200, {
            'filename' : req.file.filename
        });
    });
};