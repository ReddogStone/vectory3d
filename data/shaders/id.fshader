precision mediump float;

uniform float uId;

void main() {
	gl_FragColor = vec4(uId / 256.0, uId / 256.0, uId / 256.0, 1.0);
}
