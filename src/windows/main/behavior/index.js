'use strict';

const assert = require('assert');

const Behavior = require('../../../framework/behavior');

const CameraBehavior = require('./camera');
const ConsoleBehavior = require('./console');
const HighlightBehavior = require('./highlight');

module.exports = function(canvas, state, hitTest, actions) {
	return Behavior.first(
		CameraBehavior(canvas, state, actions),	
		ConsoleBehavior(state, actions),
		HighlightBehavior(canvas, state, hitTest, actions)
	);
};
