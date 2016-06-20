'use strict';

const assert = require('assert');

const Behavior = require('../../../framework/behavior');

const CameraBehavior = require('./camera');
const CreateBehavior = require('./create');
const HighlightBehavior = require('./highlight');

module.exports = function(canvas, state, hitTest, actions) {
	return Behavior.first(
		CameraBehavior(canvas, state, actions),	
		CreateBehavior(state),
		HighlightBehavior(canvas, state, hitTest, actions)
	);
};
