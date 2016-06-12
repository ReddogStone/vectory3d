attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aTexCoord;

varying vec3 vNormal;
varying vec2 vTexCoord;
varying vec3 vWorldPos;

uniform mat4 uWorld;
uniform mat4 uWorldIT;
uniform mat4 uView;
uniform mat4 uProjection;

void main() {
	vec4 worldPos = uWorld * vec4(aPosition, 1.0);
	mat4 vp = uProjection * uView;
	
	gl_Position = vp * worldPos;
	
	vWorldPos = worldPos.xyz;
	vTexCoord = aTexCoord;
	vNormal = (uWorldIT * vec4(aNormal, 1.0)).xyz;
}
