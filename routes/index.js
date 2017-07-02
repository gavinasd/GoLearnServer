var multer = require('multer');
var express = require('express');
var router = express.Router();
var jwt = require('express-jwt');
var auth = jwt({
	secret:"thisIsSecret",
	userProperty:'payload'
});
var resUpload = require('../middle_ware/uploader');


var usersController = require('../controllers/usersController');
var ctrlAuth = require('../controllers/authentication');
var classController = require('../controllers/classController');
var assignmentController = require('../controllers/assignmentController');

//for test
router.get('/user/:userId', auth, usersController.readOneUser);

/**-----------------------------------------------------------------------
 * 注册登陆接口
 **---------------------------------------------------------------------*/
router.post('/register', ctrlAuth.register);
router.post('/login', ctrlAuth.login);

//搜索班级
router.get('/classes/search/:name', auth, classController.classSearchByName);
router.get('/classes/user/:classId/:userId',auth,classController.classGetAllUser);

//添加/删除 老师/学生
router.post('/classes/addTeacher', auth, classController.classAddTeacher);
router.post('/classes/delTeacher', auth, classController.classDelTeacher);
router.post('/classes/addStudent', auth, classController.classAddStudent);
router.post('/classes/delStudent', auth, classController.classDelStudent);

//添加/删除/修改 课程表
router.post('/classes/addSchedule/:userId', auth, classController.classAddScheduleList);
router.post('/classes/delSchedule/:userId', auth, classController.classDelScheduleList);
router.post('/classes/changeSchedule/:userId', auth, classController.classChangeScheduleList);

//添加/删除/修改 作业
router.get('/assignment/assignmentId/:assignmentId',auth,assignmentController.getAssignmentById);
router.post('/classes/addAssignment', auth, assignmentController.classAddAssignment);
router.post('/assignment/addQuestionGroup', auth, assignmentController.addQuestionGroupToAssignment);
router.post('/classes/addQuestion',auth, assignmentController.addQuestionToGroup);
router.put('/assignment/content', auth, assignmentController.updateQuestionGroupContent);
router.get('/classes/getAssignmentList/:classId/:userId', auth, assignmentController.classGetAssignmentList);
router.get('/question/:assignmentId',auth,assignmentController.getQuestionGroupList);
router.get('/question/lastAnswer/:userId/:assignmentId', auth, assignmentController.getLastAnswer);
router.get('/question/group/:assignmentId/:questionGroupId',auth,assignmentController.getQuestionGroupById);
router.post('/question/addResponse',auth,assignmentController.addResponseToQuestion);
router.get('/assignment/:userId',auth,assignmentController.getAllAssignmentList);
router.post('/assignment/createone', auth, assignmentController.createAssignment);
router.get('/assignment/detail/:userId/:assignmentId',auth,assignmentController.findAssignmentGradeDetail);

router.post('/classes/addAssignments', auth, assignmentController.classAddAssignments);
router.post('/classes/delAssignment/:userId', auth, assignmentController.classDelAssignment);
router.post('/classes/delAssignments/:userId', auth, assignmentController.classDelAssignments);
router.post('/classes/changeAssignment/:userId', auth, assignmentController.classChangeAssignment);
router.post('/classes/changeAssignments/:userId', auth, assignmentController.classChangeAssignments);


//添加/删除/下载 课堂资源
router.post('/resource/addResource/', resUpload.any(), classController.classAddResource);
router.get('/classes/getResource/:classId', auth, classController.classGetResourceListByClass);
router.delete('/classes/deleteResource/:userId', auth, classController.classDeleteResource);
router.get('/classes/downloadResource/:resourceId',classController.downloadResource);

/**-----------------------------------------------------------------------
 * 课程Class接口
 **---------------------------------------------------------------------*/
router.get('/classes/:userId', auth, classController.getClassListByUserId);
router.post('/classes/:userId', auth, classController.createClassByUserId);
router.get('/classes/detail/:classId/:userId', auth, classController.getClassDetailByClassId);


module.exports = router;
