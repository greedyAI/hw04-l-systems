#version 300 es
precision highp float;

uniform vec3 u_Eye, u_Ref, u_Up;
uniform vec2 u_Dimensions;
uniform float u_Time;

in vec2 fs_Pos;
out vec4 out_Col;

#define MAX_DIST 100.0

float random1(vec2 p, vec2 seed) {
  return fract(sin(dot(p + seed, vec2(127.1, 311.7))) * 43758.5453);
}

float quinticSmooth(float t) {
  float x = clamp(t, 0.0, 1.0);
  return x * x * x * (x * (x * 6.0  - 15.0) + 10.0);
}

float interpRand(float x, float z) {
  vec2 seed = vec2(0.0, 0.0);

  float intX = floor(x);
  float fractX = fract(x);
  float intZ = floor(z);
  float fractZ = fract(z);

  vec2 c1 = vec2(intX, intZ);
  vec2 c2 = vec2(intX + 1.0, intZ);
  vec2 c3 = vec2(intX, intZ + 1.0);
  vec2 c4 = vec2(intX + 1.0, intZ + 1.0);

  float v1 = random1(c1, seed);
  float v2 = random1(c2, seed);
  float v3 = random1(c3, seed);
  float v4 = random1(c4, seed);

  float i1 = mix(v1, v2, quinticSmooth(fractX));
  float i2 = mix(v3, v4, quinticSmooth(fractX));
  return mix(i1, i2, quinticSmooth(fractZ));
}

float groundTexture(vec2 pos) {
  float total = 0.0;
  int octaves = 12;
  float persistence = 0.7;
  for (int i = 0; i < octaves; i++) {
    float freq = pow(2.0, float(i)) * 10.0;
    float amp = pow(persistence, float(i));
    total += interpRand(pos.x * freq, pos.y * freq) * amp;
  }
  return total;
}

void main() {
  float groundTexture = groundTexture(fs_Pos);
  out_Col = vec4(vec3(0.428, 0.345, 0.290) * groundTexture, 1.0);

}
