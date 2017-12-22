/**
 * mongooseHelper 主要为了把部分mongoose操作promise化，减少回调地狱
 */
"use strict";

let mongoose = require('mongoose');
let User = mongoose.model('User');
let Class = mongoose.model('Class');
let Grade = mongoose.model('Grade');
let ResponseToQuestion = mongoose.model('ResponseToQuestion');
let Question = mongoose.model('Question');
let Assignment = mongoose.model('Assignment');
let Log = require('log');
let log = new Log('debug');

let Promise = require('bluebird');
mongoose.Promise = Promise;

module.exports.findClassById = function(id,populationOps){
    return new Promise(function (resolve, reject) {
        let collection = Class.findById(id);
        if(populationOps){
            collection = collection.populate(populationOps);
        }
        collection.exec(function (err, mClass) {
            if (err) {
                console.error("findClassById,err:" + err);
                reject({error: err})
            } else if (!mClass) {
                reject({error: "找不到该班级"});
            }
            else {
                resolve(mClass);
            }
        });
    });

};

module.exports.findClass = function(query, populationOps){
    return new Promise(function(resolve, reject){
        Class.find(query)
            .populate(populationOps)
            .exec(function(err, mClass){
            if(err){
                console.error("findClass,err:"+err);
                reject({error:err})
            }
            else {
                resolve(mClass);
            }
        });
    });
};

module.exports.classAddAssignment = function (mClass,assignmentId) {
    return new Promise((resolve,reject)=>{
        mClass.assignmentList.push(assignmentId);
        mClass.save(function(err){
            if(err){
                reject(err);
            }
            resolve(mClass);
        })
    })
};

module.exports.findGrade = function (classId, studentId, assignmentId) {
    return new Promise(function(resolve, reject){
        Grade.findOne({'classId':classId, 'studentId':studentId, 'assignmentId':assignmentId})
            .exec(function (err, grade) {
                if(err){
                    throw('数据库查找有误');
                } else {
                    resolve(grade);
                }
            });
    });
};

module.exports.findQuestionById = function(questionId){
    return new Promise((resolve,reject)=>{
        Question.findById(questionId).exec((err, question)=>{
            if(err){
                console.error("findQuestionById,err:"+err);
                reject({error:err});
            } else{
                resolve(question);
            }
        });
    });
};

module.exports.saveQuestion = function (question) {
    return new Promise((resolve, reject)=>{
        question.save(function (err, updatedQuestion) {
            if(err){
                log.error("save Question, err:"+err);
                reject({error:err});
            }
            else {
                resolve(updatedQuestion);
            }
        });
    });
};

module.exports.insertResponse = function (response) {
    return new Promise((resolve, reject)=>{
        //如果已经存在了这次回答，那么只需要更新一下content即可
        //否则会出现同一人对同一题的多次回答
        ResponseToQuestion
            .findOne({'creator':response.creator, 'question':response.question, 'classId':response.classId})
            .exec(function(err,oldResponse){
                if(err){
                    console.error("insertResponse,err:"+err);
                    reject({error:err});
                }
                else if (oldResponse){
                    //已经一个response了
                    oldResponse.content = response.content;
                    oldResponse.save(function(err){
                        if(err){
                            console.error("insertResponse,err:"+err);
                            reject({error:err});
                        } else{
                            resolve(response);
                        }
                    });
                }
                else{
                    //并没有oldResponse，直接save
                    console.log('一个新的response');
                    response.save(function (err) {
                        if(err){
                            console.error("insertResponse,err:"+err);
                            reject({error:err});
                        } else{
                            //如果这是一个新的response，那么则意味着grade的responseList中没有这个数据
                            const classId = response.classId;
                            const questionId = response.question;
                            const assignmentId = response.assignment;
                            const userId = response.creator;

                            Grade.findOne({'classId':classId, 'studentId':userId,'assignmentId':assignmentId})
                                .exec(function (err, grade) {
                                    if(err){
                                        throw('数据库查找有误');
                                    } else {
                                        if(grade){
                                            grade.responseList.push({
                                                'questionId': questionId,
                                                'score': -1
                                            });

                                        }
                                        else {
                                            //没有这个grade，所以创建一个
                                            console.log('没有这个grade，创建一下');
                                            grade = new Grade();
                                            grade.classId = classId;
                                            grade.studentId = userId;
                                            grade.assignmentId = assignmentId;
                                            grade.responseList.push({
                                                'questionId': questionId,
                                                'score': -1
                                            });
                                        }

                                        grade.save(function(err){
                                            if(err){
                                                throw('数据库查找有误');
                                            }

                                            resolve(response);
                                        });
                                    }
                                });
                        }
                    });
                }
            });
    });
};

module.exports.insertGrade = function(grade){
    return new Promise((resolve,reject)=>{
        grade.save((err)=>{
            if(err){
                console.error("insertGrade,err:"+err);
                reject({error:err});
            } else{
                resolve(grade);
            }
        });
    });
};

module.exports.findClassListByUser = function(userId){
    return new Promise((resolve, reject)=>{
        Class.find({$or:[{studentList:userId},{teacherList:userId}]})
            .populate({path:'teacherList'})
            .exec(function (err, classes) {
            if(err){
                reject(err);
            } else {
                resolve(classes);
            }
        });
    })
};

