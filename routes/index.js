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
let uploadController = require('../controllers/uploadController');

//for test
router.get('/user/:userId', auth, usersController.readOneUser);

/**-----------------------------------------------------------------------
 * 注册登陆接口
 **---------------------------------------------------------------------*/
router.post('/register', ctrlAuth.register);
router.post('/login', ctrlAuth.login);

/**-----------------------------------------------------------------------
 * 课程Class接口
 **---------------------------------------------------------------------*/
router.get('/classes/list/:userId', auth, classController.getClassListByUserId);
router.post('/classes/create/:userId', auth, classController.createClassByUserId);
router.get('/classes/detail/:classId/:userId', auth, classController.getClassDetailByClassId);
//搜索班级
router.get('/classes/search/:name', auth, classController.classSearchByName);

//添加/删除 老师/学生
router.get('/classes/user/:classId/:userId',auth,classController.classGetAllUser);
router.post('/classes/addTeacher', auth, classController.classAddTeacher);
router.post('/classes/addStudent', auth, classController.classAddStudent);

//添加/获取 班级里面的作业列表
router.post('/classes/addAssignment', auth, classController.addAssignmentToClass);
router.get('/classes/getAssignmentList/:classId/:userId/:page', auth, classController.getAssignmentListInClass);

/**-----------------------------------------------------------------------
 * 作业assignment接口
 **---------------------------------------------------------------------*/

//获取作业
router.get('/assignment/id/:assignmentId',auth,assignmentController.getAssignmentById);
router.get('/assignment/:userId',auth,assignmentController.getAllAssignmentList);

//获取学生的做题信息，学生提交作业
router.get('/assignment/info/:classId/:assignmentId/:studentId', auth, assignmentController.getAssignmentInfo);
router.post('/assignment/info', auth, assignmentController.submitAssignmentInfo);
router.put('/assignment/done', auth, assignmentController.submitAssignmentDone);

//编辑一份新的作业，包括创建作业，添加group，添加question，更新groupContent
router.post('/assignment/create', auth, assignmentController.createAssignment);
router.post('/assignment/addQuestionGroup', auth, assignmentController.addQuestionGroupToAssignment);
router.post('/classes/addQuestion',auth, assignmentController.addQuestionToGroup);
router.put('/assignment/content', auth, assignmentController.updateQuestionGroupContent);

router.get('/question/markingScore/:userId/:assignmentId', auth, assignmentController.getMarkingScore);
router.get('/question/spendTime/:userId/:assignmentId', auth, assignmentController.getSpendTime);
router.get('/question/group/:assignmentId/:questionGroupId',auth,assignmentController.getQuestionGroupById);
router.post('/upload/record',auth, uploadController.saveFile);




//添加/删除/下载 课堂资源
router.post('/resource/addResource/', resUpload.any(), classController.classAddResource);
router.get('/classes/getResource/:classId', auth, classController.classGetResourceListByClass);
router.delete('/classes/deleteResource/:userId', auth, classController.classDeleteResource);
router.get('/classes/downloadResource/:resourceId',classController.downloadResource);




module.exports = router;
