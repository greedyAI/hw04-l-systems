#version 300 es
precision highp float;

in vec4 fs_Nor;
in vec4 fs_LightVec;
in vec4 fs_Col;

out vec4 out_Col;

void main()
{
  vec4 diffuseColor = fs_Col;

  float diffuseTerm = clamp(abs(dot(normalize(fs_Nor), normalize(fs_LightVec))), 0.0f, 1.0f);
  float ambientTerm = 0.5;
  float lightIntensity = diffuseTerm + ambientTerm;
  out_Col = vec4(diffuseColor.rgb * lightIntensity, diffuseColor.a);
}
