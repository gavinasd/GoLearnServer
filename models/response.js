/**
 * 学生对每道问题的回答
 * Created by zhenwenl on 16/12/31.
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const responseSchema = new mongoose.Schema({
	//创建者
	creator:{type:Schema.Types.ObjectId, ref:'User'},
	//所属班级
	class:{type:Schema.Types.ObjectId, ref:'Class'},
	//所属作业
	assignment:{type:Schema.Types.ObjectId, ref:'Assignment'},
	//对应的问题
	question:{type:Schema.Types.ObjectId, ref:'Question'},
	//回答的内容
	content:String
});

mongoose.model('ResponseToQuestion', responseSchema);

