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

const texture = engine3d.createTextureFromFile('../../../data/textures/test.png');

let cameraPos = vec3(1, 2, 2);
let view = mat4.lookAt(cameraPos, vec3(0, 0, 0), vec3(0, 1, 0));
let projection = mat4.perspective(Math.PI / 2, canvas.width / canvas.height, 0.1, 1000.0);

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
		uView: view.toArray(),
		uProjection: projection.toArray(),

		uTexture: {},
		uPosCamera: cameraPos.toArray(),
		uPosLight1: cameraPos.toArray(),
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

function setCameraPos(value) {
	cameraPos = value;
	view = mat4.lookAt(cameraPos, vec3(0, 0, 0), vec3(0, 1, 0));
}

let move = null;
canvas.addEventListener('mousedown', function(event) {
	let pos = getMousePos(canvas, event);
	move = pos;
}, false);
canvas.addEventListener('mousemove', function(event) {
	if (move) {
		let pos = getMousePos(canvas, event);
		let dx = move.x - pos.x;
		let dy = move.y - pos.y;
		let camPos = Transform.rotateAroundTargetVert(cameraPos, vec3(0, 0, 0), vec3(0, 1, 0), dy * 0.006);
		camPos = Transform.rotateAroundTargetHoriz(camPos, vec3(0, 0, 0), vec3(0, 1, 0), dx * 0.006);
		setCameraPos(camPos);

		move = pos;
	}
}, false);
document.addEventListener('mouseup', function(event) {
	move = null;
}, false);

canvas.addEventListener("mousewheel", function(event) {
	setCameraPos(Transform.moveToTarget(cameraPos, vec3(0, 0, 0), 1 - event.wheelDelta * 0.001));
}, false);


function resizeCanvas() {
	canvas.width = canvas.clientWidth;
	canvas.height = canvas.clientHeight;
	projection = mat4.perspective(Math.PI / 2, canvas.width / canvas.height, 0.1, 1000.0);	
}

window.addEventListener('resize', resizeCanvas, false);
resizeCanvas();
