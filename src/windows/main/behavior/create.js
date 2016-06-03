const assert = require('assert');

const mathjs = require('mathjs');

const Behavior = require('../../../framework/behavior');

const vec3 = require('../../../../jabaku/math/Vector3');
const Color = require('../../../../jabaku/engine/color');


module.exports = function(state) {
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

	return Behavior.repeat(instruction);
};