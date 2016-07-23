'use strict';

const handlers = {
	camera: require('./camera'),
	highlight: require('./highlight'),
	objects: require('./objects')
};

module.exports = function(state) {
	let result = {};
	Object.keys(handlers).forEach(function(name) {
		result[name] = handlers[name](state);
	});
	return result;
};
