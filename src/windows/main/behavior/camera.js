const Behavior = require('../../../framework/behavior');

const Transform = require('../../../../jabaku/math/transform');

module.exports = function(canvas, state, actions) {
	function resizeCanvas() {
		canvas.width = canvas.clientWidth;
		canvas.height = canvas.clientHeight;
		state.camera.aspect = canvas.width / canvas.height;
	}

	resizeCanvas();

	const resize = function*() {
		yield Behavior.type('resize');
		resizeCanvas();
	};

	const Buttons = {
		LEFT: 1,
		RIGHT: 2,
		MIDDLE: 4
	};
	const mouseButtonDown = (buttons) => 
		event => (event.type === 'mousedown') && ((event.buttons ^ buttons) === 0);
	const mouseButtonUp = (type, buttons) => 
		event => (event.type === 'mouseup') && ((event.buttons & buttons) === 0);

	const ZOOM_STRENGTH = 0.001;
	const zoom = function*() {
		let event = yield Behavior.type('mousewheel');
		actions.camera.zoom(1 - event.delta * ZOOM_STRENGTH);
	};

	// const ZOOM_STRENGTH = 0.006;
	// const zoom = function*() {
	// 	let event = yield Behavior.filter(mouseButtonDown(Buttons.LEFT | Buttons.RIGHT));
	// 	let last = event.pos;

	// 	yield Behavior.first(
	// 		Behavior.repeat(function*() {
	// 			let event = yield Behavior.type('mousemove');
	// 			let pos = event.pos;
	// 			let dy = last.y - pos.y;

	// 		 	state.camera.pos = Transform.moveToTarget(state.camera.pos, state.camera.target, 1 - dy * ZOOM_STRENGTH);

	// 			last = pos;
	// 		}),
	// 		Behavior.filter(mouseButtonUp(Buttons.LEFT | Buttons.RIGHT))
	// 	);
	// };

	const ROTATION_STRENGTH = 0.006;
	const rotate = function*() {
		let event = yield Behavior.filter(mouseButtonDown(Buttons.LEFT));
		let last = event.pos;

		yield Behavior.first(
			Behavior.repeat(function*() {
				let event = yield Behavior.type('mousemove');
				let pos = event.pos;
				let dx = last.x - pos.x;
				let dy = last.y - pos.y;

				actions.camera.rotate(dx * ROTATION_STRENGTH, dy * ROTATION_STRENGTH);

				last = pos;
			}),
			Behavior.filter(mouseButtonUp(Buttons.LEFT))
		);
	};

	const PAN_STRENGTH = 0.0012;
	const pan = function*() {
		let event = yield Behavior.filter(mouseButtonDown(Buttons.MIDDLE));
		let last = event.pos;

		yield Behavior.first(
			Behavior.repeat(function*() {
				let event = yield Behavior.type('mousemove');
				let pos = event.pos;
				let dx = last.x - pos.x;
				let dy = last.y - pos.y;

				actions.camera.pan(dx * PAN_STRENGTH, dy * PAN_STRENGTH);

				last = pos;
			}),
			Behavior.filter(mouseButtonUp(Buttons.MIDDLE))
		);
	};

	return Behavior.first(
		Behavior.repeat(resize),
		Behavior.repeat(zoom),
		Behavior.repeat(rotate),
		Behavior.repeat(pan)
	);
};