"use strict";

let mongoose = require('mongoose');
let util = require('../util/util');
let mConst = require('../const/const');
let path = require('path');
let mongooseHelper = require('../util/mongooseHelper');
let Log = require('log');
let log = new Log('debug');
require('../models/gradeInfo');

let User = mongoose.model('User');
let Class = mongoose.model('Class');
let Course = mongoose.model('Course');
let Resource = mongoose.model('Resource');
let Assignment = mongoose.model('Assignment');
let Question = mongoose.model('Question');
let TpoReadingQuestion = mongoose.model('TpoReadingQuestion');
let ResponseToQuestion = mongoose.model('ResponseToQuestion');
let Grade = mongoose.model('Grade');


class AssignmentInfo{
    constructor(assignmentId,
                assignmentName,
                gradeInfoList
    ){
        this.assignmentId = assignmentId;
        this.assignmentName = assignmentName;
        this.gradeInfoList = gradeInfoList;
    }
};

class GradeInfo{
    constructor(studentId,
                studentName,
                score,
                totalScore,
                undoneNum
    ){
        this.studentId = studentId;
        this.studentName = studentName;
        this.score = score;
        this.totalScore = totalScore;
        this.undoneNum = undoneNum;
    }
};

module.exports.getAssignmentById = function(req,res){
    let assignmentId = req.params.assignmentId;

    if(!assignmentId){
        util.errorWithParameters(res);
    }

    log.debug("getting assignment by id:"+assignmentId);
    mongooseHelper.findAssignmentById(assignmentId)
        .then((assignment)=>{
            log.debug("assignment",assignment);
            util.sendJSONresponse(res, 200, {
                assignment
            });
        }, (err)=>{
            log.error(err);
            util.sendJSONresponse(res, 404 , {
                "errmsg":err
            });
        });
};


/**
 * 添加/移除/修改作业
 */
module.exports.classAddAssignment = function (req, res) {
	console.log("adding assignment");
	let classId = req.body.classId;
	let userId = req.body.userId;
    let assignmentId = req.body.assignmentId;
    let thisClass;


	if(!classId || !userId || !assignmentId){
		util.errorWithParameters(res);
		return 0;
	}

	mongooseHelper.findAssignmentById(assignmentId)
        .then((assignment)=>{
	        if(!assignment){

            }
            console.log(classId)
            return mongooseHelper.findClassById(classId);
        })
        .then((mClass)=>{
	        console.log(mClass);
	        thisClass = mClass;
	        return mongooseHelper.findUserById(userId);
        })
        .then((user)=>{
	        if(!user){

            }

            if(user.userType !== 1){
                util.sendJSONresponse(res,404,{
                    "errmsg":"您非老师用户，不可以上传资料"
                });
                return 0;
            }

            if(!thisClass.isTeacherIn(user._id)){
                util.sendJSONresponse(res,404,{
                    "errmsg":"你不在此班级中"
                });
                return 0;
            }

            return mongooseHelper.classAddAssignment(thisClass,assignmentId);
        })
        .then((mClass)=>{
            util.sendJSONresponse(res, 200 , {
                "class":mClass
            });
            return 0;
        })
        .catch(function (err) {
            log.error(err);
            util.sendJSONresponse(res, 404, {
                "errmsg":err
            });
        });
};

/**
 * 添加题目到作业中
 */
module.exports.classAddQuestionToAssignment = function (req, res) {
    console.log("adding question");
	let assignmentId = req.body.assignmentId;
	let quest = req.body.question;
	let userId = quest.creator;
	let questionType = quest.questionType;

	if(!userId || !assignmentId || !questionType){
		util.errorWithParameters(res);
		return 0;
	}

	Assignment.findById(assignmentId,function(err,assignment){
		if(err || !assignment){
			util.sendJSONresponse(res,404,{
				"errmsg":"找不到该作业"
			});
			return 0;
		}
		if(assignment.creator != userId) {
			util.sendJSONresponse(res, 404, {
				"errmsg":"你无权修改该作业"
			});
			return 0;
		}

		console.log("questionType:" + questionType);
		switch (questionType){
			case mConst.TpoReadingType:
				addTpoReadingQuestion(quest, res, assignment, userId);
				break;
		}

	});
};

/**
 * 获取某一班级的所有assignment列表
 * @param req
 * @param res
 */
module.exports.classGetAssignmentList = function (req, res) {
	let classId = req.params.classId;
	let userId = req.params.userId;
	log.debug("getting assignmentList");

	if(!classId || !userId){
	    util.errorWithParameters(res);
	    return 0;
    }

    mongooseHelper
        .findClassById(classId,{path:'assignmentList studentList'})
        .then(function (mClass) {
            if (mClass.isTeacherIn(userId)){
                return returnAssignmentListToTeacher(mClass.studentList, mClass.assignmentList);
            } else if(mClass.isStudentIn(userId)){
                return returnAssignmentListToStudent(userId, mClass.assignmentList);
            }
        }).then(function(obj){
            util.sendJSONresponse(res, 200 , {
                "gradeInfo":obj
            });
            log.debug("ending assignmentList");
            return 0;
        }).catch(function (err) {
            log.error(err);
            util.sendJSONresponse(res, 404, {
                "errmsg":err
            });
        });


};


