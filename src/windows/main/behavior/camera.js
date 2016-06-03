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
		event => (event.type === 'mousedown') && ((event.buttons & buttons) === buttons);
	const mouseButtonUp = (type, buttons) => 
		event => (event.type === 'mouseup') && ((event.buttons & buttons) === 0);

	const zoom = function*() {
		let event = yield Behavior.type('mousewheel');
		state.camera.pos = Transform.moveToTarget(state.camera.pos, state.camera.target, 1 - event.delta * 0.001);
	};

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
				let newPos = Transform.rotateAroundTargetVert(cam.pos, cam.target, cam.up, dy * 0.006);
				newPos = Transform.rotateAroundTargetHoriz(newPos, cam.target, cam.up, dx * 0.006);
				cam.pos = newPos;

				last = pos;
			}),
			Behavior.filter(mouseButtonUp(Buttons.LEFT))
		);
	};

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
				let dir = cam.target.clone().sub(cam.pos).normalize();
				let right = dir.clone().cross(cam.up);
				let up = dir.clone().cross(right);

				let deltaRight = right.scale(dx * 0.01);
				let deltaUp = up.scale(dy * 0.01);
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