const Behavior = require('../../../framework/behavior');

const Transform = require('../../../../jabaku/math/transform');

module.exports = function(canvas, state) {
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

	// const ZOOM_STRENGTH = 0.001;
	// const zoom = function*() {
	// 	let event = yield Behavior.type('mousewheel');
	// 	state.camera.pos = Transform.moveToTarget(state.camera.pos, state.camera.target, 1 - event.delta * ZOOM_STRENGTH);
	// };

	const ZOOM_STRENGTH = 0.006;
	const zoom = function*() {
		let event = yield Behavior.filter(mouseButtonDown(Buttons.LEFT | Buttons.RIGHT));
		let last = event.pos;

		yield Behavior.first(
			Behavior.repeat(function*() {
				let event = yield Behavior.type('mousemove');
				let pos = event.pos;
				let dy = last.y - pos.y;

			 	state.camera.pos = Transform.moveToTarget(state.camera.pos, state.camera.target, 1 - dy * ZOOM_STRENGTH);

				last = pos;
			}),
			Behavior.filter(mouseButtonUp(Buttons.LEFT | Buttons.RIGHT))
		);
	};	

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

				let cam = state.camera;
				let newPos = Transform.rotateAroundTargetVert(cam.pos, cam.target, cam.up, dy * ROTATION_STRENGTH);
				newPos = Transform.rotateAroundTargetHoriz(newPos, cam.target, cam.up, dx * ROTATION_STRENGTH);
				cam.pos = newPos;

				last = pos;
			}),
			Behavior.filter(mouseButtonUp(Buttons.LEFT))
		);
	};

	const PAN_STRENGTH = 0.01;
	const pan = function*() {
		let event = yield Behavior.filter(mouseButtonDown(Buttons.MIDDLE));
		let last = event.pos;

		yield Behavior.first(
			Behavior.repeat(function*() {
				let event = yield Behavior.type('mousemove');
				let pos = event.pos;
				let dx = last.x - pos.x;
				let dy = last.y - pos.y;

				let cam = state.camera;
				let camToTarget = cam.target.clone().sub(cam.pos);
				let dir = camToTarget.normalize();
				let right = dir.clone().cross(cam.up);
				let up = dir.clone().cross(right);

				let scale = PAN_STRENGTH / camToTarget.length();
				let deltaRight = right.scale(dx * scale);
				let deltaUp = up.scale(dy * scale);
				let delta = deltaRight.add(deltaUp);

				let newTarget = cam.target.clone().add(delta);
				let newPos = cam.pos.clone().add(delta);

				cam.target = newTarget;
				cam.pos = newPos;

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