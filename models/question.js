/**
 * 老师创建的问题
 * Created by zhenwenl on 16/12/31.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var options = {discriminatorKey:'kind'};
var questionSchema = new mongoose.Schema({
	//创建者
	creator:{type:Schema.Types.ObjectId, ref:'User'},
	//作业类型，选择题/填空题/托福阅读题
	questionType:{type:String, required:true},
    //题目的分数，默认1分
    score:{type:Number, default:1}
	}, options);
var Question = mongoose.model('Question', questionSchema);

//tpo阅读题目
var tpoReadingQuestionSchema = new mongoose.Schema({
	//tpo的文章
	passage:String,
	//题目
	question:String,
	//选项
	options:[{type:String}],
	//答案
	answer:String
});
var TpoReadingQuestion = Question.discriminator('TpoReadingQuestion', tpoReadingQuestionSchema);

//单词题
var vocabularyQuestionSchema = new mongoose.Schema({
    //题目
    question:String,
    //选项
    options:[{type:String}],
    //答案
    answer:String
});
var VocabularyQuestion = Question.discriminator('VocabularyQuestion', vocabularyQuestionSchema);