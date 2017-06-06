var mongoose = require('mongoose');
var util = require('../util/util');
var User = mongoose.model('User');

module.exports.readOneUser = function (req,res) {
	var id = req.params.userId;
	User.findById(id,function (err,user) {
		if(err){
			res.status(404);
			res.json(err);
			return;
		}
		res.status(200);
		res.json(user);
		return;
	});
};
