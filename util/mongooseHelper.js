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
                console.log(mClass);
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

module.exports.findGrade = function (studentId, assignmentId) {
    return new Promise(function(resolve, reject){
        Grade.findOne({'studentId':studentId,'assignmentId':assignmentId})
            .exec(function (err, grade) {
                if(err){
                    console.error("findGrade,err:"+err);
                    reject({error:err});
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

module.exports.insertResponse = function (response) {
    return new Promise((resolve, reject)=>{
        //如果已经存在了这次回答，那么只需要更新一下content即可
        //否则会出现同一人对同一题的多次回答
        ResponseToQuestion.findOne({'creator':response.creator,'question':response.question})
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
                    response.save(function (err) {
                        if(err){
                            console.error("insertResponse,err:"+err);
                            reject({error:err});
                        } else{
                            resolve(response);
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

/**
 * 存储一个新的question，同时也要修改assignment
 * @param newQuestion
 * @param assignment
 * @returns {Promise.}
 */
module.exports.insertQuestion = function(newQuestion, assignment){
    return new Promise((resolve, reject)=>{
        newQuestion.save(function (err) {
            if(err){
                console.error("insertQuestion,err:"+err);
                reject(err);
            } else {
                //更新assignment的列表
                assignment.questionList.push(newQuestion);
                assignment.totalScore += newQuestion.score;
                assignment.save((err)=>{
                    if(err){
                        console.error("insertQuestion,err:"+err);
                        reject(err);
                    } else{
                        resolve(newQuestion, assignment);
                    }
                });
            }
        });
    });
};

module.exports.findClassListByUser = function(userId){
    return new Promise((resolve, reject)=>{
        Class.find({$or:[{studentList:userId},{teacherList:userId}]},function (err, classes) {
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
        Class.find({name:regExp},function(err,mClasses){
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
            } else{
                resolve(assignment);
            }
        })
    })
};

module.exports.findAssignmentById = function (assignmentId) {
    return new Promise((resolve, reject)=>{
        Assignment.findById(assignmentId, function (err, assignment) {
            if(err){
                reject(err);
            } else{
                resolve(assignment);
            }
        })
    });
};

module.exports.findResponse = function(userId, questionId){
    return new Promise((resolve,reject)=>{
        ResponseToQuestion.findOne({creator:userId,question:questionId})
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