/**
 * 获取某一次作业里面的所有题目
 * @param req
 * @param res
 */
module.exports.getQuestionListByAssignment = function(req,res){
	let assignmentId = req.params.assignmentId;

	if(!assignmentId){
		util.errorWithParameters(res);
		return 0;
	}

	Assignment.findById(assignmentId).populate('questionList')
		.exec(function(err, assignment){
			if(err || !assignment){
				util.sendJSONresponse(res, 404, {
					"errmsg":"该作业不存在"
				});
				return 0;
			}

			util.sendJSONresponse(res, 200, {
				'questionList':assignment.questionList
			});
	});
};

/**
 * 作业添加回答
 * @param req
 * @param res
 */
module.exports.addResponseToQuestion = function (req, res) {
	console.log("adding response");
    let userId = req.body.userId;
	let classId = req.body.classId;
	let assignmentId = req.body.assignmentId;
	let questionId = req.body.questionId;
	let content = req.body.content;
    let mResponse = new ResponseToQuestion();
    let mQuestion = new Question();

	if(!userId || !assignmentId || !classId || !questionId || !content){
		util.errorWithParameters(res);
		return 0;
	}

	mongooseHelper.findClassById(classId,{path:'assignmentList'}).then((mClass)=>{
        //判断该班级中是否有这个学生和这个作业
        if(!mClass.isUserIn(userId)){
            util.sendJSONresponse(res, 404, {
                "errmsg":"你不在该班级中"
            });
            return 0;
        } else if (!mClass.isAssignmentIn(assignmentId)){
            util.sendJSONresponse(res, 404, {
                "errmsg":"找不到该作业"
            });
            return 0;
        }

        //判断作业中有没有这个题目
        let assignment = mClass.findAssignmentById(assignmentId);
        if(!assignment.isQuestionIn(questionId)){
            util.sendJSONresponse(res, 404 , {
                "errmsg": "找不到该题目"
            });
            return 0;
        }
        mResponse.creator = userId;
        mResponse.class = classId;
        mResponse.assignment = assignmentId;
        mResponse.question = questionId;
        mResponse.content = content;

        return mongooseHelper.insertResponse(mResponse);
    }).then((response)=>{
        console.log(response.question);
        return mongooseHelper.findQuestionById(response.question);
	}).then((question)=>{
	    mQuestion = question;
	    return mongooseHelper.findGrade(userId, assignmentId)
	}).then((grade)=>{
	    if(grade){
            let hasResponse = 0;//如果grade里面已经有过这个response，那么update就行了
	        grade.responseList.forEach(function(response){
	            console.log("*****");
	            console.log("response.questionId",typeof response.questionId.toString());
	            console.log("mquestion._id",typeof mQuestion._id.toString());
	            console.log(response.questionId.toString()==mQuestion._id.toString());
	            if(response.questionId.toString()==mQuestion._id.toString()) {
                    hasResponse++;
                    if (mQuestion.answer == content) {
                        response.score = mQuestion.score;
                    } else {
                        response.score = 0;
                    }
                }
                console.log(response);
            });
	        console.log("hasResponse",hasResponse);
	        console.log(grade);
	        //如果没有出现过这个response
	        if(hasResponse == 0) {
                if (mQuestion.answer == content) {
                    grade.responseList.push({
                        'questionId': mQuestion._id,
                        'score': mQuestion.score
                    });
                } else {
                    grade.responseList.push({
                        'questionId': mQuestion._id,
                        'score': 0
                    });
                }
            }
        } else {
            //没有这个grade，所以创建一个
            grade = new Grade();
            grade.studentId = userId;
            grade.assignmentId = assignmentId;
            if (mQuestion.answer == content) {
                grade.responseList.push({
                    'questionId': mQuestion._id,
                    'score': mQuestion.score
                });
            } else {
                grade.responseList.push({
                    'questionId': mQuestion._id,
                    'score': 0
                });
            }
        }

        return mongooseHelper.insertGrade(grade);
    }).then((grade)=>{
	    util.sendJSONresponse(res, 200, {
	        "response":mResponse,
            "grade":grade
        });
    }).catch((err)=>{
	    console.error(err);
	    util.sendJSONresponse(res, 404, {
	        "errms":err
        });
    });

};

module.exports.classAddAssignments = function (req, res) {

};

module.exports.classDelAssignment = function (req, res) {

};

module.exports.classDelAssignments = function (req, res) {

};

module.exports.classChangeAssignment = function (req, res) {

};

module.exports.classChangeAssignments = function (req, res) {
};

