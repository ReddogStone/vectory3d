'use strict';

const State = {
	HOT: 'hot',
	COLD: 'cold',
	UNAVAILABLE: 'unavailable'
};

function makeNode(initial, sources, name) {
	let node = {
		_dependents: [],
		_name: name,
		_value: initial
	};

	sources.forEach(function(source) {
		source._dependents.push(node);
	});

	return node;
}

exports.propagate = function(changed) {
	let states = new Map();
	changed.forEach(function(source) {
		states.set(source, State.HOT);
	});

	let result = new Set(changed);

	let fifo = Array.from(changed);
	for (let i = 0; i < fifo.length; i++) {
		fifo[i]._dependents.forEach(function(dependent) {
			if (!result.has(dependent) && dependent._update(states)) {
				result.add(dependent);
				fifo.push(dependent);
			}
		});
	}

	return Array.from(result);
}

exports.source = function(initial, name) {
	let result = makeNode(initial, [], name);
	result._set = function(value) {
		result._value = value;
	};
	result._update = function(states) {
		if (!states.has(result)) {
			states.set(result, State.COLD);
		}
		return true;
	};
	return result;
};

exports.dependent = function(sources, func, name) {
	let values = sources.map(source => source._value);
	let initial = func(...values);

	let result = makeNode(initial, sources, name);
	result._update = function(states) {
		if (states.has(result)) {
			return states.get(result) !== State.UNAVAILABLE;
		}

		if (sources.every(source => source._update(states))) {
			if ( sources.every(source => (states.get(source) === State.COLD)) ) {
				if (result._value !== undefined) {
					states.set(result, State.COLD);
					return true;
				}
			} else {
				let values = sources.map(source => source._value);
				let value = func(...values);
				if (value !== undefined) {
					result._value = value;
					states.set(result, State.HOT);
					return true;
				}
			}
		}

		states.set(result, State.UNAVAILABLE);
		return false;
	};
	result._sources = sources;
	return result;
};

exports.remove = function(value) {
	(value._sources || []).forEach(function(source) {
		source._dependents.splice(source._dependents.indexOf(value), 1);
	});
};

let setter = null;
exports.transaction = function(scope) {
	if (setter) {
		scope(setter);
		return;
	}

	let changed = new Set();

	setter = function(node, value) {
		node._set(value);
		changed.add(node);
	};

	scope(setter);
	setter = null;

	return exports.propagate(changed);
};
