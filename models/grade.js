/**
 * 学生的做题成绩
 * Created by gavinwcchen
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const responseSchema = Schema({
    questionId:{type:Schema.ObjectId, required:true},
    score:{type:Number, default:0}
});

const gradeSchema = new mongoose.Schema({
    //学生ID
    studentId:{type:Schema.ObjectId, required:true},
    //作业ID
    assignmentId:{type:Schema.ObjectId, required:true},
    //学生回答题目的时间
    spendTime: {type:Number, default: 0},
    //学生回答题目的列表，包括分数
    responseList:[responseSchema],
    //标记这个学生是否已经确认提交，如果确认了，就不能再做更改
    done: {type: Boolean, default: false}
});

mongoose.model('Grade', gradeSchema);