/**
 * 获取所有的assignment列表，主要是用来编辑题目
 * @param req
 * @param res
 * @returns {number}
 */
module.exports.getAllAssignmentList = function(req,res){
    let userId = req.params.userId;
    if(!userId){
        util.errorWithParameters(res);
        return 0;
    }

    mongooseHelper.findUserById(userId)
        .then((user)=>user.userType == 1)
        .then((isTeacher)=>{
            if(!isTeacher){
                util.sendJSONresponse(res,404,{
                    "errmsg":"你没有权限"
                });
                return 0;
            }

            return mongooseHelper.findAllAssignmentList();
        })
        .then((assignmentList)=>{
            util.sendJSONresponse(res, 200 ,{
                assignmentList
            });
        }, (err)=>{
            util.sendJSONresponse(res, 404, {
                "errmsg":err
            });

        });
};


/**
 * 找出学生做过的题目，还有答案，可做对比
 * @param req
 * @param res
 */
module.exports.findAssignmentGradeDetail= function(req,res){
    log.debug("finding assignment and grade detail");
    let userId = req.params.userId;
    let assignmentId = req.params.assignmentId;
    if(!userId || !assignmentId){
        util.errorWithParameters(res);
    }

    mongooseHelper.findAssignmentById(assignmentId)
        .then((assignment)=>{
            return assignment.questionList;
        })
        .then((questionList)=>{
            return returnQuestionResponse(userId,questionList);
        })
        .then((results)=>{
            util.sendJSONresponse(res,200,{
                results
            });
        },(err)=>{
            log.error(err);
            util.sendJSONresponse(res,404,{
                "errmsg":err
            });
        })

};


/**
 * 添加tpo阅读题目
 */
let addTpoReadingQuestion = function (quest, res, assignment, userId) {
    let passage = quest.passage;
    let question = quest.question;
    let options = quest.options;
    let answer = quest.answer;
    let score = quest.score;

    let newQuestion = new TpoReadingQuestion({
        creator:userId,
        questionType:mConst.TpoReadingType,
        passage:passage,
        question:question,
        options:options,
        answer:answer,
        score:score
    });
    mongooseHelper
        .insertQuestion(newQuestion,assignment)
        .then((newQuestion, assignment)=>{
            util.sendJSONresponse(res,200, {
                "question":newQuestion
            });
            return 0;
        },(err)=>{
            util.sendJSONresponse(res, 404, {
                "errmsg":err
            });
        });
};

let returnAssignmentListToTeacher = function (studentIdList, assignmentList) {
    let results = assignmentList.map((assignment)=>{
        let gradeInfoList = studentIdList.map((student)=>{
            return mongooseHelper.findGrade(student._id, assignment._id)
                .then((grade)=>assembleGradeInfo(grade,assignment,student._id,student.nickName));
        });
        return Promise.all(gradeInfoList).then((gradeInfoList)=>{
            console.log(gradeInfoList);
            let assignmentInfo = new AssignmentInfo(assignment._id, assignment.assignmentName, gradeInfoList);
            return assignmentInfo;
        });
    });

    return Promise.all(results);
};

let returnAssignmentListToStudent = function (studentId, assignmentList) {
    log.info('assignmentList',JSON.stringify(assignmentList));
    let results = assignmentList.map(function (assignment) {
        log.info('studentId',studentId);
        log.info('assignmentId',assignment._id);

        return mongooseHelper.findGrade(studentId,assignment._id)
            .then(grade=>assembleGradeInfo(grade,assignment,studentId,''))
            .then((gradeInfo)=>{
                let assignmentInfo = new AssignmentInfo(assignment._id, assignment.assignmentName, [gradeInfo]);
                return assignmentInfo;
            });
    });
    return Promise.all(results);
};

//得到grade后，组装好gradeInfo信息返回
let assembleGradeInfo = function (grade,assignment,studentId,studentName){
    if(grade){
        let score = 0;
        grade.responseList.forEach((response)=>{
            score += response.score;
        });
        let undoneNum = assignment.questionList.length - grade.responseList.length;

        let gradeInfo = new GradeInfo(studentId, studentName,
            score, assignment.totalScore,undoneNum);
        return gradeInfo;
    } else{
        let gradeInfo = new GradeInfo(studentId, studentName,
            0,assignment.totalScore, assignment.totalScore);
        return gradeInfo;
    }
};

let returnQuestionResponse = function(userId, questionIdList){
    log.debug("userId:"+userId);
    log.debug("questionList"+questionIdList);
    let results = questionIdList.map((questionId)=>{
        return mongooseHelper.findResponse(userId,questionId)
            .then((response)=>{
                log.debug("response",response);
                //如果response为空，那么需要返回的就是question就足够了
                if(!response){
                    return mongooseHelper.findQuestionById(questionId)
                        .then((question)=>{
                            return {"question":question};
                        });
                }
                else {
                    return response;
                }
            })
    });
    return Promise.all(results);
};

