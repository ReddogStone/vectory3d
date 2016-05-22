'use strict';

const mat4 = require('../../../jabaku/math/Matrix4');
const vec3 = require('../../../jabaku/math/Vector3');

const Store = require('../../framework/store');

module.exports = function(canvas) {
	const camera = {
		pos: Store.source(vec3(1, 2, 2)),
		target: Store.source(vec3(0, 0, 0)),
		up: Store.source(vec3(0, 1, 0)),
		projection: Store.source(mat4.perspective(Math.PI / 2, canvas.width / canvas.height, 0.1, 1000.0))
	};

	const view = Store.dependent([camera.pos, camera.target, camera.up], mat4.lookAt);

	return {
		camera: {
			get pos() { return camera.pos._value },
			set pos(value) { Store.transaction(set => set(camera.pos, value)); },
			get target() { return camera.target._value },
			set target(value) { Store.transaction(set => set(camera.target, value)); },
			get up() { return camera.up._value },
			set up(value) { Store.transaction(set => set(camera.up, value)); },

			get projection() { return camera.projection._value },
			set projection(value) { Store.transaction(set => set(camera.projection, value)); },

			get view() { return view._value }
		}
	};
};