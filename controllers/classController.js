"use strict";

let mongoose = require('mongoose');
let util = require('../util/util');
let path = require('path');
let Log = require('log');
let log = new Log('debug');

let User = mongoose.model('User');
let Class = mongoose.model('Class');
let Course = mongoose.model('Course');
let Resource = mongoose.model('Resource');
let Assignment = mongoose.model('Assignment');
let Question = mongoose.model('Question');
let TpoReadingQuestion = mongoose.model('TpoReadingQuestion');
let mongooseHelper = require('../util/mongooseHelper');

class AssignmentInfo{
    constructor(assignmentId,
                assignmentName,
                assignmentType,
                gradeInfoList
    ){
        this.assignmentId = assignmentId;
        this.assignmentName = assignmentName;
        this.assignmentType = assignmentType;
        this.gradeInfoList = gradeInfoList;
    }
};

class GradeInfo{
    constructor(classId,
                studentId,
                studentName,
                studentAvatar,
                score,
                totalScore,
                undoneNum,
                done,
                spendTime
    ){
        this.classId = classId;
        this.studentId = studentId;
        this.studentName = studentName;
        this.studentAvatar = studentAvatar;
        this.score = score;
        this.totalScore = totalScore;
        this.undoneNum = undoneNum;
        this.done = done;
        this.spendTime = spendTime || 0;
    }
};

/**
 * 根据用户ID获取Class列表
 */
module.exports.getClassListByUserId = function (req, res) {
	//获取userid
	let userid = req.params.userId;
	User.findById(userid,function (err, user) {
		if(err){
			util.sendJSONresponse(res,404,{
				"errmsg":"未查询到该用户."
			});
			return 0;
		}

		mongooseHelper.findClassListByUser(user._id)
            .then((classes)=>{
		        classes = classes.map((mClass) =>{
		            mClass.teacherList = mClass.teacherList.map(teacher =>{
		                return {
		                    "nickName": teacher.nickName
                        }
                    });
                    return mClass;
                });
                util.sendJSONresponse(res, 200 , {
                    "count":classes.length,
                    "classes":classes
                });
                return 0;
            }).catch((err)=>{
		        console.log(err);
                util.sendJSONresponse(res, 404, {
                    "errmsg":err.toString()
                });
            });
	});
};

/**
 * 老师创建Class
 */
module.exports.createClassByUserId = function (req, res) {
    //获取userid
    let userid = req.params.userId;
    User.findById(userid, function(err, user) {
        if(err) { //未查询到用户
            util.sendJSONresponse(res,404,{
                "errmsg":"未查询到该用户."
            });
            return 0;
        }
        if(user.userType != 1) { //非老师不能创建
            util.sendJSONresponse(res,404,{
                "errmsg":"您非老师用户，不可创建课程."
            });
            return 0;
        }

        //老师创建课程
        let newClass = new Class();
        newClass.creator = user._id;
        newClass.name = req.body.name; //type:Course尚未添加
        //newClass.type = 'Course';
        newClass.verifier = req.body.verifier;
        newClass.teacherList = [user._id]; //添加创建者老师
        newClass.startTime =  new Date();
        newClass.endTime = new Date();
        newClass.studentList = [];
        newClass.scheduleList = [];
        newClass.assignmentList = [];

        //写入数据库
        newClass.save(function (err) {
            if(err) {
                util.handleSavingError(res, err);
                return;
            }

            util.sendJSONresponse(res, 200 , {
                "class":newClass
            });
            return 0;
        });
    });
};

/**
 * 根据ClassId获取Class详情
 */
