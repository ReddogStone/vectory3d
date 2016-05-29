'use strict';

const Behavior = require('./behavior');

function Stream(generatorFunc) {
	return function(emit) {
		var gen = generatorFunc(emit);

		var res = gen.next();
		if (res.done) {
			return function() { return { done: true }; };
		}

		var current = res.value(emit);
		return function(event) {
			var res = current(event);
			while (res.done) {
				var res = gen.next(res.value);
				if (res.done) { return res; }

				current = res.value(emit);
				if (res.pass) {
					res = current(res.pass);
				} else {
					res = { done: false };
				}
			}

			return { done: false };
		};
	};
}
Stream.first = (...params) => emit => Behavior.first(...params.map(stream => stream(emit)));
Stream.repeat = function repeat(stream) {
	if (stream.constructor.name === 'GeneratorFunction') {
		return repeat(Stream(stream));
	}

	return Stream(function*() {
		while (true) {
			yield stream;
		}
	});
};
Stream.map = (stream, func) => emit => stream((...params) => func(emit, ...params));
	};
};
Stream.once = function(type) {
	return emit => Behavior.type(type);
};
Stream.on = type => Stream(function*(emit) {
	while (true) {
		let event = yield Stream.once(type);
		emit(event);
	}
});

module.exports = Stream;