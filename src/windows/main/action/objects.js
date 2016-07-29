'use strict';

const vec3 = require('../../../../jabaku/math/Vector3');
const Color = require('../../../../jabaku/engine/color');

const assert = require('assert');
const Prefix = require('../../../enums/prefix');
const InstructionType = require('../../../enums/instruction-type');
const DependencyType = require('../../../enums/dependency-type');
const GeometryType = require('../../../enums/geometry-type');

const DependencyUtils = require('../../../utils/dependency');

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

module.exports = function(state) {
	function makeId(type, index) {
		let prefix = Prefix[type];
		return `${prefix}${index}`;
	}

	function forEachParent(obj, func) {
		let objects = state.base.objects();
		let parents = obj.dependencies.filter(dep => dep.type === DependencyType.OBJECT).map(dep => objects[dep.id]);
		parents.forEach(func);
	}

	function removeChild(obj) {
		forEachParent(obj, function(parent) {
			delete parent.children[obj.id];
		});
	}

	function addChild(obj) {
		forEachParent(obj, function(parent) {
			parent.children[obj.id] = true;
		});
	}

	function updateObject(obj) {
		let factory = Factories[obj.instruction];
		assert(factory, `Object created by unknown instruction: "${obj.instruction}"`);		

		factory.update(obj, ...DependencyUtils.eval(obj.dependencies, state.base.objects(), state.base.variables()));

		let objects = state.base.objects();
		Object.keys(obj.children).forEach(function(childId) {
			let child = objects[childId];
			assert(child, `Child object does not exist: "${childId}"`);
			updateObject(child);
		});
	}

	return {
		create: function(instruction, dependencies, color, name) {
			let factory = Factories[instruction];

			let index = state.base.indices()[factory.type];
			let id = makeId(factory.type, index);
			let obj = {
				id: id,
				type: factory.type,
				instruction: instruction,
				dependencies: dependencies,
				children: {},
				color: color ? Color(color) : Color.random(),
				name: name || id
			};

			let vars = Object.assign({}, state.base.variables());
			dependencies
				.filter(dep => dep.type === DependencyType.VARIABLE)
				.forEach(function(dependency) {
					dependency.variables.forEach(function(variable) {
						if (vars[variable] === undefined) {
							vars[variable] = 0;
						}
					});
				});

			factory.update(obj, ...DependencyUtils.eval(dependencies, state.base.objects(), vars));
			addChild(obj);

			return [
				[state.base.objects, Object.assign({}, state.base.objects(), { [id]: obj })],
				[state.base.indices, Object.assign({}, state.base.indices(), { [factory.type]: index + 1 } )],
				[state.base.variables, vars]
			]
		},
		update: function(id, dependencies) {
			let obj = state.base.objects()[id];
			assert(obj, `No such object: "${id}"`);

			removeChild(obj);
			obj.dependencies = dependencies;
			addChild(obj);

			updateObject(obj);

			return [
				[state.base.objects, state.base.objects()]
			]
		}
	};
};
