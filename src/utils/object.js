'use strict';

const vec3 = require('../../jabaku/math/Vector3');

const assert = require('assert');
const InstructionType = require('../enums/instruction-type');
const GeometryType = require('../enums/geometry-type');

const DependencyUtils = require('./dependency');

const Factories = {
	[InstructionType.POINT]: {
		type: GeometryType.POINT,
		update: function(obj, x, y, z) {
			obj.pos = vec3(x, y, z);
		}
	},
	[InstructionType.LINE_2_POINTS]: {
		type: GeometryType.LINE,
		update: function(obj, p1, p2) {
			assert(Array.isArray(p1) && (p1.length === 3), "P1 has to be a 3-component vector");
			assert(Array.isArray(p2) && (p2.length === 3), "P2 has to be a 3-component vector");

			let pos = vec3(...p1);
			let dir = vec3(...p2).sub(pos).normalize();

			obj.pos = pos;
			obj.dir = dir;
		}
	},
	[InstructionType.PLANE_3_POINTS]: {
		type: GeometryType.PLANE,
		update: function(obj, p1, p2, p3) {
			assert(Array.isArray(p1) && (p1.length === 3), "P1 has to be a 3-component vector");
			assert(Array.isArray(p2) && (p2.length === 3), "P2 has to be a 3-component vector");
			assert(Array.isArray(p3) && (p3.length === 3), "P3 has to be a 3-component vector");

			let point1 = vec3(...p1);
			let point2 = vec3(...p2);
			let point3 = vec3(...p3);
			let v1 = point2.sub(point1);
			let v2 = point3.sub(point1);
			let n = v1.cross(v2).normalize();
			let d = n.dot(point1);

			obj.normal = n;
			obj.distance = d;
		}
	},
	[InstructionType.SPHERE]: {
		type: GeometryType.SPHERE,
		update: function(obj, p, r) {
			assert(Array.isArray(p) && (p.length === 3), "Center has to be a 3-component vector");
			assert(r > 0, "Radius has to be greater than 0");

			obj.center = vec3(...p);
			obj.radius = r;
		}
	}
};

module.exports = {
	update: function updateObject(objects, variables, obj) {
		let factory = Factories[obj.instruction];
		assert(factory, `Object created by unknown instruction: "${obj.instruction}"`);		

		factory.update(obj, ...DependencyUtils.eval(obj.dependencies, objects, variables));

		Object.keys(obj.children).forEach(function(childId) {
			let child = objects[childId];
			assert(child, `Child object does not exist: "${childId}"`);
			updateObject(child);
		});
	}
};
