'use strict';

const assert = require('assert');

const Behavior = require('../../../framework/behavior');

const vec3 = require('../../../../jabaku/math/Vector3');
const mat4 = require('../../../../jabaku/math/Matrix4');
const Transform = require('../../../../jabaku/math/transform');
const Color = require('../../../../jabaku/engine/color');

const mathjs = require('mathjs');

module.exports = function(canvas, state) {
	function resizeCanvas() {
		canvas.width = canvas.clientWidth;
		canvas.height = canvas.clientHeight;
		state.camera.aspect = canvas.width / canvas.height;
	}

	resizeCanvas();

	const Buttons = {
		LEFT: 1,
		RIGHT: 2,
		MIDDLE: 4
	};
	const mouseButtonDown = (buttons) => 
		event => (event.type === 'mousedown') && ((event.buttons & buttons) === buttons);
	const mouseButtonUp = (type, buttons) => 
		event => (event.type === 'mouseup') && ((event.buttons & buttons) === 0);

	const resize = function*() {
		yield Behavior.type('resize');
		resizeCanvas();
	};

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

	function addObject(prefix, container, obj, color, name) {
		let index = container.nextIndex++;
		
		obj.id = `${prefix}${index}`;
		obj.name = name || obj.id;
		obj.color = color ? Color(color) : Color.random();

		container.objects[obj.id] = obj;
		return obj.id;
	}

	const factories = {
		point: {
			prefix: 'P',
			container: state.points,
			argumentCount: 3,
			update: function(obj, x, y, z) {
				obj.pos = vec3(x, y, z);
			}
		},
		line2Points: {
			prefix: 'L',
			container: state.lines,
			argumentCount: 2,
			update: function(obj, p1, p2) {
				assert(Array.isArray(p1) && (p1.length === 3), "P1 has to be a 3-component vector");
				assert(Array.isArray(p2) && (p2.length === 3), "P2 has to be a 3-component vector");

				let pos = vec3(...p1);
				let dir = vec3(...p2).sub(pos).normalize();

				obj.pos = pos;
				obj.dir = dir;
			}
		},
		plane3Points: {
			prefix: 'E',
			container: state.planes,
			argumentCount: 3,
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
		sphere: {
			prefix: 'K',
			container: state.spheres,
			argumentCount: 2,
			update: function(obj, p, r) {
				assert(Array.isArray(p) && (p.length === 3), "Center has to be a 3-component vector");
				assert(r > 0, "Radius has to be greater than 0");

				obj.center = vec3(...p);
				obj.radius = r;
			}
		}
	};

	const getters = {
		points: obj => vec3(obj.pos).toArray(),
		lines: obj => [vec3(obj.pos).toArray(), vec3(obj.dir).toArray()],
		planes: obj => [vec3(obj.normal).toArray(), obj.distance],
		spheres: obj => [vec3(obj.center).toArray(), obj.radius]
	};

	function addContainerScope(result, containerName, onDependency) {
		let objects = state[containerName].objects;
		Object.keys(objects).forEach(function(id) {
			let obj = objects[id];
			let value = getters[containerName](obj);
			Object.defineProperty(result, id, {
				enumerable: true,
				get: function() {
					if (onDependency) { onDependency(id, obj); }
					return value;
				}
			});
		});
	}

	function getScope(onDependency) {
		let result = {};
		addContainerScope(result, 'points', onDependency);
		addContainerScope(result, 'lines', onDependency);
		addContainerScope(result, 'planes', onDependency);
		addContainerScope(result, 'spheres', onDependency);
		return result;
	}

	function getObject(id) {
		return state.points.objects[id] ||
			state.lines.objects[id] ||
			state.planes.objects[id] ||
			state.spheres.objects[id];
	}

	function update(id, args) {
		let obj = getObject(id);
		assert(obj, `Unknown object "${id}"`);

		let factory = factories[obj.instruction];
		assert(factory, `Object created by unknown instruction: "${obj.instruction}"`);

		obj.args = args.slice(0, factory.argumentCount);

		obj.parents = {};
		let scope = getScope(function(id, parent) {
			obj.parents[id] = parent;
		});
		factory.update(obj, ...obj.args.map(arg => arg.eval(scope).valueOf()));

		Object.keys(obj.children).forEach(function(childId) {
			let child = obj.children[childId];
			update(childId, child.args);
		});
	}

	const instruction = function*() {
		let event = yield Behavior.type('consoleInput');
		let expression = event.value;

		let node = mathjs.parse(expression);
		if (node instanceof mathjs.expression.node.FunctionNode) {
			if (node.fn instanceof mathjs.expression.node.AccessorNode) {
				return update(node.fn.object.name, node.args);
			}

			let instructionName = node.name;
			if (!(instructionName in factories)) {
				throw new Error(`Unsupported instruction "${instructionName}"`);
			}

			let factory = factories[instructionName];

			assert(node.args.length >= factory.argumentCount, `"${instructionName}" needs ${factory.argumentCount} parameters`);

			let obj = {
				args: node.args.slice(0, factory.argumentCount),
				instruction: instructionName,
				children: {},
				parents: {}
			};

			let scope = getScope(function(id, parent) {
				obj.parents[id] = parent;
			});

			factory.update(obj, ...obj.args.map(arg => arg.eval(scope).valueOf()));

			let color = node.args[factory.argumentCount];
			let name = node.args[factory.argumentCount + 1];
			let id = addObject(factory.prefix, factory.container, obj, color && color.eval(), name && name.eval());

			Object.keys(obj.parents).forEach(function(parentId) {
				obj.parents[parentId].children[id] = obj;
			});

			console.log(obj);
			return id;
		}

		throw new Error('Only supporting function calls currently');
	};

	return Behavior.first(
		Behavior.repeat(resize),
		Behavior.repeat(zoom),
		Behavior.repeat(rotate),
		Behavior.repeat(pan),
		Behavior.repeat(instruction)
	);
};
