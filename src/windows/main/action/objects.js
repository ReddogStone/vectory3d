'use strict';

const vec3 = require('../../../../jabaku/math/Vector3');
const Color = require('../../../../jabaku/engine/color');

const assert = require('assert');
const Prefix = require('../../../enums/prefix');
const InstructionType = require('../../../enums/instruction-type');
const DependencyType = require('../../../enums/dependency-type');
const GeometryType = require('../../../enums/geometry-type');

const ObjectUtils = require('../../../utils/object');

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

	function createNewVariables(dependencies) {
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

		return vars;
	}

	return {
		create: function(instruction, dependencies, color, name) {
			let vars = createNewVariables(dependencies);

			let obj = ObjectUtils.init(instruction, dependencies, state.base.objects(), vars);

			let index = state.base.indices()[obj.type];
			let id = makeId(obj.type, index);

			obj.id = id;
			obj.children = {};
			obj.color = color ? Color(color) : Color.random();
			obj.name = name || id;

			addChild(obj);

			return [
				[state.base.objects, Object.assign({}, state.base.objects(), { [id]: obj })],
				[state.base.indices, Object.assign({}, state.base.indices(), { [obj.type]: index + 1 } )],
				[state.base.variables, vars]
			]
		},
		update: function(id, dependencies) {
			let objects = state.base.objects();
			let obj = objects[id];
			assert(obj, `No such object: "${id}"`);

			removeChild(obj);
			obj.dependencies = dependencies;
			addChild(obj);

			let vars = createNewVariables(dependencies);

			ObjectUtils.update(objects, vars, obj);

			return [
				[state.base.objects, state.base.objects()],
				[state.base.variables, vars]
			]
		}
	};
};
