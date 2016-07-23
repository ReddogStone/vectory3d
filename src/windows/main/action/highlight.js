'use strict';

const assert = require('assert');
const Transform = require('../../../../jabaku/math/transform');

module.exports = function(state) {
	return {
		set: function(id) {
			assert(!id || state.base.objects()[id], `No such object: "${id}"`);

			return [
				[state.base.highlighted, id]
			];
		}
	};
};
