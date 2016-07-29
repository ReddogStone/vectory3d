const assert = require('assert');
const vec3 = require('../../jabaku/math/Vector3');

const GeometryType = require('../enums/geometry-type');
const DependencyType = require('../enums/dependency-type');

const Getters = {
	[GeometryType.POINT]: obj => [vec3(obj.pos).toArray()],
	[GeometryType.LINE]: obj => [vec3(obj.pos).toArray(), vec3(obj.dir).toArray()],
	[GeometryType.PLANE]: obj => [vec3(obj.normal).toArray(), obj.distance],
	[GeometryType.SPHERE]: obj => [vec3(obj.center).toArray(), obj.radius]
};

const Evaluators = {
	[DependencyType.CONST]: dep => [dep.value],
	[DependencyType.VARIABLE]: (dep, objects, variables) => [dep.eval(variables)],
	[DependencyType.OBJECT]: function(dep, objects) {
		let obj = objects[dep.id];
		assert(obj, `Dependency does not exist "${dep.id}"`);
		return Getters[obj.type](obj);
	}
};

module.exports = {
	eval: (dependencies, objects, variables) => [].concat(...dependencies.map(dep => Evaluators[dep.type](dep, objects, variables)))
};