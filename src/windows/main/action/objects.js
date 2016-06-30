'use strict';

const assert = require('assert');

module.exports = function(state) {
	function addObject(type, obj, color, name) {
		let prefix = Prefix[type];
		let index = state.base.indices[type]++;
		
		obj.type = type;
		obj.id = `${prefix}${index}`;
		obj.name = name || obj.id;
		obj.color = color ? Color(color) : Color.random();

		state.objects[obj.id] = obj;
		return obj.id;
	}

	return {
		create: function(instruction, dependencies, color, name) {
			let obj = {
				instruction: instruction,
				dependencies: dependencies,
				color: color,
				name: name || 
			};
		}
	};
};
