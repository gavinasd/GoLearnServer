/**
 * 老师创建的作业列表，可包含多个问题
 * Created by zhenwenl on 16/12/31.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

let questionGroupSchema = new Schema({
    //做题之前的材料，可能是图片，文章，录音
    //写成string的型式，根据不同的类型各自解析
    content:String,

    //不同questionGroup的类型
    type:{type:String, required:true},

    //题目列表
    questionList:[{type:Schema.Types.ObjectId, ref:'Question'}],

    //这个题集的总分
    totalScore:Number
});


/**
 *  QuestionGroup指的是这类型的题目：
 *  让学生看完某一些材料内容（可能是一篇阅读文章，听力录音，单词列表）
 *  后回答一系列的题目
 */
var assignmentSchema = new mongoose.Schema({
	//作业创建者
	creator:{type:Schema.Types.ObjectId, ref:'User'},
	//作业的名字
    assignmentName:String,
	//作用里包含的问题，这里是以questionGroup的形式存在
    //即是所有的问题都必须组装questionGroup的形式才可以添加到assignment中
	questionGroupList:[questionGroupSchema],
	//作业提交的截止日期
	deadline:{type:Date}
});

assignmentSchema.methods.isQuestionIn = function (questionId){
	return this.questionGroupList.filter(function (questionGroup) {
	    //看看每个questionGroup里面是否含有这个question
	    return questionGroup.questionList.filter(function(question){
            return question.toString() == questionId.toString();
        }).length > 0;
    }).length > 0;
};

assignmentSchema.methods.getTotalScore = function () {
    let totalScore = 0;
    for(let questionGroup of this.questionGroupList){
        totalScore += questionGroup.totalScore;
    }

    return totalScore;
};

assignmentSchema.methods.getQuestionLength = function(){
    return this.getQuestionList().length;
};

assignmentSchema.methods.getQuestionList = function(){
    let questionList= Array();
    for(let questionGroup of this.questionGroupList){
        for(let question of questionGroup.questionList){
            questionList.push(question);
        }
    }
    return questionList;
};

mongoose.model('Assignment', assignmentSchema);
