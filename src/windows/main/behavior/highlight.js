const assert = require('assert');
const Behavior = require('../../../framework/behavior');

module.exports = function(canvas, state, hitTest, actions) {
	let lastHit = null;
	const highlight = function*() {
		let event = yield Behavior.type('mousemove');

		let x = event.pos.x / canvas.width;
		let y = 1.0 - event.pos.y / canvas.height;

		actions.highlight.set(hitTest.get(x, y));
	};

	return Behavior.first(
		Behavior.repeat(highlight)
	);
};