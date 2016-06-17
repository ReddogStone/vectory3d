'use strict';

const Transform = require('../../../../jabaku/math/transform');

module.exports = function(state) {
	return {
		zoom: function(amount) {
			let pos = state.base.camera.pos();
			let target = state.base.camera.target();

			let newPos = Transform.moveToTarget(pos, target, amount);

			return [
				[state.base.camera.pos, newPos]
			];
		},
		rotate: function(horizontal, vertical) {
			let pos = state.base.camera.pos();
			let target = state.base.camera.target();
			let up = state.base.camera.up();

			let newPos = Transform.rotateAroundTargetVert(pos, target, up, vertical);
			newPos = Transform.rotateAroundTargetHoriz(newPos, target, up, horizontal);

			return [
				[state.base.camera.pos, newPos]
			];
		},
		pan: function(horizontal, vertical) {
			let pos = state.base.camera.pos();
			let target = state.base.camera.target();
			let up = state.base.camera.up();

			let camToTarget = target.clone().sub(pos);
			let dir = camToTarget.clone().normalize();
			let right = dir.clone().cross(up);
			up = dir.clone().cross(right);

			let scale = camToTarget.length();
			let deltaRight = right.scale(horizontal * scale);
			let deltaUp = up.scale(vertical * scale);
			let delta = deltaRight.add(deltaUp);

			let newTarget = target.clone().add(delta);
			let newPos = pos.clone().add(delta);

			return [
				[state.base.camera.pos, newPos],
				[state.base.camera.target, newTarget],
			];
		}
	};
};
