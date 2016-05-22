// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

'use strict';
const fs = require('fs');

const canvas = document.getElementById('screen');
const Color = require('../../../jabaku/engine/color');
const BlendMode = require('../../../jabaku/engine/blend-mode');
const Geometry = require('../../../jabaku/engine/geometry');
const mat4 = require('../../../jabaku/math/Matrix4');
const vec3 = require('../../../jabaku/math/Vector3');
const Transform = require('../../../jabaku/math/transform');

const engine3d = require('../../../jabaku/engine/engine3d')(canvas, true);
const Mesh = require('../../../jabaku/engine/mesh')(engine3d);

const state = require('./state')(canvas);
const behavior = require('./behavior')(canvas, state);

const texture = engine3d.createTextureFromFile('../../../data/textures/test.png');

const world = mat4();
const worldIT = world.clone().invert().transpose();

const vertexShader = fs.readFileSync('jabaku/shaders/simple.vshader', 'utf8');
const fragmentShader = fs.readFileSync('jabaku/shaders/simple.fshader', 'utf8');
const program = engine3d.createProgram(vertexShader, fragmentShader, 'simple');

const cube = Mesh.make(Geometry.createCubeData());

engine3d.setClearColor(0.2, 0.2, 0.2, 1);

requestAnimationFrame(function render() {
	engine3d.clear();

	engine3d.setViewport(0, 0, canvas.width, canvas.height);
	engine3d.setBlendMode(BlendMode.SOLID);
	engine3d.setProgram(program, {
		uWorld: world.toArray(),
		uWorldIT: worldIT.toArray(),
		uView: state.camera.view.toArray(),
		uProjection: state.camera.projection.toArray(),

		uTexture: {},
		uPosCamera: state.camera.pos.toArray(),
		uPosLight1: state.camera.pos.toArray(),
		uColorLight1: [1, 1, 1],
		uPosLight2: [0, 0, 0],
		uColorLight2: [0, 0, 0],
		uColor: [1, 1, 1, 1],
		uLuminosity: 0,
		uAmbient: [0, 0, 0]
	});
	Mesh.render(program, cube);

	engine3d.renderDebugQuad(texture, 0, 0, 100, 100);
	requestAnimationFrame(render);
});

function getMousePos(canvas, event) {
	let rect = canvas.getBoundingClientRect();
	return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function mouseEvent(event) {
	behavior({ type: event.type, pos: getMousePos(canvas, event) });
}
canvas.addEventListener('mousedown', mouseEvent, false);
canvas.addEventListener('mousemove', mouseEvent, false);
document.addEventListener('mouseup', mouseEvent, false);
canvas.addEventListener("mousewheel", function(event) { behavior({ type: 'mousewheel', delta: event.wheelDelta }); }, false);
window.addEventListener('resize', function(event) { behavior({ type: 'resize' }); }, false);
