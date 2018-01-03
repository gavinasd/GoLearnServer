let mongoose = require('mongoose');
let util = require('../util/util');
let mConst = require('../const/const');
let Assignment = mongoose.model("Assignment");
let Class = mongoose.model("Class");
let ResponseToQuestion = mongoose.model("ResponseToQuestion");

class Grade{
    constructor(
        classId,
        studentId,
        studentName,
        assignmentId,
    ){
        this.classId = classId;
        this.studentId = studentId;                 //学生ID
        this.studentName = studentName;             //学生名字
        this.assignmentId = assignmentId;           //作业的ID
        this.responseList = {};                     //已经回答了的题目Id和分数
    }
}

module.exports.getStudentGradeByAssignment = function (req, res) {
	let classId = req.params.classId;
	let teacherId = req.params.teacherId;

	if(!classId || !teacherId) {
	    util.errorWithParameters(res);
    }

	Class.findById(classId)
        .populate('assignmentList studentList')
        .exec(function(err, mClass){
	    if(err || !mClass){
	        util.sendJSONresponse(res, 404, {
	            "errmsg":"无法找到该班级"
            });
	        return 0;
        }

        if(!mClass.isTeacherIn(teacherId)){
	        util.sendJSONresponse(res, 404 ,{
	            "errmsg":"你无权操作该班级"
            });
	        return 0;
        }

        let studentList = mClass.studentList;
        let assignmentList = mClass.assignmentList;

        let assignmentGradeList = Array.from([]);
        for(let assignment of assignmentList){
            let assignmentGrade = Array.from([]);

            for(let student of studentList){
                let grade = new Grade(classId, student._id, student.name, assignment._id, 0, assignment.questionList.length);
                ResponseToQuestion.find({
                        creator:student._id,
                        class:classId,
                        assignment:assignment._id
                    })
                    .populate("question")
                    .exec(function (err, responses){
                       if(err || !responses){
                           util.sendJSONresponse(res, 404, {
                               "errmsg":"数据库查询错误"
                           });
                           return 0;
                       }

                       for(let responseToQuestion of responses){
                           let content = responseToQuestion.content;
                           let answer = responseToQuestion.question.answer;
                           if(content.equals(answer)){
                               grade.score ++ ;
                           }
                       }
                    });

                assignmentGrade = assignmentGrade.concat([grade]);
            }

            assignmentGradeList = assignmentGradeList.concat([assignmentGrade]);
        }

        util.sendJSONresponse(res, 200 , {
            "assignmentGradeList" : assignmentGradeList
        });
        return 0;

    });
};