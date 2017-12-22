var passport = require('passport');
var mongoose = require('mongoose');
var User = mongoose.model('User');
var util = require('../util/util');

module.exports.register = function (req, res) {
	console.log("registering");
	console.log("********");
	if(!req.body || !req.body.email || !req.body.password || !req.body.nickName || !req.body.userType) {
	    util.errorWithParameters(res);
		return;
	}
	
	var user = new User();
	
	//这几项必须
	user.email = req.body.email;
	user.nickName = req.body.nickName;
	user.avatar = req.body.avatar;
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
			"userName":user.nickName,
            "avatar":user.avatar
		});
		return 0;
	});
};

module.exports.login = function (req, res) {
	console.log('login'+req.body.email);

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
                "userName":user.nickName,
                "avatar":user.avatar
            });
		} else {
			util.sendJSONresponse(res,401,{
			    "errmsg":"邮箱或密码错误"
            });
		}
	})(req,res);
};
