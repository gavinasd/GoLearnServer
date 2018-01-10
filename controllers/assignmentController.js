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
let IndependentWritingQuestion = mongoose.model('IndependentWritingQuestion');
let IntegratedWritingQuestion = mongoose.model('IntegratedWritingQuestion');
let TpoListeningQuestion = mongoose.model('TpoListeningQuestion');
let TpoSpeakingQuestion = mongoose.model('TpoSpeakingQuestion');
let Grade = mongoose.model('Grade');

/**-----------------------------------------------------------------------
 * 获取作业信息
 **---------------------------------------------------------------------*/
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

/**-----------------------------------------------------------------------
 * 获取学生的做题信息，学生提交作业
 **---------------------------------------------------------------------*/

/**
 * 获取一个assignment的与学生相关的内容，分别是上次做过的答案，分数和做题时间
 * @param req   userId，学生Id, assignmentId, 作业Id
 * @param res
 */
module.exports.getAssignmentInfo = function (req, res) {
    let classId = req.params.classId;
    let assignmentId = req.params.assignmentId;
    let studentId = req.params.studentId;
    let studentAnswer, markScore, spendTime;

    if(!studentId || !assignmentId || !classId){
        util.errorWithParameters(res);
        return;
    }

    mongooseHelper.findAssignmentById(assignmentId)
        .then((assignment) => {
            let questionList = assignment.getQuestionList();
            log.info(questionList);
            return getStudentAnswer(classId, studentId, assignment.getQuestionList());
        })
        .then(answers =>{
            studentAnswer = answers;
            return mongooseHelper.findGrade(classId,studentId,assignmentId);
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
};

module.exports.submitAssignmentInfo = function(req, res){
    log.info('********submiting info');
    log.info(req.body);
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
            taskList = taskList.concat([updateAnswer]);
        }
        if(spendTime) {
            let updateSpendTime = updateGradeSpendTime(classId, assignmentId, studentId, spendTime);
            taskList = taskList.concat([updateSpendTime]);
        }
        if(markScore) {
            let updateMarkScore = addMarkingScore(classId, assignmentId, questionId, studentId, markScore);
            taskList = taskList.concat([updateMarkScore]);
        }

        return Promise.all(taskList);
    }).then((data)=>{
        util.sendJSONresponse(res, 200, {
            "data":data
        });
    }).catch((err)=>{
        console.error(err);
        util.sendJSONresponse(res, 404, {
            "errmsg":err
        });
    });
};

module.exports.submitAssignmentDone = function (req, res) {
    log.info('********submitting done');
    log.info(req.body);

    const classId = req.body.classId;
    const studentId = req.body.studentId;
    const assignmentId = req.body.assignmentId;
    if(!studentId || !assignmentId){
        util.errorWithParameters(res);
    }

    mongooseHelper.findGrade(classId, studentId, assignmentId)
        .then((grade)=>{
            if(grade){
                grade.done = true;
                return mongooseHelper.insertGrade(grade);
            }
        })
        .then((grade)=>{
            util.sendJSONresponse(res, 200, {
                "grade":grade
            });
        }).catch((err)=>{
        console.error(err);
        util.sendJSONresponse(res, 404, {
            "errmsg":err
        });
    });
};


/**-----------------------------------------------------------------------
 * 编辑一份新的作业，包括创建作业，添加group，添加question，更新groupContent
 **---------------------------------------------------------------------*/

/**
 * 新建作业的接口
 */