module.exports.getClassDetailByClassId = function(req,res){
	//获取classId
	let classId = req.params.classId;
	let userId = req.params.userId;
	if(!classId || !userId){
		util.errorWithParameters(res);
		return 0;
	}

	//寻找class信息
	mongooseHelper.findClassById(classId,{path:'teacherList studentList'})
        .then((mClass)=>{
            if(!mClass.isUserIn(userId)){
                util.sendJSONresponse(res,404,{
                    "errmsg":"你不在此课程中."
                });
                return 0;
            }

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
 * 通过班号搜索班级
 */
module.exports.classSearchByName = function (req, res) {
    console.log("searching classes...");
    let className = req.params.name;

    if(!className){
        util.errorWithParameters(res);
    }

    mongooseHelper.searchClassByName(className)
        .then((classes)=>{
            util.sendJSONresponse(res, 200, {
                'classes':classes
            });
        }).catch((err)=>{
        util.sendJSONresponse(res,404,{
            "errmsg":err
        });
    });
};

/**-----------------------------------------------------------------------
 * 管理班级里面的用户
 **---------------------------------------------------------------------*/

/**
 * 获取一个班级里面的所有用户：老师+学生
 */
module.exports.classGetAllUser = function(req,res){
    let classId = req.params.classId;
    let userId = req.params.userId;
    if(!classId || !userId){
        util.errorWithParameters(res);
        return;
    }

    mongooseHelper.findClassById(classId,{path:'teacherList studentList'})
        .then((mClass)=>{
            if(!mClass){
                util.sendJSONresponse(res, 404, {
                    "errmsg":"找不到该班级"
                });
                return 0;
            }

            if(!mClass.isUserIn(userId)){
                util.sendJSONresponse(res, 404, {
                    "errmsg":"你不在该班级中"
                });
                return 0;
            }

            util.sendJSONresponse(res,200,{
                'teacherList':mClass.teacherList,
                'studentList':mClass.studentList
            });
            return ;
        })
        .catch((err)=>{
            util.sendJSONresponse(res,404,{
                "errmsg":err
            });
        });
};

/**
 * 添加/移除学生
 */
module.exports.classAddStudent = function (req, res) {
    let classId = req.body.classId;
    let studentId = req.body.studentId;
    let verifyCode = req.body.verifyCode;
    if(!studentId || !classId){
        util.errorWithParameters(res);
        return 0;
    }

    Class.findById(classId,function(err,mClass){
        if(err || !mClass){
            console.log(err);
            console.log(mClass);
            util.sendJSONresponse(res, 404, {
                "errmsg":"找不到该班级"
            });
            return 0;
        }

        if(mClass.verifier !== verifyCode){
            util.sendJSONresponse(res, 404, {
                "errmsg":"邀请码错误"
            });
            return 0;
        }

        if(!mClass.isStudentIn(studentId)){
            mClass.studentList.push(studentId);
            mClass.save(function (err) {
                if(err){
                    util.handleSavingError(res, err);
                    return 0;
                }
                util.sendJSONresponse(res, 200, {
                    "class":mClass
                });
            });
        } else {
            //该用户已经处在在class中，直接返回
            util.sendJSONresponse(res, 200, {
                "class":mClass
            });
        }
    });
};

module.exports.classDelStudent = function (req, res) {
    let classId = req.body.classId;
    let studentId = req.body.studentId;
    if(!studentId || !classId){
        util.errorWithParameters(res);
        return 0;
    }

    Class.findById(classId,function(err,mClass){
        if(err || !mClass){
            util.sendJSONresponse(res, 404, {
                "errmsg":"找不到该班级"
            });
            return 0;
        }

        if(mClass.isStudentIn(studentId)){
            mClass.studentList.splice(mClass.studentList.indexOf(studentId),1);
            mClass.save(function (err) {
                if(err){
                    util.handleSavingError(res, err);
                    return 0;
                }

                util.sendJSONresponse(res, 200, {
                    "class":mClass
                });
            });
        }else {
            //该用户已经不在class中，直接返回
            util.sendJSONresponse(res, 200, {
                "class":mClass
            });
        }
    });
};

/**
 * 添加/移除老师
 */
module.exports.classAddTeacher = function (req, res) {
    let classId = req.body.classId;
    let teacherId = req.body.teacherId;
    if(!teacherId || !classId){
        util.errorWithParameters(res);
        return 0;
    }

    Class.findById(classId,function(err,mClass){
        if(err || !mClass){
            util.sendJSONresponse(res, 404, {
                "errmsg":"找不到该班级"
            });
            return 0;
        }

        if(!mClass.isTeacherIn(teacherId)){
            mClass.teacherList.push(teacherId);
            mClass.save(function (err) {
                if(err){
                    util.handleSavingError(res, err);
                    return 0;
                }

                util.sendJSONresponse(res, 200, {
                    "class":mClass
                });
            });
        } else {
            //该用户已经处在在class中，直接返回
            util.sendJSONresponse(res, 200, {
                "class":mClass
            });
        }
    });
};

/**
 * 添加/移除老师
 */
module.exports.classDelTeacher = function (req, res) {
    let classId = req.body.classId;
    let teacherId = req.body.teacherId;
    if(!teacherId || !classId){
        util.errorWithParameters(res);
        return 0;
    }

    Class.findById(classId,function(err,mClass){
        if(err || !mClass){
            util.sendJSONresponse(res, 404, {
                "errmsg":"找不到该班级"
            });
            return 0;
        }

        if(mClass.isTeacherIn(teacherId)){
            mClass.teacherList.splice(mClass.teacherList.indexOf(teacherId),1);
            mClass.save(function (err) {
                if(err){
                    util.handleSavingError(res, err);
                    return 0;
                }

                util.sendJSONresponse(res, 200, {
                    "class":mClass
                });
            });
        } else {
            //该用户已经不在class中，直接返回
            util.sendJSONresponse(res, 200, {
                "class":mClass
            });
        }
    });
};


/**-----------------------------------------------------------------------
 * 管理班级里面的作业
 **---------------------------------------------------------------------*/

/**
 * 添加/移除/修改作业
 */
module.exports.addAssignmentToClass = function (req, res) {
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

            if(thisClass.isAssignmentIn(assignmentId)){
                util.sendJSONresponse(res, 404, {
                    "errmsg":"你已经添加过这个作业"
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
 * 获取某一班级的所有assignment列表
 * @param req
 * @param res
 */
module.exports.getAssignmentListInClass = function (req, res) {
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
            if((page-1)*5>mClass.assignmentList.length){
                //如果这时候选择的页码已经超出边界
                assignmentList = mClass.assignmentList.reverse();
            }
            else{
                //选择好要读取的页码数
                assignmentList = mClass.assignmentList.reverse().splice((page-1)*5,5);
            }

            if (mClass.isTeacherIn(userId)){
                return returnAssignmentListToTeacher(mClass._id, mClass.studentList, assignmentList);
            } else if(mClass.isStudentIn(userId)){
                return returnAssignmentListToStudent(mClass._id,
                    mClass.studentList.filter(student => student._id == userId),
                    assignmentList);
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
 * 添加/移除/修改课时
 */
module.exports.classAddScheduleList = function (req, res) {
	//获取userid
	let userid = req.params.userId;
	User.findById(userid, function(err, user) {
		if(err) { //未查询到用户
			util.sendJSONresponse(res,404,{
				"errmsg":"未查询到该用户."
			});
			return 0;
		}
		if(user.userType != 1) { //非老师不能创建
			util.sendJSONresponse(res,404,{
				"errmsg":"您非老师用户，不可修改课时."
			});
			return 0;
		}
		
		let classId = req.body.classid;
		Class.findById(classId, function(err, curClass) {
			if(user._id != curClass.creator._id) {
				util.sendJSONresponse(res, 404, {
					"errmsg":"您非本课程的创建者，不能添加课时."
				});
				return 0;
			}
			
			// if() {
			//
			// }
		});
	});
	
};

module.exports.classDelScheduleList = function (req, res) {
};

module.exports.classChangeScheduleList = function (req, res) {
	
};

/**
 * 添加/下载/删除资源
 */
module.exports.classAddResource = function(req, res){
	let classId = req.body.classId;
	let userId = req.body.userId;
	let resource = req.files[0];
	console.log(req.body);
	console.log(resource);
	if(!classId || !userId || !resource){
		util.errorWithParameters(res);
		return 0;
	}

	Class.findById(classId,function (err, mClass) {
		if(err || !mClass){
			util.sendJSONresponse(res,404,{
				"errmsg":"找不到该班级"
			});
		}
		User.findById(userId,function (err, user) {
			if(err || !user){
				util.sendJSONresponse(res,404,{
					"errmsg":"找不到该学生"
				});
			}

			if(user.userType !== 1){
				util.sendJSONresponse(res,404,{
					"errmsg":"您非老师用户，不可以上传资料"
				});
			}

			if(!mClass.isTeacherIn(user._id)){
				util.sendJSONresponse(res,404,{
					"errmsg":"你不在此班级中"
				});
			}

			let newResource = new Resource();
			newResource.name = req.body.name || resource.originalname;
			newResource.creator = userId;
			newResource.class = classId;
			newResource.path = resource.path;
			newResource.save(function (err) {
				util.handleSavingError(res,err);

				mClass.resourceList.push(newResource);
				mClass.save(function(err){util.handleSavingError(res,err)});
				util.sendJSONresponse(res, 200 , {
					"res":newResource
				});
				return 0;
			});

		});
	});
};

module.exports.classGetResourceListByClass = function(req, res){
	let classId = req.params.classId;
	if(!classId){
		util.errorWithParameters(res);
	}

	Class.findById(classId,function (err,classes) {
		if(err || !classes){
			util.sendJSONresponse(res,404,{
				"errmsg":"未查到该班级."
			});
			return 0;
		}
		Resource.findByClass(classId,function(err,resourceList){
			util.handleSavingError(res,err);
			util.sendJSONresponse(res,200,resourceList);
		});
	});
};

module.exports.classDeleteResource = function(req, res){

};

module.exports.downloadResource = function(req, res){

	let resourceId = req.params.resourceId;
	if(!resourceId){
		util.errorWithParameters(res);
	}
	Resource.findById(resourceId,function(err,resource){
		if(err || !resource){
			util.sendJSONresponse(res,404,{
				"errmsg":"未查到该资源."
			});
			return 0;
		}
		res.sendFile(resource.path);
	});
};


let returnAssignmentListToTeacher = function (classId, studentIdList, assignmentList) {
    let results = assignmentList.map((assignment)=>{
        let gradeInfoList = studentIdList.map((student)=>{
            return mongooseHelper.findGrade(classId, student._id, assignment._id)
                .then((grade)=>assembleGradeInfo(classId, grade,assignment,student._id,student.nickName, student.avatar));
        });
        return Promise.all(gradeInfoList).then((gradeInfoList)=>{
            let assignmentInfo = new AssignmentInfo(assignment._id, assignment.assignmentName, assignment.type,gradeInfoList);
            return assignmentInfo;
        });
    });

    return Promise.all(results);
};

let returnAssignmentListToStudent = function (classId, studentList, assignmentList) {
    let student = studentList[0];
    let results = assignmentList.map(function (assignment) {
        return mongooseHelper.findGrade(classId, student._id,assignment._id)
            .then(grade=>assembleGradeInfo(classId, grade,assignment,student._id,student.nickName, student.avatar))
            .then((gradeInfo)=>{
                let assignmentInfo = new AssignmentInfo(assignment._id, assignment.assignmentName,assignment.type, [gradeInfo]);
                return assignmentInfo;
            });
    });
    return Promise.all(results);
};

//得到grade后，组装好gradeInfo信息返回
let assembleGradeInfo = function (classId, grade,assignment,studentId,studentName, studentAvatar){
    if(grade){
        let score = 0;
        grade.responseList.forEach((response)=>{
            //如果score是负数，那么就是意味着这个道题还没有改。
            if(response.score >= 0){
                score += response.score;
            }
        });
        let undoneNum = assignment.getQuestionLength() - grade.responseList.length;

        let gradeInfo = new GradeInfo(classId, studentId, studentName, studentAvatar,
            score, assignment.getTotalScore(),undoneNum, grade.done, grade.spendTime);
        return gradeInfo;
    } else{
        let gradeInfo = new GradeInfo(classId, studentId, studentName, studentAvatar,
            0,assignment.getTotalScore(), assignment.getQuestionLength(), false, 0);
        return gradeInfo;
    }
};
