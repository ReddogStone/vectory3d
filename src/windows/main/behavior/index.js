'use strict';

const assert = require('assert');

const Behavior = require('../../../framework/behavior');

const CameraBehavior = require('./camera');
const CreateBehavior = require('./create');

module.exports = function(canvas, state) {
	return Behavior.first(
		CameraBehavior(canvas, state),	
		CreateBehavior(state)
	);
};
