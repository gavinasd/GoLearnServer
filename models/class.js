/**
 * 老师创建的作业列表，可包含多个问题
 * Created by zhenwenl on 16/12/31.
 */

let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let classTimeSchema = new mongoose.Schema({
	//每次上课起始时间
	startTime:{type:Date, required:true},
	//每次上课结束时间
	endTime:{type:Date, required:true}
});

mongoose.model('ClassTime', classTimeSchema);

let classSchema = new mongoose.Schema({
	//创建者
	creator:{type:Schema.Types.ObjectId, ref:'User'},
	//课程类型
	// type:{type:Schema.Types.ObjectId, ref:'Course', required:true},
	//班级名称
	name:{type:String, required:true},
	//课程邀请码，防注水
	verifier:{type:String, required:true},
	
	//课程教师列表
	teacherList:[{type:Schema.Types.ObjectId, ref:'User'}],
	//课程学生列表
	studentList:[{type:Schema.Types.ObjectId, ref:'User'}],
	
	//课程开始时间
	startTime:{type:Date, required:true},
	//课程结束时间
	endTime:{type:Date, required:true},
	//每次上课的上课时间,每个单元包含2个数据,即上课时间和下课时间
	scheduleList:[{type:Schema.Types.ObjectId, ref:'ClassTime'}],
	
	//作业列表
	assignmentList:[{type:Schema.Types.ObjectId, ref:'Assignment'}],
	//资源列表
	resourceList:[{type:Schema.Types.ObjectId, ref:'Resource'}]
});

classSchema.statics.findByCreator = function (creator, callback) {
	return this.model('Class').find({creator: creator}, callback);
};

classSchema.statics.addSchedule = function (schedule, callback) {
	return this.model('Class').find({creator: creator}, callback);
};

/**
 * 查询用户是否存在在该班级中
 * @param userId
 * @returns {boolean}
 */
classSchema.methods.isTeacherIn = function (userId) {

    let array = this.teacherList.filter(function (teacher){
		//有可能已经populate
		if(teacher._id){
			return teacher._id.toString() == userId.toString();
		}
		return teacher.toString() == userId.toString();
	});
	return array.length > 0;
};

classSchema.methods.isStudentIn = function (userId) {
    let array = this.studentList.filter(function (student){
		//有可能已经populate
		if(student._id){
			return student._id.toString() == userId.toString();
		}
		return student.toString() == userId.toString();
	});
	return array.length > 0;
};

classSchema.methods.isUserIn = function (userId) {
	return (this.isTeacherIn(userId) || this.isStudentIn(userId));
};

/**
 * 查询该班级是否有这个作业
 */
classSchema.methods.isAssignmentIn = function(mAssignmentId){
    let array = this.assignmentList.filter(function (assignment) {
		//有可能已经populate
		if(assignment._id){
			return assignment._id.toString() == mAssignmentId.toString();
		}
		return assignment.toString() == mAssignmentId.toString();
	});
	console.log(array);
	return array.length > 0;
};


classSchema.methods.findAssignmentById = function(assignmentId){
    let array = this.assignmentList.filter(function (assignment) {
		//有可能已经populate
		if(assignment._id){
			return assignment._id.toString() == assignmentId.toString();
		}
		return assignmentId.toString() == assignmentId.toString();
	});
	return array[0];
};

mongoose.model('Class', classSchema);
