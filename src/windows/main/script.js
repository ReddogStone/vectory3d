// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

'use strict';
const fs = require('fs');

const canvas = document.getElementById('screen');
const BlendMode = require('../../../jabaku/engine/blend-mode');
const Geometry = require('../../../jabaku/engine/geometry');
const Color = require('../../../jabaku/engine/color');
const mat4 = require('../../../jabaku/math/Matrix4');
const vec3 = require('../../../jabaku/math/Vector3');
const quat = require('../../../jabaku/math/Quaternion');

const engine3d = require('../../../jabaku/engine/engine3d')(canvas, true);
const Mesh = require('../../../jabaku/engine/mesh')(engine3d);

const HitTestView = require('./view/hit-test')(engine3d);

const state = require('./state')(canvas);
const behavior = require('./behavior')(canvas, state, HitTestView);

const Type = require('../../enums/geometry-type');

const texture = engine3d.createTextureFromFile('../../../data/textures/test.png');

let emptyCanvas = document.createElement('canvas');
emptyCanvas.width = 1;
emptyCanvas.height = 1;
let context = emptyCanvas.getContext('2d');
context.fillStyle = 'white';
context.fillRect(0, 0, emptyCanvas.width, emptyCanvas.height);

const emptyTexture = engine3d.createTexture(emptyCanvas);

const vertexShader = fs.readFileSync(__dirname + '/../../../jabaku/shaders/simple.vshader', 'utf8');
const fragmentShader = fs.readFileSync(__dirname + '/../../../jabaku/shaders/simple.fshader', 'utf8');
const program = engine3d.createProgram(vertexShader, fragmentShader, 'simple');

const sphereMesh = Mesh.make(Geometry.createSphereData(20));
const cylinderMesh = Mesh.make(Geometry.createCylinderData());
const quadMesh = Mesh.make(Geometry.createQuadData());

const geometries = type => Object.keys(state.objects).map(id => state.objects[id]).filter(obj => obj.type === type);

// TODO: remove, this is to put less strain on the hardware during development
requestAnimationFrame = function(callback) {
	return setTimeout(callback, 100);
};

requestAnimationFrame(function render() {
	engine3d.setClearColor(0.2, 0.2, 0.2, 1);
	engine3d.setDefaultFrameBuffer();
	engine3d.clear();

	engine3d.setViewport(0, 0, canvas.width, canvas.height);
	engine3d.setBlendMode(BlendMode.SOLID);
	engine3d.setProgram(program, {
		uView: state.camera.view.toArray(),
		uProjection: state.camera.projection.toArray(),

		uTexture: { texture: emptyTexture },
		uPosCamera: state.camera.pos.toArray(),
		uPosLight1: state.camera.pos.toArray(),
		uColorLight1: [1, 1, 1],
		uPosLight2: [0, 0, 0],
		uColorLight2: [0, 0, 0],
		uColor: [0.2, 0.7, 1, 1],
		uLuminosity: 0,
		uAmbient: [0, 0, 0]
	});

	let hitObjects = [];

	geometries(Type.POINT).forEach(function(point) {
		let world = mat4().translate(point.pos).scale(vec3(1, 1, 1).scale(0.08));
		let worldIT = world.clone().invert().transpose();

		engine3d.setProgramParameters(program.activeUniforms, {
			uColor: Color.toArray4(point.color),
			uWorld: world.toArray(),
			uWorldIT: worldIT.toArray(),
			uLuminosity: point.luminosity || 0
		});

		Mesh.render(program, sphereMesh);

		hitObjects.push({
			mesh: sphereMesh,
			world: world.scale(vec3(1, 1, 1)),
			id: point.id
		});
	});

	geometries(Type.LINE).forEach(function(line) {
		let rotation = quat.rotationTo(vec3(0, 0, 1), line.dir);
		let world = mat4.fromRotationTranslation(rotation, line.pos).scale(vec3(0.05, 0.05, 10.0));
		let worldIT = world.clone().invert().transpose();

		engine3d.setProgramParameters(program.activeUniforms, {
			uColor: Color.toArray4(line.color),
			uWorld: world.toArray(),
			uWorldIT: worldIT.toArray(),
			uLuminosity: line.luminosity || 0
		});

		Mesh.render(program, cylinderMesh);

		hitObjects.push({
			mesh: cylinderMesh,
			world: world.scale(vec3(1, 1, 1)),
			id: line.id
		});
	});

	geometries(Type.PLANE).forEach(function(plane) {
		let rotation = quat.rotationTo(vec3(0, 0, 1), plane.normal);
		let pos = plane.normal.clone().scale(plane.distance);
		let world = mat4.fromRotationTranslation(rotation, pos).scale(vec3(10.0, 10.0, 1));
		let worldIT = world.clone().invert().transpose();

		engine3d.setProgramParameters(program.activeUniforms, {
			uColor: Color.toArray4(plane.color),
			uWorld: world.toArray(),
			uWorldIT: worldIT.toArray(),
			uLuminosity: plane.luminosity || 0
		});

		Mesh.render(program, quadMesh);

		hitObjects.push({
			mesh: quadMesh,
			world: world,
			id: plane.id
		});
	});

	geometries(Type.SPHERE).forEach(function(sphere) {
		let world = mat4().translate(sphere.center).scale(vec3(1, 1, 1).scale(sphere.radius));
		let worldIT = world.clone().invert().transpose();

		engine3d.setProgramParameters(program.activeUniforms, {
			uColor: Color.toArray4(sphere.color),
			uWorld: world.toArray(),
			uWorldIT: worldIT.toArray(),
			uLuminosity: sphere.luminosity || 0
		});

		Mesh.render(program, sphereMesh);

		hitObjects.push({
			mesh: sphereMesh,
			world: world,
			id: sphere.id
		});
	});

	HitTestView.render(state.camera, hitObjects);

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
behavior({ type: 'consoleInput', value: 'point(1, 0, 0)' });
behavior({ type: 'consoleInput', value: 'line2Points(P1, P2)' });
behavior({ type: 'consoleInput', value: 'line2Points([0, 0, 0], [0, 1, 0])' });
behavior({ type: 'consoleInput', value: 'line2Points([0, 0, 0], [0, 0, 1])' });
// behavior({ type: 'consoleInput', value: 'plane3Points([0, 0, 0], [1, 0, 0], [0, 1, 0])' });
// behavior({ type: 'consoleInput', value: 'plane3Points([0, 0, 1], [-1, 0, 0], [0, 1, 0])' });
behavior({ type: 'consoleInput', value: 'sphere([0, 0, 3], 2)' });