module.exports.createAssignment = function(req, res){
    log.info("****creating assignment");
    let creator = req.body.creator;
    let assignmentName = req.body.assignmentName;
    let type = req.body.type;
    log.info(creator + " " + assignmentName + " "+ type);

    if(!creator || !assignmentName || !type){
        util.errorWithParameters(res);
        return 0;
    }

    let newAssignment = new Assignment({
        'creator': creator,
        'assignmentName': assignmentName,
        'type': type
    });

    mongooseHelper.createAssignment(newAssignment)
        .then(
            ()=> {
                util.sendJSONresponse(res, 200 , {
                    'assignment': newAssignment
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

/**
 * 添加题目到questionGroup中
 */
module.exports.addQuestionToGroup = function(req, res){
    console.log("****");
    console.log("adding question");
    const assignmentId = req.body.assignmentId;
    const groupId = req.body.groupId;
    const quest = req.body.question;
    const userId = quest.creator;
    const questionType = quest.questionType;
    const index = req.body.index;

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
            case mConst.QuestionType.TPO_READING_SINGLE_CHOICE_TYPE:
            case mConst.QuestionType.TPO_READING_INSERT_CHOICE_TYPE:
            case mConst.QuestionType.TPO_READING_TOPIC_TYPE:
            case mConst.QuestionType.TPO_READING_MULTIPLE_TYPE:
            case mConst.QuestionType.TPO_READING_CATEGORY_TYPE:
                addTpoReadingQuestion(quest, res, assignment, groupId, userId, index);
                break;
            case mConst.QuestionType.VOCABULARY_TYPE:
                addVocabularyQuestion(quest, res, assignment, groupId,userId, index);
                break;
            case mConst.QuestionType.INDEPENDENT_WRITING_TYPE:
                addIndependentWritingQuestion(quest, res, assignment, groupId, userId, index);
                break;
            case mConst.QuestionType.INTEGRATED_WRITING_TYPE:
                addIntegratedWritingQuestion(quest, res, assignment, groupId, userId, index);
                break;
            case mConst.QuestionType.TPO_LISTENING_SINGLE_CHOICE_TYPE:
            case mConst.QuestionType.TPO_LISTENING_MULTIPLE_CHOICE_TYPE:
            case mConst.QuestionType.TPO_LISTENING_REPEAT_QUESTION:
            case mConst.QuestionType.TPO_LISTENING_TABLE_CHOICE_QUESTION:
            case mConst.QuestionType.TPO_LISTENING_SEQUENCE_TYPE:
                addTpoListeningQuestion(quest, res, assignment, groupId, userId, index);
                break;
            case mConst.QuestionType.TPO_SPEAKING_Q1Q2_QUESTION:
            case mConst.QuestionType.TPO_SPEAKING_Q3Q4_QUESTION:
            case mConst.QuestionType.TPO_SPEAKING_Q5Q6_QUESTION:
                addTpoSpeakingQuestion(quest, res, assignment, groupId, userId, index);
                break;

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
 * 改变已有的question里面的内容
 */
module.exports.updateQuestion = function(req, res){
    const questionId = req.body.questionId;
    const userId = req.body.userId;
    const quest = req.body.question;

    if(!questionId || !userId ){
        util.errorWithParameters(res);
        return 0;
    }

    mongooseHelper.findQuestionById(questionId)
        .then((question)=>{
            if(question.creator != userId){
                util.sendJSONresponse(res, 404, {
                    "errmsg":"修改失败，你没权修改这个题目"
                });
                return;
            }

            for(let key of Object.keys(quest)){
                question[key] = quest[key];
            }
            return mongooseHelper.saveQuestion(question);
        })
        .then((question)=>{
            util.sendJSONresponse(res, 200, {
                'question':question
            });
        })
        .catch((err)=>{
            log.error(err);
            util.sendJSONresponse(res, 404, {
                "errmsg":err
            });
        });};


/**
 * 删除掉一个group
 */
module.exports.deleteGroup = function(req, res){
    console.log("*****delete group");
    const assignmentId = req.params.assignmentId;
    const groupId = req.params.groupId;
    const userId = req.params.userId;
    let thatAssignment;

    if(!assignmentId || !groupId || !userId){
        util.errorWithParameters(res);
    }

    mongooseHelper.findAssignmentById(assignmentId, {path:'questionGroupList.questionList'})
        .then(assignment => {
            if(assignment.creator != userId) {
                throw ("你无权删除这个题目");
            }
            if(!assignment.isGroupIn(groupId)){
                throw ("参数错误");
            }

            thatAssignment = assignment;
            let results = assignment.questionGroupList.id(groupId).questionList
                .map(question => {
                    return mongooseHelper.deleteQuestion(assignment, question);
                });
            return Promise.all(results);
        })
        .then(() => {
            thatAssignment.questionGroupList = thatAssignment.questionGroupList.filter(item =>{
                return item._id.toString() !== groupId;
            });
            console.log(thatAssignment);
            return mongooseHelper.saveAssignment(thatAssignment);
        })
        .then(assignment => {
            util.sendJSONresponse(res, 200, {
                "assignment" : assignment
            })
        })
        .catch((err)=>{
            log.error(err);
            util.sendJSONresponse(res, 404, {
                "errmsg":err
            });
        });
};


/**
 * 删除掉一个题目
 */
module.exports.deleteQuestion = function(req, res){
    console.log("******delete question");
    const assignmentId = req.params.assignmentId;
    const questionId = req.params.questionId;
    const userId = req.params.userId;
    let thatAssignment;

    if(!assignmentId || !questionId ||!userId){
        util.errorWithParameters(res);
        return;
    }

    mongooseHelper.findAssignmentById(assignmentId)
        .then(assignment => {
            if(assignment.creator != userId) {
                util.sendJSONresponse(res, 404, {
                    "errmsg": '你无权删除这个题目'
                });
                return;
            }

            if(!assignment.isQuestionIn(questionId)){
                util.sendJSONresponse(res, 404, {
                    "errmsg": "参数错误"
                });
                return ;
            }

            thatAssignment = assignment;
            return mongooseHelper.findQuestionById(questionId);
        })
        .then(question => {
            if(question.creator != userId ){
                util.sendJSONresponse(res, 404, {
                    "errmsg": '你无权删除这个题目'
                });
                return;
            }

            return mongooseHelper.deleteQuestion(thatAssignment, question);
        })
        .then(assignment => {
            util.sendJSONresponse(res, 200, {
                "assignment" : assignment
            })
        })
        .catch((err)=>{
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

module.exports.getMarkingScore = function (req, res) {
    console.log("********getting score");
    const classId = req.params.classId;
    let assignmentId = req.params.assignmentId;
    let userId = req.params.userId;

    if(!assignmentId || !userId){
        util.errorWithParameters(res);
        return;
    }

    mongooseHelper.findGrade(classId,userId,assignmentId)
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

    const classId = req.params.classId;
    let assignmentId = req.params.assignmentId;
    let userId = req.params.userId;

    if(!assignmentId || !userId){
        util.errorWithParameters(res);
        return;
    }

    mongooseHelper.findGrade(classId, userId,assignmentId)
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


let addQuestion = function (newQuestion, assignment, groupId, res, index){
    mongooseHelper
        .insertQuestionToGroup(newQuestion,assignment, groupId, index)
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
let addTpoReadingQuestion = function (quest, res, assignment, groupId, userId, index) {
    let paragraph = quest.paragraph;
    let question = quest.question;
    let options = quest.options;
    let answer = quest.answer;
    let score = quest.score;
    let type = quest.questionType;
    let explanation = quest.explanation;

    let newQuestion = new TpoReadingQuestion({
        creator:userId,
        questionType:type,
        paragraph:paragraph,
        question:question,
        options:options,
        answer:answer,
        explanation:explanation,
        score:score
    });
    addQuestion(newQuestion, assignment, groupId, res, index);
};

/**
 * 添加单词题目
 */
let addVocabularyQuestion = function (quest, res, assignment, groupId, userId, index){
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

    addQuestion(newQuestion, assignment, groupId, res, index);
};


/**
 * 添加独立写作题目
 */
let addIndependentWritingQuestion = function (quest, res, assignment, groupId, userId, index){
    let question = quest.question;
    let answer = quest.answer;
    let score = quest.score;

    let newQuestion = new IndependentWritingQuestion({
        creator:userId,
        questionType:mConst.QuestionType.INDEPENDENT_WRITING_TYPE,
        question:question,
        answer:answer,
        score:score
    });

    addQuestion(newQuestion, assignment, groupId, res, index);
};

/**
 * 添加综合写作题目
 */
let addIntegratedWritingQuestion = function(quest, res, assignment, groupId, userId, index){
    let answer = quest.answer;
    let score = quest.score;

    let newQuestion = new IntegratedWritingQuestion({
        creator: userId,
        questionType: mConst.QuestionType.INTEGRATED_WRITING_TYPE,
        answer: answer,
        score: score
    });

    addQuestion(newQuestion, assignment, groupId, res, index);
};

/**
 *
 * 添加TPO听力题目
 */
let addTpoListeningQuestion = function(quest, res, assignment, groupId, userId, index){
    let recordUrl = quest.recordUrl;
    let question = quest.question;
    let type = quest.questionType;
    let options = quest.options;
    let answer = quest.answer;
    let score = quest.score;
    let explanation = quest.explanation;

    let newQuestion = new TpoListeningQuestion({
        creator:userId,
        questionType:type,
        recordUrl:recordUrl,
        question:question,
        type:type,
        options:options,
        answer:answer,
        explanation:explanation,
        score:score
    });
    addQuestion(newQuestion, assignment, groupId, res, index);
};

/**
 *
 * 添加TPO口语题目
 */
let addTpoSpeakingQuestion = function(quest, res, assignment, groupId, userId, index){
    let type = quest.questionType;
    let recordUrl = quest.recordUrl;
    let question = quest.question;
    let passage = quest.passage;
    let answer = quest.answer;
    let score = quest.score;
    let explanation = quest.explanation;

    let newQuestion = new TpoSpeakingQuestion({
        creator:userId,
        questionType:type,
        recordUrl:recordUrl,
        question:question,
        passage:passage,
        type:type,
        answer:answer,
        explanation:explanation,
        score:score
    });
    addQuestion(newQuestion, assignment, groupId, res, index);
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

const getStudentAnswer = function(classId, userId, questionIdList){
    let results = questionIdList.map((questionId)=>{
        return mongooseHelper.findResponse(classId, userId,questionId)
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
            scoreList = scoreList.concat([{
                'questionId': mResponse.questionId,
                'score': mResponse.score
            }]);
        }
        return scoreList;
    }
};

const updateGradeSpendTime = function (classId, assignmentId, studentId, time) {
    console.log('***update spendTime');
    return mongooseHelper.findGrade(classId, studentId, assignmentId)
        .then((grade)=>{
            if(grade){
                if(time > (grade.spendTime || 0)) {
                    grade.spendTime = time;
                }
            }
            else {
                console.log('没有这个grade，创建一下');
                grade = new Grade();
                grade.classId = classId;
                grade.assignmentId = assignmentId;
                grade.studentId = studentId;
                grade.spendTime = time;
            }

            return mongooseHelper.insertGrade(grade);
        })
};

const updateStudentAnswer = function (classId, assignmentId, questionId, studentId, studentAnswer) {
    console.log('***update answer');
    let mResponse = new ResponseToQuestion();
    mResponse.creator = studentId;
    mResponse.classId = classId;
    mResponse.assignment = assignmentId;
    mResponse.question = questionId;
    mResponse.content = studentAnswer;

    return mongooseHelper.insertResponse(mResponse)
        .then(data=>{
            return mongooseHelper.findQuestionById(questionId);
        })
        .then(question => {
            let score = 0;
            if(question.questionType == mConst.QuestionType.TPO_READING_SINGLE_CHOICE_TYPE
                || question.questionType == mConst.QuestionType.TPO_READING_INSERT_CHOICE_TYPE
                || question.questionType == mConst.QuestionType.TPO_READING_MULTIPLE_TYPE
                || question.questionType == mConst.QuestionType.TPO_READING_CATEGORY_TYPE
                || question.questionType == mConst.QuestionType.TPO_LISTENING_SINGLE_CHOICE_TYPE
                || question.questionType == mConst.QuestionType.TPO_LISTENING_MULTIPLE_CHOICE_TYPE
                || question.questionType == mConst.QuestionType.TPO_LISTENING_REPEAT_QUESTION
                || question.questionType == mConst.QuestionType.TPO_LISTENING_TABLE_CHOICE_QUESTION
                || question.questionType == mConst.QuestionType.TPO_LISTENING_SEQUENCE_TYPE
            ){
                score = (question.answer == studentAnswer)?question.score:0;
            }

            if(question.questionType == mConst.QuestionType.TPO_READING_TOPIC_TYPE){
                let count = 0;
                console.log(question.answer.split(''));
                for(let choice of question.answer.split('')){
                    console.log('choice:'+choice);
                    if(studentAnswer.includes(choice)){
                        count ++;
                    }
                }

                if(count == 3){
                    score = 2;
                }
                else if (count == 2){
                    score = 1;
                }
            }

            return addMarkingScore(classId,assignmentId,questionId, studentId, score);

        });
};

const addMarkingScore = function (classId, assignmentId,questionId,userId,score){
    console.log("********改一下分"+score);
    return mongooseHelper.findGrade(classId, userId,assignmentId)
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
                    grade.responseList = grade.responseList.concat([{
                        'questionId': questionId,
                        'score': score
                    }]);
                }
            }
            else {
                //没有这个grade，所以创建一个
                console.log('没有这个grade，创建一下');
                grade = new Grade();
                grade.classId = classId;
                grade.studentId = userId;
                grade.assignmentId = assignmentId;
                grade.responseList = grade.responseList.concat([{
                    'questionId': questionId,
                    'score': score
                }]);
            }
            return mongooseHelper.insertGrade(grade);
        });
};

// /**
//  * 作业添加回答
//  * @param req
//  * @param res
//  */
// module.exports.addResponseToQuestion = function (req, res) {
// 	console.log("****adding response");
//     let userId = req.body.userId;
// 	let classId = req.body.classId;
// 	let assignmentId = req.body.assignmentId;
// 	let questionId = req.body.questionId;
// 	let content = req.body.content;
// 	let spendTime = req.body.time;
//     let mResponse = new ResponseToQuestion();
//     let mQuestion = new Question();
//
// 	if(!userId || !assignmentId || !classId || !questionId || !content){
// 		util.errorWithParameters(res);
// 		return 0;
// 	}
//
// 	mongooseHelper.findClassById(classId,{path:'assignmentList'}).then((mClass)=>{
//         //判断该班级中是否有这个学生和这个作业
//         if(!mClass.isUserIn(userId)){
//             util.sendJSONresponse(res, 404, {
//                 "errmsg":"你不在该班级中"
//             });
//             return 0;
//         } else if (!mClass.isAssignmentIn(assignmentId)){
//             util.sendJSONresponse(res, 404, {
//                 "errmsg":"找不到该作业"
//             });
//             return 0;
//         }
//
//         //判断作业中有没有这个题目
//         let assignment = mClass.findAssignmentById(assignmentId);
//         if(!assignment.isQuestionIn(questionId)){
//             util.sendJSONresponse(res, 404 , {
//                 "errmsg": "找不到该题目"
//             });
//             return 0;
//         }
//         mResponse.creator = userId;
//         mResponse.classId = classId;
//         mResponse.assignment = assignmentId;
//         mResponse.question = questionId;
//         mResponse.content = content;
//
//         return mongooseHelper.insertResponse(mResponse);
//     }).then((response)=>{
//         console.log(response.content);
//         return mongooseHelper.findQuestionById(response.question);
// 	}).then((question)=>{
// 	    mQuestion = question;
//         return updateGradeSpendTime(classId, assignmentId, userId, spendTime);
//     }).then(()=>{
// 	    //可以自动判断答案的类型，可以直接插入成绩
//         console.log(mQuestion.questionType,mQuestion.answer);
//         let score;
//         if(mQuestion.questionType == mConst.QuestionType.TPO_READING_TYPE){
//             score = (mQuestion.answer == content)?mQuestion.score:0;
//         }
//         return addMarkingScore(classId, assignmentId,questionId,userId, score);
//     }).then(()=>{
// 	    util.sendJSONresponse(res, 200, {
// 	        "response":mResponse,
//         });
//     }).catch((err)=>{
// 	    console.error(err);
// 	    util.sendJSONresponse(res, 404, {
// 	        "errms":err
//         });
//     });
//
// };

// module.exports.addMarkingScoreToQuestion = function(req, res){
//     console.log("*********adding Marking score");
//     let userId = req.body.userId;
//     let classId = req.body.classId;
//     let assignmentId = req.body.assignmentId;
//     let questionId = req.body.questionId;
//     let score = req.body.score;
//
//     console.log(!score);
//     if(!userId || !assignmentId || !classId || !questionId){
//         util.errorWithParameters(res);
//         return 0;
//     }
//
//     addMarkingScore(assignmentId, questionId, userId, score)
//         .then((grade)=>{
//             console.log(grade);
//             util.sendJSONresponse(res, 200, {
//                 'grade':grade
//             });
//         })
//         .catch((err)=>{
//             console.log(err);
//         });
// };

/**
 * 找出学生做过的题目，还有答案，可做对比
 * @param req
 * @param res
 */
// module.exports.findAssignmentGradeDetail= function(req,res){
//     log.debug("finding assignment and grade detail");
//     let userId = req.params.userId;
//     let assignmentId = req.params.assignmentId;
//     if(!userId || !assignmentId){
//         util.errorWithParameters(res);
//     }
//
//     mongooseHelper.findAssignmentById(assignmentId)
//         .then((assignment)=>{
//             return assignment.getQuestionList();
//         })
//         .then((questionList)=>{
//             return returnQuestionResponse(userId,questionList);
//         })
//         .then((results)=>{
//             util.sendJSONresponse(res,200,{
//                 results
//             });
//         },(err)=>{
//             log.error(err);
//             util.sendJSONresponse(res,404,{
//                 "errmsg":err
//             });
//         })
//
// };