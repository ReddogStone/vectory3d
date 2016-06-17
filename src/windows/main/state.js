'use strict';

const mat4 = require('../../../jabaku/math/Matrix4');
const vec3 = require('../../../jabaku/math/Vector3');

const Store = require('../../framework/store');
const Type = require('../../enums/geometry-type');

module.exports = function(canvas) {
	const camera = {
		pos: Store.source(vec3(4, 8, 8)),
		target: Store.source(vec3(0, 0, 0)),
		up: Store.source(vec3(0, 1, 0)),

		fov: Store.source(Math.PI / 4),
		aspect: Store.source(canvas.width / canvas.height),
		near: Store.source(0.1),
		far: Store.source(1000.0)
	};

	const view = Store.dependent([camera.pos, camera.target, camera.up], mat4.lookAt);
	const projection = Store.dependent([camera.fov, camera.aspect, camera.near, camera.far], mat4.perspective)

	return {
		camera: {
			get pos() { return camera.pos() },
			set pos(value) { Store.transaction(set => set(camera.pos, value)); },
			get target() { return camera.target() },
			set target(value) { Store.transaction(set => set(camera.target, value)); },
			get up() { return camera.up() },
			set up(value) { Store.transaction(set => set(camera.up, value)); },

			get fov() { return camera.fov() },
			set fov(value) { Store.transaction(set => set(camera.fov, value)); },
			get aspect() { return camera.aspect() },
			set aspect(value) { Store.transaction(set => set(camera.aspect, value)); },
			get near() { return camera.near() },
			set near(value) { Store.transaction(set => set(camera.near, value)); },
			get far() { return camera.far() },
			set far(value) { Store.transaction(set => set(camera.far, value)); },

			get view() { return view() },
			get projection() { return projection() }
		},
		indices: {
			[Type.POINT]: 1,
			[Type.LINE]: 1,
			[Type.PLANE]: 1,
			[Type.SPHERE]: 1
		},
		objects: {},
		variables: {}
	};
};