module.exports.searchClassByName = function(className){
    return new Promise((resolve,reject)=>{
        let regExp = new RegExp('.*?'+className+'.*?','i');
        Class.find({name:regExp})
            .populate({path:'teacherList'})
            .exec(function(err,mClasses){
                if(err){
                    reject(err);
                }
                resolve(mClasses);
        })
    })
};

module.exports.findUserById = function (userId) {
    return new Promise((resolve, reject)=>{
        User.findById(userId,function(err,user){
            if(err){
                reject(err);
            } else{
                resolve(user);
            }
        })
    })
};

module.exports.findAllAssignmentList = function(){
    return new Promise((resolve,reject)=>{
        Assignment.find({},function(err,assignmentList){
            if(err){
                reject(err);
            } else{
                resolve(assignmentList);
            }
        });
    });
};

module.exports.findAssignmentById = function (assignmentId, populationOps){
    return new Promise((resolve, reject)=>{
        let collection = Assignment.findById(assignmentId);
        if(populationOps){
            collection = collection.populate(populationOps);
        }
        collection.exec((err, assignment)=> {
            if(err){
                reject(err);
            }
            else if(!assignment){
                reject('没有这个作业');
            }
            else{
                resolve(assignment);
            }
        })
    })
};

module.exports.findResponse = function(classId, userId, questionId){
    return new Promise((resolve,reject)=>{
        ResponseToQuestion.findOne({creator:userId,classId:classId,question:questionId})
            .populate({path:'question'})
            .exec((err, question)=>{
                if(err){
                    log.err(err);
                    reject(err);
                }else{
                    resolve(question);
                }
            });
    });
};

module.exports.createAssignment = function(assignment){
    return new Promise((resolve, reject)=>{
        assignment.save(function(err){
            if(err){
                log.err(err);
                reject(err);
            }
            else{
                resolve();
            }
        });
    });
};

module.exports.saveAssignment = function(assignment) {
    return new Promise((resolve, reject) => {
        assignment.save(function (err) {
            if (err) {
                log.error(err);
                reject(err);
            }
            else {
                resolve(assignment);
            }
        });
    });
}

module.exports.createQuestionGroup = function (questionGroup) {
    return new Promise((resolve, reject)=>{
        questionGroup.save(function(err){
            if(err){
                log.err(err);
                reject(err);
            }
            else{
                resolve();
            }
        });
    });
};

module.exports.insertQuestionGroupToAssignment = function(assignmentId, questionGroup){
    return new Promise((resolve, reject)=>{
        Assignment.findById(assignmentId)
            .exec(function(err,assignment){
                if(err){
                    reject(err);
                }
                else if (!assignment){
                    reject("找不到这个作业")
                }
                else {
                    assignment.questionGroupList.push(questionGroup);
                    let length = assignment.questionGroupList.length;
                    assignment.save((err)=>{
                        if(err){
                            reject(err);
                        } else{
                            resolve(assignment.questionGroupList[length-1]);
                        }
                    })
                }
            });

    });
};

module.exports.insertQuestionToGroup = function(newQuestion, assignment, groupId, index){
    return new Promise((resolve, reject)=>{
        newQuestion.save(function (err) {
            if(err){
                console.error("insertQuestion,err:"+err);
                reject(err);
            } else {
                let questionGroup = assignment.questionGroupList.id(groupId);
                if(!questionGroup){
                    log.error('找不到这个questionGroup');
                    reject('找不到这个questionGroup');
                }
                else{
                    //更新assignment的列表
                    if(!index || index < 0 || index > questionGroup.questionList.length){
                        questionGroup.questionList.push(newQuestion);
                    } else {
                        questionGroup.questionList.splice(index, 0, newQuestion);
                    }
                    questionGroup.totalScore += newQuestion.score;
                    assignment.save((err)=>{
                        if(err){
                            console.error("insertQuestion,err:"+err);
                            reject(err);
                        } else{
                            resolve(newQuestion, assignment);
                        }
                    });
                }
            }
        });
    });
};

module.exports.updateQuestionGroupContent = function (assignmentId, groupId, content) {
    console.log(content);
    return new Promise((resolve, reject)=>{
        Assignment.findById(assignmentId, function (err, assignment) {
            if(err){
                reject(err);
            }
            else if (!assignment){
                reject('没有这个作业');
            }
            else {
                let questionGroup = assignment.questionGroupList.id(groupId);
                questionGroup.content =  content;
                assignment.save(function(err){
                    if(err){
                        reject(err);
                    }
                    else{
                        resolve(assignment);
                    }
                })
            }

        });

    });
};

module.exports.deleteQuestion = function(assignment, question){
    return new Promise((resolve, reject)=>{
        Question.remove({"_id":question._id}, function (err) {
            if(err){
                console.error("deleteQuestion, err:"+err);
                reject({error: err});
            }
            else {
                assignment.questionGroupList = assignment.questionGroupList
                    .map(group => {
                        if(!group.questionList.indexOf(question._id) > 0){
                            return group;
                        }
                        else {
                            group.questionList.remove(question._id);
                            group.totalScore = group.totalScore - question.score;
                            return group;
                        }
                    });
                assignment.save(err => {
                    if(err){
                        console.error("deleteQuestion, err:"+err);
                        reject(err);
                    } else{
                        resolve(assignment);
                    }
                });
            }
        });
    });
};
