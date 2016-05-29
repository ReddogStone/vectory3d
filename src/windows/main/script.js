// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

'use strict';
const fs = require('fs');

const canvas = document.getElementById('screen');
const BlendMode = require('../../../jabaku/engine/blend-mode');
const Geometry = require('../../../jabaku/engine/geometry');
const mat4 = require('../../../jabaku/math/Matrix4');
const vec3 = require('../../../jabaku/math/Vector3');
const quat = require('../../../jabaku/math/Quaternion');

const engine3d = require('../../../jabaku/engine/engine3d')(canvas, true);
const Mesh = require('../../../jabaku/engine/mesh')(engine3d);

const state = require('./state')(canvas);
const behavior = require('./behavior')(canvas, state);

const texture = engine3d.createTextureFromFile('../../../data/textures/test.png');

const vertexShader = fs.readFileSync('jabaku/shaders/simple.vshader', 'utf8');
const fragmentShader = fs.readFileSync('jabaku/shaders/simple.fshader', 'utf8');
const program = engine3d.createProgram(vertexShader, fragmentShader, 'simple');

const sphereMesh = Mesh.make(Geometry.createSphereData(20));
const cylinderMesh = Mesh.make(Geometry.createCylinderData());
const quadMesh = Mesh.make(Geometry.createQuadData());

engine3d.setClearColor(0.2, 0.2, 0.2, 1);

requestAnimationFrame(function render() {
	engine3d.clear();

	engine3d.setViewport(0, 0, canvas.width, canvas.height);
	engine3d.setBlendMode(BlendMode.SOLID);
	engine3d.setProgram(program, {
		uView: state.camera.view.toArray(),
		uProjection: state.camera.projection.toArray(),

		uTexture: {},
		uPosCamera: state.camera.pos.toArray(),
		uPosLight1: state.camera.pos.toArray(),
		uColorLight1: [1, 1, 1],
		uPosLight2: [0, 0, 0],
		uColorLight2: [0, 0, 0],
		uColor: [0.2, 0.7, 1, 1],
		uLuminosity: 0,
		uAmbient: [0, 0, 0]
	});

	Object.keys(state.points.objects).forEach(function(id) {
		let point = state.points.objects[id];

		let world = mat4().translate(point.pos).scale(vec3(1, 1, 1).scale(0.08));
		let worldIT = world.clone().invert().transpose();

		engine3d.setProgramParameters(program.activeUniforms, {
			uWorld: world.toArray(),
			uWorldIT: worldIT.toArray()
		});

		Mesh.render(program, sphereMesh);
	});

	Object.keys(state.lines.objects).forEach(function(id) {
		let line = state.lines.objects[id];

		let rotation = quat.rotationTo(vec3(0, 0, 1), line.dir);
		let world = mat4.fromRotationTranslation(rotation, line.pos).scale(vec3(0.05, 0.05, 10.0));
		let worldIT = world.clone().invert().transpose();

		engine3d.setProgramParameters(program.activeUniforms, {
			uWorld: world.toArray(),
			uWorldIT: worldIT.toArray()
		});

		Mesh.render(program, cylinderMesh);
	});

	Object.keys(state.planes.objects).forEach(function(id) {
		let plane = state.planes.objects[id];

		let rotation = quat.rotationTo(vec3(0, 0, 1), plane.normal);
		let pos = plane.normal.clone().scale(plane.distance);
		let world = mat4.fromRotationTranslation(rotation, pos).scale(vec3(10.0, 10.0, 1));
		let worldIT = world.clone().invert().transpose();

		engine3d.setProgramParameters(program.activeUniforms, {
			uWorld: world.toArray(),
			uWorldIT: worldIT.toArray()
		});

		Mesh.render(program, quadMesh);
	});

	Object.keys(state.spheres.objects).forEach(function(id) {
		let sphere = state.spheres.objects[id];

		let world = mat4().translate(sphere.center).scale(vec3(1, 1, 1).scale(sphere.radius));
		let worldIT = world.clone().invert().transpose();

		engine3d.setProgramParameters(program.activeUniforms, {
			uWorld: world.toArray(),
			uWorldIT: worldIT.toArray()
		});

		Mesh.render(program, sphereMesh);
	});

	engine3d.renderDebugQuad(texture, 0, 0, 100, 100);
	requestAnimationFrame(render);
});

function getMousePos(canvas, event) {
	let rect = canvas.getBoundingClientRect();
	return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function mouseEvent(event) {
	// console.log(event.type, event.buttons);
	behavior({ type: event.type, pos: getMousePos(canvas, event), buttons: event.buttons });
}
canvas.addEventListener('mousedown', mouseEvent, false);
canvas.addEventListener('mousemove', mouseEvent, false);
document.addEventListener('mouseup', mouseEvent, false);
canvas.addEventListener("mousewheel", function(event) { behavior({ type: 'mousewheel', delta: event.wheelDelta }); }, false);
window.addEventListener('resize', function(event) { behavior({ type: 'resize' }); }, false);

const input = document.getElementById('input');
input.addEventListener('keypress', function(event) {
	if (event.keyCode === 13) {
		behavior({ type: 'consoleInput', value: event.target.value });
	}
}, false);

behavior({ type: 'consoleInput', value: 'point(0, 0, 0)' });
behavior({ type: 'consoleInput', value: 'line2Points([0, 0, 0], [1, 0, 0])' });
behavior({ type: 'consoleInput', value: 'line2Points([0, 0, 0], [0, 1, 0])' });
behavior({ type: 'consoleInput', value: 'line2Points([0, 0, 0], [0, 0, 1])' });
behavior({ type: 'consoleInput', value: 'plane3Points([0, 0, 0], [1, 0, 0], [0, 1, 0])' });
behavior({ type: 'consoleInput', value: 'plane3Points([0, 0, 1], [-1, 0, 0], [0, 1, 0])' });
behavior({ type: 'consoleInput', value: 'sphere([0, 0, 3], 2)' });
