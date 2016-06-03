const Type = require('./geometry-type');

module.exports = {
	[Type.POINT]: 'P',
	[Type.LINE]: 'L',
	[Type.PLANE]: 'E',
	[Type.SPHERE]: 'K'
};
