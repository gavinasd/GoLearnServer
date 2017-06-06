/**
 * 课堂中老师上传的资料，比如ppt或者pdf
 * Created by gavin on 16/12/31.
 */


var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var resourceSchema = new Schema({
	//文件的名称
	name:{type:String,required:true},
	//上传者
	creator:{type:Schema.Types.ObjectId,ref:"User"},
	//所属班级
	class:{type:Schema.Types.ObjectId,ref:"Class"},
	//路径
	path:{type:String,required:true}
});

resourceSchema.statics.findByClass = function (classId, callback) {
	return this.model('Resource').find({class: classId}, callback);
};

mongoose.model('Resource', resourceSchema);
