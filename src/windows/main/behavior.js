'use strict';

const Behavior = require('../../framework/behavior');

const mat4 = require('../../../jabaku/math/Matrix4');
const Transform = require('../../../jabaku/math/transform');

module.exports = function(canvas, state) {
	function resizeCanvas() {
		canvas.width = canvas.clientWidth;
		canvas.height = canvas.clientHeight;
		state.camera.projection = mat4.perspective(Math.PI / 2, canvas.width / canvas.height, 0.1, 1000.0);	
	}

	resizeCanvas();

	const resize = function*() {
		yield Behavior.type('resize');
		resizeCanvas();
	};

	const zoom = function*() {
		let event = yield Behavior.type('mousewheel');
		state.camera.pos = Transform.moveToTarget(state.camera.pos, state.camera.target, 1 - event.delta * 0.001);
	};

	const rotate = function*() {
		let event = yield Behavior.type('mousedown');
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
				state.camera.pos = newPos;

				last = pos;
			}),
			Behavior.type('mouseup')
		);
	};

	return Behavior.first(
		Behavior.repeat(resize),
		Behavior.repeat(zoom),
		Behavior.repeat(rotate)
	);
};
