'use strict';

const fs = require('fs');

const BlendMode = require('../../../../jabaku/engine/blend-mode');

module.exports = function(engine) {
	const Mesh = require('../../../../jabaku/engine/mesh')(engine);

	const vertexShader = fs.readFileSync(__dirname + '/../../../../data/shaders/id.vshader', 'utf8');
	const fragmentShader = fs.readFileSync(__dirname + '/../../../../data/shaders/id.fshader', 'utf8');
	const idProgram = engine.createProgram(vertexShader, fragmentShader, 'id');

	const size = { x: 1024, y: 1024 };
	const renderTexture = engine.createRenderTexture(size);
	const depthTexture = engine.createDepthTexture(size);
	const frameBuffer = engine.createFrameBuffer(renderTexture, depthTexture);

	let ids = [];

	return {
		get: function(x, y) {
			let pixel = engine.readPixel(frameBuffer, size.x * x, size.y * y);
			let hitId = pixel[0];
			return ids[hitId];
		},
		render: function(camera, objects) {
			engine.setFrameBuffer(frameBuffer);
			engine.setViewport(0, 0, size.x, size.y);
			engine.setClearColor(255, 255, 255, 255);
			engine.clear();
			engine.setBlendMode(BlendMode.SOLID);
			engine.setProgram(idProgram, {
				uView: camera.view.toArray(),
				uProjection: camera.projection.toArray(),
			});

			ids = objects.map(function(obj, index) {
				let world = obj.world;
				let worldIT = world.clone().invert().transpose();

				engine.setProgramParameters(idProgram.activeUniforms, {
					uWorld: world.toArray(),
					uWorldIT: worldIT.toArray(),
					uId: index
				});

				Mesh.render(idProgram, obj.mesh);

				return obj.id;
			});

			engine.setDefaultFrameBuffer();
			engine.renderDebugQuad(renderTexture, 100, 0, 300, 300);
		}
	};
};
