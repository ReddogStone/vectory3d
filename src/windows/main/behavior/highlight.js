const assert = require('assert');
const Behavior = require('../../../framework/behavior');

module.exports = function(canvas, state, hitTest) {
	let lastHit = null;
	const highlight = function*() {
		let event = yield Behavior.type('mousemove');

		let x = event.pos.x / canvas.width;
		let y = 1.0 - event.pos.y / canvas.height;

		let newHit = hitTest.get(x, y);

		let obj = state.objects[lastHit];
		if (obj) {
			obj.luminosity = 0.0;
		}

		if (newHit) {
			obj = state.objects[newHit];
			assert(obj, `No such object: "${newHit}"`);
			obj.luminosity = 1.0;
		}

		lastHit = newHit;
	};

	return Behavior.first(
		Behavior.repeat(highlight)
	);
};