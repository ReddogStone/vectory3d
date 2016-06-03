const assert = require('assert');

const mathjs = require('mathjs');

const Behavior = require('../../../framework/behavior');

const vec3 = require('../../../../jabaku/math/Vector3');
const Color = require('../../../../jabaku/engine/color');

const Type = require('../../../enums/geometry-type');
const Prefix = require('../../../enums/prefix');

module.exports = function(state) {
	function addObject(type, obj, color, name) {
		let prefix = Prefix[type];
		let index = state.indices[type]++;
		
		obj.type = type;
		obj.id = `${prefix}${index}`;
		obj.name = name || obj.id;
		obj.color = color ? Color(color) : Color.random();

		state.objects[obj.id] = obj;
		return obj.id;
	}

	const factories = {
		point: {
			type: Type.POINT,
			argumentCount: 3,
			update: function(obj, x, y, z) {
				obj.pos = vec3(x, y, z);
			}
		},
		line2Points: {
			type: Type.LINE,
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
			type: Type.PLANE,
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
			type: Type.SPHERE,
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
		[Type.POINT]: obj => vec3(obj.pos).toArray(),
		[Type.LINE]: obj => [vec3(obj.pos).toArray(), vec3(obj.dir).toArray()],
		[Type.PLANE]: obj => [vec3(obj.normal).toArray(), obj.distance],
		[Type.SPHERE]: obj => [vec3(obj.center).toArray(), obj.radius]
	};

	const DependencyType = {
		CONST: 'const',
		OBJECT: 'object'
	};

	const evaluators = {
		[DependencyType.CONST]: dep => dep.value,
		[DependencyType.OBJECT]: function(dep) {
			let obj = state.objects[dep.id];
			assert(obj, `Dependency does not exist "${dep.id}"`);
			return getters[obj.type](obj);
		}
	};

	function objectByName(name) {
		return Object.keys(state.objects).map(id => state.objects[id]).find(obj => obj.name === name);
	}

	function getDependency(argNode) {
		if (argNode instanceof mathjs.expression.node.SymbolNode) {
			let dependency = objectByName(argNode.name);
			assert(dependency, `No object with name "${argNode.name}"`);

			return {
				type: DependencyType.OBJECT,
				id: dependency.id
			};
		}

		return {
			type: DependencyType.CONST,
			expression: argNode.toString(),
			value: argNode.eval().valueOf()
		};
	}

	const getDependencies = (args, factory) => args.slice(0, factory.argumentCount).map(getDependency);

	function forEachParent(obj, func) {
		let parents = obj.dependencies.filter(dep => dep.type === DependencyType.OBJECT).map(dep => state.objects[dep.id]);
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
		let factory = factories[obj.instruction];
		assert(factory, `Object created by unknown instruction: "${obj.instruction}"`);		

		let params = obj.dependencies.map(dep => evaluators[dep.type](dep));
		factory.update(obj, ...params);

		Object.keys(obj.children).forEach(function(childId) {
			let child = state.objects[childId];
			assert(child, `Child object does not exist: "${childId}"`);
			updateObject(child);
		});
	}

	function update(id, args) {
		let obj = state.objects[id];
		assert(obj, `Object does not exist: "${id}"`);

		let factory = factories[obj.instruction];
		assert(factory, `Object created by unknown instruction: "${obj.instruction}"`);

		removeChild(obj);
		obj.dependencies = getDependencies(args, factory);
		addChild(obj);

		updateObject(obj);
	}

	const instruction = function*() {
		let event = yield Behavior.type('consoleInput');
		let expression = event.value;

		let node = mathjs.parse(expression);
		if (node instanceof mathjs.expression.node.FunctionNode) {
			if (node.fn instanceof mathjs.expression.node.AccessorNode) {
				if (node.fn.name === 'update') {
					return update(node.fn.object.name, node.args);
				}

				throw new Error(`Unknown object method "${node.fn.name}"`);
			}

			let instructionName = node.name;
			if (!(instructionName in factories)) {
				throw new Error(`Unsupported instruction "${instructionName}"`);
			}

			let factory = factories[instructionName];

			assert(node.args.length >= factory.argumentCount, `"${instructionName}" needs ${factory.argumentCount} parameters`);

			let obj = {
				dependencies: getDependencies(node.args, factory),
				instruction: instructionName,
				children: {}
			};

			let params = obj.dependencies.map(dep => evaluators[dep.type](dep));
			factory.update(obj, ...params);

			let color = node.args[factory.argumentCount];
			let name = node.args[factory.argumentCount + 1];
			let id = addObject(factory.type, obj, color && color.eval(), name && name.eval());

			addChild(obj);

			console.log(obj);
			return id;
		}

		throw new Error('Only supporting function calls currently');
	};

	return Behavior.repeat(instruction);
};