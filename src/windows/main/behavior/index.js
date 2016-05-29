'use strict';

const assert = require('assert');

const Behavior = require('../../../framework/behavior');

const vec3 = require('../../../../jabaku/math/Vector3');
const mat4 = require('../../../../jabaku/math/Matrix4');
const Transform = require('../../../../jabaku/math/transform');
const Color = require('../../../../jabaku/engine/color');

const mathjs = require('mathjs');

module.exports = function(canvas, state) {
	function resizeCanvas() {
		canvas.width = canvas.clientWidth;
		canvas.height = canvas.clientHeight;
		state.camera.aspect = canvas.width / canvas.height;
	}

	resizeCanvas();

	const Buttons = {
		LEFT: 1,
		RIGHT: 2,
		MIDDLE: 4
	};
	const mouseButtonDown = (buttons) => 
		event => (event.type === 'mousedown') && ((event.buttons & buttons) === buttons);
	const mouseButtonUp = (type, buttons) => 
		event => (event.type === 'mouseup') && ((event.buttons & buttons) === 0);

	const resize = function*() {
		yield Behavior.type('resize');
		resizeCanvas();
	};

	const zoom = function*() {
		let event = yield Behavior.type('mousewheel');
		state.camera.pos = Transform.moveToTarget(state.camera.pos, state.camera.target, 1 - event.delta * 0.001);
	};

	const rotate = function*() {
		let event = yield Behavior.filter(mouseButtonDown(Buttons.LEFT));
		let last = event.pos;

		yield Behavior.first(
			Behavior.repeat(function*() {
				let event = yield Behavior.type('mousemove');
				let pos = event.pos;
				let dx = last.x - pos.x;
				let dy = last.y - pos.y;

				let cam = state.camera;
				let newPos = Transform.rotateAroundTargetVert(cam.pos, cam.target, cam.up, dy * 0.006);
				newPos = Transform.rotateAroundTargetHoriz(newPos, cam.target, cam.up, dx * 0.006);
				cam.pos = newPos;

				last = pos;
			}),
			Behavior.filter(mouseButtonUp(Buttons.LEFT))
		);
	};

	const pan = function*() {
		let event = yield Behavior.filter(mouseButtonDown(Buttons.MIDDLE));
		let last = event.pos;

		yield Behavior.first(
			Behavior.repeat(function*() {
				let event = yield Behavior.type('mousemove');
				let pos = event.pos;
				let dx = last.x - pos.x;
				let dy = last.y - pos.y;

				let cam = state.camera;
				let dir = cam.target.clone().sub(cam.pos).normalize();
				let right = dir.clone().cross(cam.up);
				let up = dir.clone().cross(right);

				let deltaRight = right.scale(dx * 0.01);
				let deltaUp = up.scale(dy * 0.01);
				let delta = deltaRight.add(deltaUp);

				let newTarget = cam.target.clone().add(delta);
				let newPos = cam.pos.clone().add(delta);

				cam.target = newTarget;
				cam.pos = newPos;

				last = pos;
			}),
			Behavior.filter(mouseButtonUp(Buttons.MIDDLE))
		);
	};

	function addObject(prefix, container, obj) {
		let index = container.nextIndex++;
		obj.id = `#{${prefix}${index}}`;
		container.objects[obj.id] = obj;
		return obj.id;
	}

	const instruction = function*() {
		let event = yield Behavior.type('consoleInput');
		let expression = event.value;
		let result = mathjs.eval(expression, {
			point: function(x, y, z, name) {
				console.log(`Create Point: (${x}, ${y}, ${z}), name=${name}`);
				let obj = {
					pos: vec3(x, y, z),
					expression: expression
				};
				let id = addObject('P', state.points, obj);
				obj.name = name || id;
				return id;
			},
			line2Points: function(p1, p2, color, name) {
				console.log(`Line 2 Points: ${p1}, ${p2}, color=${color}, name=${name}`);

				p1 = p1.valueOf();
				p2 = p2.valueOf();
				assert(Array.isArray(p1) && (p1.length === 3), "P1 has to be a 3-component vector");
				assert(Array.isArray(p2) && (p2.length === 3), "P2 has to be a 3-component vector");

				let pos = vec3(...p1);
				let dir = vec3(...p2).sub(pos).normalize();

				let obj = {
					pos: pos,
					dir: dir,
					color: color ? Color(color) : Color.random(),
					expression: expression
				};
				let id = addObject('L', state.lines, obj);
				obj.name = name || id;
				return id;
			},
			plane3Points: function(p1, p2, p3, color, name) {
				console.log(`Plane 3 Points: ${p1}, ${p2}, ${p3}, color=${color}, name=${name}`);

				p1 = p1.valueOf();
				p2 = p2.valueOf();
				p3 = p3.valueOf();
				assert(Array.isArray(p1) && (p1.length === 3), "P1 has to be a 3-component vector");
				assert(Array.isArray(p2) && (p2.length === 3), "P2 has to be a 3-component vector");
				assert(Array.isArray(p3) && (p3.length === 3), "P3 has to be a 3-component vector");

				let point1 = vec3(...p1);
				let point2 = vec3(...p2);
				let point3 = vec3(...p3);
				let v1 = point2.sub(point1);
				let v2 = point3.sub(point1);
				let n = v1.cross(v2).normalize();
				let d = n.dot(point1);

				let obj = {
					normal: n,
					distance: d,
					color: color ? Color(color) : Color.random(),
					expression: expression
				};
				let id = addObject('P', state.planes, obj);
				obj.name = name || id;
				return id;
			},
			sphere: function(p, r, color, name) {
				console.log(`Sphere: center: ${p}, radius: ${r}, color=${color}, name=${name}`);

				p = p.valueOf();
				assert(Array.isArray(p) && (p.length === 3), "Center has to be a 3-component vector");
				assert(r > 0, "Radius has to be greater than 0");

				let obj = {
					center: vec3(...p),
					radius: r,
					color: color ? Color(color) : Color.random(),
					expression: expression
				};
				let id = addObject('S', state.spheres, obj);
				obj.name = name || id;
				return id;
			}
		});
	};

	return Behavior.first(
		Behavior.repeat(resize),
		Behavior.repeat(zoom),
		Behavior.repeat(rotate),
		Behavior.repeat(pan),
		Behavior.repeat(instruction)
	);
};
