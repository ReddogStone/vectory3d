// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

'use strict';

const canvas = document.getElementById('screen');
const engine3d = require('../../../jabaku/engine/engine3d')(canvas, true);
const Color = require('../../../jabaku/engine/color');
const BlendMode = require('../../../jabaku/engine/blend-mode');

const texture = engine3d.createTextureFromFile('../../../data/textures/test.png');

engine3d.setClearColor(Color.make(0, 0, 0, 0));
engine3d.setBlendMode(BlendMode.NONE);

requestAnimationFrame(function render() {
	engine3d.clear();
	engine3d.renderDebugQuad(texture, 0, 0, 100, 100);
	requestAnimationFrame(render);
});
