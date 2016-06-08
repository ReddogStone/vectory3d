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

	function objectByName(name) {
		return Object.keys(state.objects).map(id => state.objects[id]).find(obj => obj.name === name);
	}

	function getConstDependency(argNode) {
		return {
			type: DependencyType.CONST,
			expression: argNode.toString(),
			value: argNode.eval().valueOf()
		};
	}

	function getVariableDependency(argNode) {
		let variableNodes = argNode.filter(node => node.isSymbolNode);
		if (variableNodes.length > 0) {
			let code = argNode.compile();
			return {
				type: DependencyType.VARIABLE,
				variables: variableNodes.map(varNode => varNode.name),
				expression: argNode.toString(),
				eval: code.eval.bind(code)
			};
		}
	}

	function getObjectDependency(argNode) {
		if (argNode.isSymbolNode) {
			let dependency = objectByName(argNode.name);

			if (dependency) {
				return {
					type: DependencyType.OBJECT,
					id: dependency.id
				};
			}
		}
	}

	function getDependency(argNode) {
		return getObjectDependency(argNode) || getVariableDependency(argNode) || getConstDependency(argNode);
	}

	function checkGeometryType(dependency, geometryType) {
		return (dependency.type === DependencyType.OBJECT) &&
			state.objects[dependency.id] && state.objects[dependency.id].type === geometryType;
	}

	function checkType(dependency, type) {
		switch (type) {
			case 'number':
				return (dependency.type === DependencyType.CONST) || (dependency.type === DependencyType.VARIABLE);
			case 'vector':
				return ((dependency.type === DependencyType.CONST) || (dependency.type === DependencyType.VARIABLE)); // TODO check for vector3
			case 'point':
				return checkGeometryType(dependency, Type.POINT);
			case 'line':
				return checkGeometryType(dependency, Type.LINE);
			case 'plane':
				return checkGeometryType(dependency, Type.PLANE);
			case 'sphere':
				return checkGeometryType(dependency, Type.SPHERE);
		}
	}

	function expectType(args, type) {
		let types = type.split('|');
		let arg = args.shift();
		let dependency = getDependency(arg);

		assert(types.some(t => checkType(dependency, t)), `Expected argument ${arg} to be of type "${type}"`);

		return dependency;
	}

	function getDependencies(args, pattern) {
		let rest = args.slice();
		let dependencies = pattern.map(element => expectType(rest, element));

		return {
			dependencies: dependencies,
			rest: rest
		};
	}

	const factories = {
		point: {
			type: Type.POINT,
			args: ['number', 'number', 'number'],
			update: function(obj, x, y, z) {
				obj.pos = vec3(x, y, z);
			}
		},
		line2Points: {
			type: Type.LINE,
			args: ['vector|point', 'vector|point'],
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
			args: ['vector|point', 'vector|point', 'vector|point'],
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
			args: ['vector|point', 'number'],
			update: function(obj, p, r) {
				assert(Array.isArray(p) && (p.length === 3), "Center has to be a 3-component vector");
				assert(r > 0, "Radius has to be greater than 0");

				obj.center = vec3(...p);
				obj.radius = r;
			}
		}
	};

	const getters = {
		[Type.POINT]: obj => [vec3(obj.pos).toArray()],
		[Type.LINE]: obj => [vec3(obj.pos).toArray(), vec3(obj.dir).toArray()],
		[Type.PLANE]: obj => [vec3(obj.normal).toArray(), obj.distance],
		[Type.SPHERE]: obj => [vec3(obj.center).toArray(), obj.radius]
	};

	const DependencyType = {
		CONST: 'const',
		VARIABLE: 'variable',
		OBJECT: 'object'
	};

	const evaluators = {
		[DependencyType.CONST]: dep => [dep.value],
		[DependencyType.VARIABLE]: dep => [dep.eval(state.variables)],
		[DependencyType.OBJECT]: function(dep) {
			let obj = state.objects[dep.id];
			assert(obj, `Dependency does not exist "${dep.id}"`);
			return getters[obj.type](obj);
		}
	};

	const evaluateDependencies = dependencies => [].concat(...dependencies.map(dep => evaluators[dep.type](dep)));

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

		factory.update(obj, ...evaluateDependencies(obj.dependencies));

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
		obj.dependencies = getDependencies(args, factory.args).dependencies;
		addChild(obj);

		updateObject(obj);
	}

	const instruction = function*() {
		let event = yield Behavior.type('consoleInput');
		let expression = event.value;

		let node = mathjs.parse(expression);
		if (node.isFunctionNode) {
			if (node.fn.isAccessorNode) {
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

			let { dependencies, rest } = getDependencies(node.args, factory.args);

			let obj = {
				dependencies: dependencies,
				instruction: instructionName,
				children: {}
			};

			let variableDependencies = obj.dependencies.filter(dep => dep.type === DependencyType.VARIABLE);
			variableDependencies.forEach(function(dependency) {
				dependency.variables.forEach(function(variable) {
					if (state.variables[variable] === undefined) {
						state.variables[variable] = 0;
					}
				});
			});

			factory.update(obj, ...evaluateDependencies(obj.dependencies));

			let color = rest[0];
			let name = rest[1];
			let id = addObject(factory.type, obj, color && color.eval(), name && name.eval());

			addChild(obj);

			console.log(obj);
			return id;
		} else if (node.isAssignmentNode) {
			if (node.object.isSymbolNode) {
				let variableName = node.object.name;
				let value = node.value.eval().valueOf();
				state.variables[variableName] = value;

				Object.keys(state.objects).forEach(function(id) {
					let obj = state.objects[id];
					let dependsOnVariable = obj.dependencies.some(d => d.type === DependencyType.VARIABLE && d.variables.indexOf(variableName) >= 0);
					if (dependsOnVariable) {
						updateObject(obj);
					}
				});
			}
			return;
		}

		throw new Error(`Unsupported instruction ${expression}`);
	};

	return Behavior.repeat(instruction);
};