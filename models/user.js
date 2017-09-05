/**
 * 用户的基本信息
 * Created by zhenwenl on 16/12/31.
 */

var mongoose = require('mongoose');
var crypto = require('crypto');
var jwt = require('jsonwebtoken');
var Schema = mongoose.Schema;

var userSchema = new mongoose.Schema({
	//基本注册信息
	email:{type:String, unique:true, required:true},
	nickName:{type:String, required:true},
	avatar:{type:String, required:true},
	userType:{type:Number, required:true},//1是老师，其他是学生
	hash:String,
	salt:String,
	
	//教师的教授课程类型
	courseList:[{type:Schema.Types.ObjectId, ref:'Course'}],
	//教师或者学生所教过的所有课程,包括上完的和没上完的
	classList:[{type:Schema.Types.ObjectId, ref:'Class'}],
	
	//可填用户信息
	school:String,
	phone:String
});

userSchema.methods.setPassword = function (password) {
	this.salt = crypto.randomBytes(16).toString('hex');
	this.hash = crypto.pbkdf2Sync(password,this.salt,1000,64).toString('hex');
};

userSchema.methods.validPassword = function (password) {
	var hash = crypto.pbkdf2Sync(password,this.salt,1000,64).toString('hex');
	return this.hash === hash;
};

userSchema.methods.generateJwt = function () {
	var expiry = new Date();
	expiry.setDate(expiry.getDate() + 30);
	
	return jwt.sign({
		_id:this._id,
		email:this.email,
		name:this.name,
		exp:parseInt(expiry.getTime()/1000)
	}, 'thisIsSecret');
};

mongoose.model('User', userSchema);
