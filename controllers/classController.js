"use strict";

let mongoose = require('mongoose');
let util = require('../util/util');
let path = require('path');

let User = mongoose.model('User');
let Class = mongoose.model('Class');
let Course = mongoose.model('Course');
let Resource = mongoose.model('Resource');
let Assignment = mongoose.model('Assignment');
let Question = mongoose.model('Question');
let TpoReadingQuestion = mongoose.model('TpoReadingQuestion');
let mongooseHelper = require('../util/mongooseHelper');


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
 * 获取一个班级里面的所有用户：老师+学生
 * @param req
 * @param res
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


