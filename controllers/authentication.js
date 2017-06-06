var passport = require('passport');
var mongoose = require('mongoose');
var User = mongoose.model('User');
var util = require('../util/util');

module.exports.register = function (req, res) {
	console.log("registering");
	console.log("********");
	console.log(req.body);
	console.log(req.body.email);
	console.log(req.body.password);
	console.log(req.body.nickName);
	console.log(req.body.userType);

	if(!req.body || !req.body.email || !req.body.password || !req.body.nickName || !req.body.userType) {
	    console.log("sldkfjlskdjf");
	    util.errorWithParameters(res);
		return;
	}
	
	var user = new User();
	
	//这几项必须
	user.email = req.body.email;
	user.nickName = req.body.nickName;
	user.userType = req.body.userType;
	user.setPassword(req.body.password);
	
	//这两项可选
	if(!req.body.school) {
		user.school = req.body.school;
	}
	if(!req.body.phone) {
		user.phone = req.body.phone;
	}
	
	//保存数据并返回token
	var token = user.generateJwt();
	user.save(function (err) {
		if(err) {
			util.sendJSONresponse(res,404,err);
			return 0;
		}
		
		util.sendJSONresponse(res, 200, {
			"token":token,
			"id":user._id,
            "userType":user.userType,
			"userName":user.nickName
		});
		return 0;
	});
};

module.exports.login = function (req, res) {
	console.log('login',"email:"+req.body.email);
	if(!req.body.email || !req.body.password){
		util.errorWithParameters(res);
	}
	
	passport.authenticate('local',function (err,user,info) {
		var token;
		
		if(err) {
			util.sendJSONresponse(res,404,err);
		}
		if(user){
			token = user.generateJwt();
			util.sendJSONresponse(res,200,{
				"token":token,
				"id":user._id,
				"userType":user.userType,
                "userName":user.nickName
            });
		} else {
			util.sendJSONresponse(res,401,info);
		}
	})(req,res);
};
