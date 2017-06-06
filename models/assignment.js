/**
 * 老师创建的作业列表，可包含多个问题
 * Created by zhenwenl on 16/12/31.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var assignmentSchema = new mongoose.Schema({
	//作业创建者
	creator:{type:Schema.Types.ObjectId, ref:'User'},
	//作业的名字
    assignmentName:String,
	//作用里包含的问题
	questionList:[{type:Schema.Types.ObjectId, ref:'Question'}],
	//这个作业的总分
	totalScore:{type:Number, default:0},
	//作业提交的截止日期
	deadline:{type:Date}
});

assignmentSchema.methods.isQuestionIn = function (questionId){
	return this.questionList.filter(function(question){
		return question.toString() == questionId.toString();
	}).length > 0 ;
};

mongoose.model('Assignment', assignmentSchema);
