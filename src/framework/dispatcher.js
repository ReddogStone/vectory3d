'use strict';

const Store = require('./store');

// TODO: add listeners
module.exports = function(handlers) {
	function wrapMethod(handlerName, method, methodName) {
		return function(...params) {
			console.log(`Action: "${handlerName}.${methodName}"`, params);

			let changes = method(...params);
			let changed = Store.transaction(function(set) {
				changes.forEach( ([node, value]) => set(node, value) );
			});

			// TODO: notify listeners
		}
	}

	function wrapHandler(handler, name) {
		return wrapObject(handler, wrapMethod.bind(null, name));
	}

	function wrapObject(obj, propertyWrapper) {
		let result = {};
		Object.keys(obj).forEach(function(key) {
			result[key] = propertyWrapper(obj[key], key);
		});
		return result;
	}

	return wrapObject(handlers, wrapHandler);
};
