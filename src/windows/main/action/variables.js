'use strict';

const assert = require('assert');
const DependencyType = require('../../../enums/dependency-type');

const ObjectUtils = require('../../../utils/object');

module.exports = function(state) {
	return {
		assign: function(name, value) {
			let objects = state.base.objects();
			let variables = Object.assign({}, state.base.variables(), { [name]: value });

			Object.keys(objects).forEach(function(id) {
				let obj = objects[id];
				let dependsOnVariable = obj.dependencies.some(d => d.type === DependencyType.VARIABLE && d.variables.indexOf(name) >= 0);
				if (dependsOnVariable) {
					ObjectUtils.update(objects, variables, obj);
				}
			});

			return [
				[state.base.variables, variables],
				[state.base.objects, objects]
			]
		}
	};
};
