/**
 * 课程类型，比如数学，托福阅读等等
 * Created by zhenwenl on 16/12/31.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var courseSchema = new mongoose.Schema({
	//课程名称
	name:{type:String,required:true},
	//课程logo
	img:{type:String}
});

mongoose.model('Course', courseSchema);
