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
let VocabularyQuestion = mongoose.model('VocabularyQuestion');
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
                undoneNum,
                spendTime
    ){
        this.studentId = studentId;
        this.studentName = studentName;
        this.score = score;
        this.totalScore = totalScore;
        this.undoneNum = undoneNum;
        this.spendTime = spendTime || 0;
    }
};

module.exports.getAssignmentById = function(req,res){
    let assignmentId = req.params.assignmentId;

    if(!assignmentId){
        util.errorWithParameters(res);
    }

    mongooseHelper.findAssignmentById(assignmentId, {path:'questionGroupList.questionList'})
        .then((assignment)=>{
            util.sendJSONresponse(res, 200, assignment);
        }, (err)=>{
            util.sendJSONresponse(res, 404 , {
                'err':err,
                'errmsg':'网络错误'
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

    console.log('classId', classId, 'userId', userId, 'assignmentId', assignmentId);
	if(!classId || !userId || !assignmentId){
		util.errorWithParameters(res);
		return 0;
	}

	mongooseHelper.findAssignmentById(assignmentId)
        .then((assignment)=>{
	        if(!assignment){

            }
            console.log(classId);
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
                    "errmsg":"您非老师用户，不可以新建作业"
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
 * 为一个作业添加一个questionGroup
 */
module.exports.addQuestionGroupToAssignment = function (req, res) {
    let creator = req.body.userId;
    let content = req.body.content;
    let questionList = req.body.questionList;
    let type = req.body.type;
    let assignmentId = req.body.assignmentId;
    if(!type || !assignmentId || !creator){
        util.errorWithParameters(res);
        return;
    }

    let questionGroup = {
        'creator': creator,
        'content':content,
        'type': type,
        'questionList': questionList,
        'totalScore':0
    };

    mongooseHelper.insertQuestionGroupToAssignment(assignmentId, questionGroup)
        .then((questionGroup)=>{
            util.sendJSONresponse(res, 200, {
                'questionGroup':questionGroup
            });
        })
        .catch(function (err) {
            log.error(err);
            util.sendJSONresponse(res, 404, {
                "errmsg":err
            });
        });
};

// /**
//  * 要修改的内容
//  * 1.question是添加到questionGroup中去
//  *
//  */
// /**
//  * 添加题目到作业中
//  */
// module.exports.classAddQuestionToAssignment = function (req, res) {
//     console.log("adding question");
// 	let assignmentId = req.body.assignmentId;
// 	let quest = req.body.question;
// 	let userId = quest.creator;
// 	let questionType = quest.questionType;
//
// 	if(!userId || !assignmentId || !questionType){
// 		util.errorWithParameters(res);
// 		return 0;
// 	}
//
// 	Assignment.findById(assignmentId,function(err,assignment){
// 		if(err || !assignment){
// 			util.sendJSONresponse(res,404,{
// 				"errmsg":"找不到该作业"
// 			});
// 			return 0;
// 		}
// 		if(assignment.creator != userId) {
// 			util.sendJSONresponse(res, 404, {
// 				"errmsg":"你无权修改该作业"
// 			});
// 			return 0;
// 		}
//
// 		console.log("questionType:" + questionType);
// 		switch (questionType){
// 			case mConst.QuestionType.TPO_READING_TYPE:
// 				addTpoReadingQuestion(quest, res, assignment, userId);
// 				break;
//             case mConst.QuestionType.VOCABULARY_TYPE:
//                 addVocabularyQuestion(quest, res, assignment, userId);
// 		}
//
// 	});
// };

/**
 * 添加题目到questionGroup中
 */
module.exports.addQuestionToGroup = function(req, res){
    let assignmentId = req.body.assignmentId;
    let groupId = req.body.groupId;
    let quest = req.body.question;
    let userId = quest.creator;
    let questionType = quest.questionType;

    console.log(assignmentId,groupId,userId,questionType);

    if(!userId || !groupId || !questionType){
        util.errorWithParameters(res);
        return 0;
    }

    Assignment.findById(assignmentId,function(err,assignment){
        if(err || !assignment){
            util.sendJSONresponse(res,404,{
                "errmsg":"找不到该题目组"
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
            case mConst.QuestionType.TPO_READING_TYPE:
                addTpoReadingQuestion(quest, res, assignment, groupId, userId);
                break;
            case mConst.QuestionType.VOCABULARY_TYPE:
                addVocabularyQuestion(quest, res, assignment, groupId,userId);
        }

    });
};

/**
 *  改变questionGroup里面的content内容
 */
module.exports.updateQuestionGroupContent = function(req, res){
    log.info('*******assignment adding content');
    let assignmentId = req.body.assignmentId;
    let groupId = req.body.groupId;
    let content = req.body.content;
    if(typeof content == "object"){
        content = JSON.stringify(content);
    }

    mongooseHelper.updateQuestionGroupContent(assignmentId, groupId, content)
        .then(
            ()=>{
                util.sendJSONresponse(res, 200, {
                    'status': 'ok'
                });
            }
        )
        .catch(function (err) {
            log.error(err);
            util.sendJSONresponse(res, 404, {
                "errmsg":err
            });
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
	let page = req.params.page;
	log.debug("getting assignmentList");

	if(!classId || !userId){
	    util.errorWithParameters(res);
	    return 0;
    }

    mongooseHelper
        .findClassById(classId,{path:'assignmentList studentList'})
        .then(function (mClass) {
            let assignmentList = [];
            if((page-1)*5>=mClass.assignmentList.length){
                //如果这时候选择的页码已经超出边界
                assignmentList = mClass.assignmentList.reverse();
            }
            else{
                //选择好要读取的页码数
                assignmentList = mClass.assignmentList.reverse().splice((page-1)*5,5);
            }

            if (mClass.isTeacherIn(userId)){
                return returnAssignmentListToTeacher(mClass.studentList, assignmentList);
            } else if(mClass.isStudentIn(userId)){
                return returnAssignmentListToStudent(userId, assignmentList);
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

module.exports.getQuestionGroupById = function (req, res) {
    let assignmentId = req.params.assignmentId;
    let groupId = req.params.questionGroupId;
    Assignment.findById(assignmentId).populate('questionGroupList.questionList')
        .exec(function(err, assignment){
            if(err || !assignment){
                util.sendJSONresponse(res, 404, {
                    "errmsg":"该作业不存在"
                });
                return 0;
            }

            let group = assignment.questionGroupList.id(groupId);
            util.sendJSONresponse(res, 200, {
                'questionGroup': group
            });
        });
};

/**
 * 作业添加回答
 * @param req
 * @param res
 */
module.exports.addResponseToQuestion = function (req, res) {
	console.log("****adding response");
    let userId = req.body.userId;
	let classId = req.body.classId;
	let assignmentId = req.body.assignmentId;
	let questionId = req.body.questionId;
	let content = req.body.content;
	let spendTime = req.body.time;
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
        console.log(response.content);
        return mongooseHelper.findQuestionById(response.question);
	}).then((question)=>{
	    mQuestion = question;
        return updateGradeSpendTime(assignmentId, userId, spendTime);
    }).then(()=>{
	    //可以自动判断答案的类型，可以直接插入成绩
        console.log(mQuestion.questionType,mQuestion.answer);
        if(mQuestion.questionType == mConst.QuestionType.TPO_READING_TYPE){
            let score = (mQuestion.answer == content)?mQuestion.score:0;
            return addMarkingScore(assignmentId,questionId,userId, score);
        }
    }).then(()=>{
	    util.sendJSONresponse(res, 200, {
	        "response":mResponse,
        });
    }).catch((err)=>{
	    console.error(err);
	    util.sendJSONresponse(res, 404, {
	        "errms":err
        });
    });

};

module.exports.addMarkingScoreToQuestion = function(req, res){
    console.log("*********adding Marking score");
    let userId = req.body.userId;
    let classId = req.body.classId;
    let assignmentId = req.body.assignmentId;
    let questionId = req.body.questionId;
    let score = req.body.score;

    console.log(!score);
    if(!userId || !assignmentId || !classId || !questionId){
        util.errorWithParameters(res);
        return 0;
    }

    addMarkingScore(assignmentId, questionId, userId, score)
        .then((grade)=>{
            console.log(grade);
            util.sendJSONresponse(res, 200, {
                'grade':grade
            });
        })
        .catch((err)=>{
            console.log(err);
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
    console.log("get all assignment:"+userId);
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
 * 新建作业的接口
 */
module.exports.createAssignment = function(req, res){
    log.info("****creating assignment");
    let creator = req.body.creator;
    let assignmentName = req.body.assignmentName;
    log.info(creator + " " + assignmentName);

    if(!creator || !assignmentName ){
        util.errorWithParameters(res);
        return 0;
    }

    let newAssignment = new Assignment({
        'creator': creator,
        'assignmentName': assignmentName,
    });

    mongooseHelper.createAssignment(newAssignment)
        .then(
            ()=> {
                util.sendJSONresponse(res, 200 , {
                    'questionGroup': newAssignment
                });
            },
            (err)=>{
                util.sendJSONresponse(res, 404, {
                    'errmsg': err
                });
            }
        );
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
            return assignment.getQuestionList();
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
 * 获取一个assignment的与学生相关的内容，分别是上次做过的答案，分数和做题时间
 * @param req   userId，学生Id, assignmentId, 作业Id
 * @param res
 */
module.exports.getAssignmentInfo = function (req, res) {
    let assignmentId = req.params.assignmentId;
    let studentId = req.params.studentId;
    let studentAnswer, markScore, spendTime;

    if(!studentId || !assignmentId){
        util.errorWithParameters(res);
        return;
    }

    mongooseHelper.findAssignmentById(assignmentId)
        .then((assignment) => {
            let questionList = assignment.getQuestionList();
            log.info(questionList);
            return getStudentAnswer(studentId, assignment.getQuestionList());
        })
        .then(answers =>{
            studentAnswer = answers;
            return mongooseHelper.findGrade(studentId,assignmentId);
        })
        .then(grade => {
            spendTime = getSpendTime(grade);
            markScore = getMarkScore(grade);
            log.info(markScore);
            log.info(typeof markScore);
            log.info(JSON.stringify(markScore).toString());

            util.sendJSONresponse(res, 200, {
                assignmentId: assignmentId,
                studentId: studentId,
                spendTime: spendTime,
                studentAnswer: studentAnswer,
                markScore: markScore
            });
        })
        .catch(err=>{
            log.error(err);
            util.sendJSONresponse(res, 404, {
                'err': err.toString(),
                'errmsg':'网络错误'
            });
        })
}

module.exports.submitAssignmentInfo = function(req, res){
    log.info('********submiting info');
    const classId = req.body.classId;
    const assignmentId = req.body.assignmentId;
    const studentId = req.body.studentId;
    const spendTime = req.body.spendTime;
    const questionId = req.body.questionId;
    const studentAnswer = req.body.studentAnswer;
    const markScore = req.body.markScore;


    if(!assignmentId || !studentId || !classId || !questionId){
        util.errorWithParameters(res);
    }

    mongooseHelper.findClassById(classId,{path:'assignmentList'}).then((mClass)=>{
        //判断该班级中是否有这个学生和这个作业
        if(!mClass.isUserIn(studentId)){
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

        let taskList = Array();

        if(studentAnswer) {
            let updateAnswer = updateStudentAnswer(classId, assignmentId, questionId, studentId, studentAnswer);
            taskList.push(updateAnswer);
        }
        if(spendTime) {
            let updateSpendTime = updateGradeSpendTime(assignmentId, studentId, spendTime);
            taskList.push(updateSpendTime);
        }
        if(markScore) {
            let updateMarkScore = addMarkingScore(assignmentId, questionId, studentId, markScore);
            taskList.push(updateMarkScore);
        }

        return Promise.all(taskList);
    }).then((data)=>{
        util.sendJSONresponse(res, 200, {
            "data":data
        });
    }).catch((err)=>{
        console.error(err);
        util.sendJSONresponse(res, 404, {
            "errms":err
        });
    });
};

module.exports.getMarkingScore = function (req, res) {
    console.log("********getting score");
    let assignmentId = req.params.assignmentId;
    let userId = req.params.userId;

    if(!assignmentId || !userId){
        util.errorWithParameters(res);
        return;
    }

    mongooseHelper.findGrade(userId,assignmentId)
        .then((grade)=>{
            util.sendJSONresponse(res, 200, {
                'responseList': grade.responseList
            });
            return 0;
        })
        .catch((err)=>{
            util.sendJSONresponse(res, 404, {
                "errmsg":err
            });
        });
};

module.exports.getSpendTime = function (req, res) {
    console.log("********getting spend time");
    let assignmentId = req.params.assignmentId;
    let userId = req.params.userId;

    if(!assignmentId || !userId){
        util.errorWithParameters(res);
        return;
    }

    mongooseHelper.findGrade(userId,assignmentId)
        .then((grade)=>{
            console.info(grade);
            util.sendJSONresponse(res, 200, {
                'spendTime': grade.spendTime
            });
            return 0;
        })
        .catch((err)=>{
            util.sendJSONresponse(res, 404, {
                "errmsg":err
            });
        });
};

/**
 * 从某一个课堂中移除掉一份作业
 * @param req
 * @param res
 */
module.exports.removeAssignmentFromClass = function(req, res){
    let userId = req.params.userId;
    let classId = req.params.classId;
    let assignmentId = req.params.assignmentId;
    let userCache;

    if(!userId || !classId || !assignmentId){
        util.errorWithParameters(res);
    }

    mongooseHelper.findUserById(user)
        .then((user)=>{
            if(!user || user.userType !== '1') {
                util.sendJSONresponse(res, 400, {
                    'errmsg': '你没有这个权限'
                });
                return;
            }
            userCache = user;

            return mongooseHelper.findClassById(classId);
        })
        .then((mClass)=>{
            if(!mClass.isTeacherIn(userId)){
                util.sendJSONresponse(res, 400, {
                    'errmsg': '你没有这个权限'
                });
                return;
            }

            if(mclass.assignmentList.indexOf(assignmentId) >= 0){
                mClass.assignmentList.splice(mclass.assignmentList.indexOf(assignmentId), 1);
                mClass.save(function (err){
                    if(err){
                        util.sendJSONresponse(res, 404, {
                            'errmsg':err
                        });
                    }
                })
            }
        })
        .catch((err)=>{
            util.sendJSONresponse(res, 404, {
                'errmsg':err
            });
        });
};


let addQuestion = function (newQuestion, assignment, groupId, res){
    mongooseHelper
        .insertQuestionToGroup(newQuestion,assignment, groupId)
        .then((newQuestion, assignment)=>{
            util.sendJSONresponse(res,200, {
                'question':newQuestion,
                'assignment':assignment
            });
            return 0;
        })
        .catch((err)=>{
            util.sendJSONresponse(res, 404, {
                "errmsg":err
            });
        });
};

/**
 * 添加tpo阅读题目
 */
let addTpoReadingQuestion = function (quest, res, assignment, groupId, userId) {
    let passage = quest.passage;
    let question = quest.question;
    let options = quest.options;
    let answer = quest.answer;
    let score = quest.score;

    let newQuestion = new TpoReadingQuestion({
        creator:userId,
        questionType:mConst.QuestionType.TPO_READING_TYPE,
        passage:passage,
        question:question,
        options:options,
        answer:answer,
        score:score
    });
    addQuestion(newQuestion, assignment, groupId, res);
};

/**
 * 添加单词题目
 */
let addVocabularyQuestion = function (quest, res, assignment, groupId, userId){
    let question = quest.question;
    let answer = quest.answer;
    let score = quest.score;

    let newQuestion = new VocabularyQuestion({
        creator:userId,
        questionType:mConst.QuestionType.VOCABULARY_TYPE,
        question:question,
        answer:answer,
        score:score
    });

    addQuestion(newQuestion, assignment, groupId, res);
};

let returnAssignmentListToTeacher = function (studentIdList, assignmentList) {
    let results = assignmentList.map((assignment)=>{
        let gradeInfoList = studentIdList.map((student)=>{
            return mongooseHelper.findGrade(student._id, assignment._id)
                .then((grade)=>assembleGradeInfo(grade,assignment,student._id,student.nickName));
        });
        return Promise.all(gradeInfoList).then((gradeInfoList)=>{
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
        let undoneNum = assignment.getQuestionLength() - grade.responseList.length;

        let gradeInfo = new GradeInfo(studentId, studentName,
            score, assignment.getTotalScore(),undoneNum, grade.spendTime);
        return gradeInfo;
    } else{
        let gradeInfo = new GradeInfo(studentId, studentName,
            0,assignment.getTotalScore(), assignment.getQuestionLength(), 0);
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

const getStudentAnswer = function(userId, questionIdList){
    let results = questionIdList.map((questionId)=>{
        return mongooseHelper.findResponse(userId,questionId)
            .then((response)=>{
                //如果response为空，那么需要返回的就是question就足够了
                if(!response){
                    return {
                        'questionId':questionId,
                        'studentAnswer':''
                    }
                }
                else {
                    return {
                        'questionId':questionId,
                        'studentAnswer':response.content
                    };
                }
            })
    });
    return Promise.all(results);
};

const getSpendTime = function(grade){
    if(grade){
        return grade.spendTime || 0;
    }
    else {
        return 0;
    }
};

const getMarkScore = function(grade) {
    if(!grade){
        return [];
    }
    else{
        let scoreList = new Array();
        log.info(grade.responseList);
        for(let mResponse of grade.responseList){
            scoreList.push({
                'questionId': mResponse.questionId,
                'score': mResponse.score
            })
        }
        return scoreList;
    }
};

const updateGradeSpendTime = function (assignmentId, studentId, time) {
    return mongooseHelper.findGrade(studentId, assignmentId)
        .then((grade)=>{
            if(grade){
                grade.spendTime = time;
            }
            else {
                grade = new Grade();
                grade.assignmentId = assignmentId;
                grade.studentId = studentId;
                grade.spendTime = time;
            }

            return mongooseHelper.insertGrade(grade);
        })
};

const updateStudentAnswer = function (classId, assignmentId, questionId, studentId, studentAnswer) {
    let mResponse = new ResponseToQuestion();
    mResponse.creator = studentId;
    mResponse.class = classId;
    mResponse.assignment = assignmentId;
    mResponse.question = questionId;
    mResponse.content = studentAnswer;

    let updateAnswer = mongooseHelper.insertResponse(mResponse);
    let addMarkScore = mongooseHelper.findQuestionById(questionId)
        .then(question => {
            if(question.questionType == mConst.QuestionType.TPO_READING_TYPE){
                let score = (question.answer == studentAnswer)?question.score:0;
                return addMarkingScore(assignmentId,questionId, studentId, score);
            }
        });
    //只需要返回第1个参数
    return Promise.all([updateAnswer, addMarkScore])
        .then(data => data[0]);

};

// const getLastAnswerList = function (assignment, studentId) {
//     let groupList$ = assignment.questionGroupList.map(group => {
//         let questionList$ = group.questionList.map((question) => {
//             return getLastAnswerItem(question._id, studentId)
//                 .then((content) => {
//                     question.lastAnswer = content;
//                     return question;
//                 });
//         });
//
//         return Promise.all(questionList$).then(questionList => {
//             group.questionList = questionList;
//             return group;
//         })
//     });
//
//     return Promise.all(groupList$).then(groupList => {
//         assignment.questionGroupList = groupList;
//         return assignment;
//     });
// };
//
// const getLastAnswerItem = function (questionId, studentId){
//     return mongooseHelper.findResponse(studentId,questionId)
//         .then((response)=>{
//             //如果response为空，那么需要返回的就是question就足够了
//             if(!response){
//                 return '';
//             }
//             else {
//                 return response.content;
//             }
//         })
// };
//
// const getMarkingScoreList = function (assignment, studentId) {
//     let groupList$ = assignment.questionGroupList.map(group => {
//         let questionList$ = group.questionList.map((question) => {
//             return getMarkingScoreItem(assignment._id, question._id, studentId)
//                 .then((score) => {
//                     question.markingScore = score;
//                     return question;
//                 });
//         });
//
//         return Promise.all(questionList$).then(questionList => {
//             group.questionList = questionList;
//             return group;
//         })
//     });
//
//     return Promise.all(groupList$).then(groupList => {
//         assignment.questionGroupList = groupList;
//         return assignment;
//     });
//
// };
//
// const getMarkingScoreItem = function (assignmentId, questionId, studentId) {
//     return mongooseHelper.findGrade(studentId, assignmentId)
//         .then(grade=>{
//             if(grade){
//                 for(let mResponse of grade.responseList){
//                     if(mResponse.questionId.toString() == questionId.toString()){
//                         return mResponse.score;
//                     }
//                 }
//
//                 log.info('找不到这个question');
//                 return -1;
//             }
//             else {
//                 return -1;
//             }
//         })
// };

const addMarkingScore = function (assignmentId,questionId,userId,score){
    console.log("********改一下分"+score);
    return mongooseHelper.findGrade(userId,assignmentId)
        .then((grade)=>{
            if(grade){
                let hasResponse = 0;
                //如果grade里面已经有过这个response，那么update就行了
                grade.responseList.forEach(function(response){
                    if(response.questionId.toString()==questionId) {
                        hasResponse++;
                        console.log("找到了这个response，score改为"+score);
                        response.score = score;
                    }
                });
                //如果没有出现过这个response
                if(hasResponse == 0) {
                    console.log("没有这个response，score设置成"+score);
                    grade.responseList.push({
                        'questionId': questionId,
                        'score': score
                    });
                }
            }
            else {
                //没有这个grade，所以创建一个
                console.log('没有这个grade，创建一下');
                grade = new Grade();
                grade.studentId = userId;
                grade.assignmentId = assignmentId;
                grade.responseList.push({
                    'questionId': questionId,
                    'score': score
                });
            }
            return mongooseHelper.insertGrade(grade);
        });
};

