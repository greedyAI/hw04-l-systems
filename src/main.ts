import {vec3, vec4} from 'gl-matrix';
import * as Stats from 'stats-js';
import * as DAT from 'dat-gui';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import {setGL, readTextFile} from './globals';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';
import Plant from './Plant'
import Mesh from './geometry/Mesh'
import Square from './geometry/Square';
import ScreenQuad from './geometry/ScreenQuad';

// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.
const controls = {
  'Regenerate': loadScene,
  leafColor: '#3a5f0b',
  branchColor: '#1e0202',
  iterations: 10,
};

let plant: Plant;
let iterations = 10;

let branch: Mesh;
let leaf: Mesh;

let square: Square;
let screenQuad: ScreenQuad;
let time: number = 0.0;

function loadScene() {
  screenQuad = new ScreenQuad();
  screenQuad.create();

  // Set up instanced rendering data arrays here.
  // This example creates a set of positional
  // offsets and gradiated colors for a 100x100 grid
  // of squares, even though the VBO data for just
  // one square is actually passed to the GPU
  let branchColor = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(controls.branchColor);
  let branchParsed: vec4 = vec4.fromValues(parseInt(branchColor[1], 16) / 255.0, parseInt(branchColor[2], 16) / 255.0, parseInt(branchColor[3], 16) / 255.0, 1);
  let leafColor = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(controls.leafColor);
  let leafParsed: vec4 = vec4.fromValues(parseInt(leafColor[1], 16) / 255.0, parseInt(leafColor[2], 16) / 255.0, parseInt(leafColor[3], 16) / 255.0, 1);
  plant = new Plant(vec3.fromValues(0,0,0), controls.iterations, branchParsed, leafParsed);
  plant.createPlant();

  let branchString: string = readTextFile('./obj/branch.obj')
  branch = new Mesh(branchString, vec3.fromValues(0,0,0));
  branch.create();
  branch.setInstanceVBOs(new Float32Array(plant.branchTranslate), new Float32Array(plant.branchRotate), new Float32Array(plant.branchScale), new Float32Array(plant.branchColor));
  branch.setNumInstances(plant.branchCount);

  let leafString: string = readTextFile('./obj/leaf.obj')
  leaf = new Mesh(leafString, vec3.fromValues(0,0,0));
  leaf.create();
  leaf.setInstanceVBOs(new Float32Array(plant.leafTranslate), new Float32Array(plant.leafRotate), new Float32Array(plant.leafScale), new Float32Array(plant.leafColor));
  leaf.setNumInstances(plant.leafCount);
}

function main() {
  // Initial display for framerate
  const stats = Stats();
  stats.setMode(0);
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.top = '0px';
  document.body.appendChild(stats.domElement);

  // Add controls to the gui
  const gui = new DAT.GUI();
  gui.add(controls, 'Regenerate');
  gui.addColor(controls, 'leafColor');
  gui.addColor(controls, 'branchColor');
  gui.add(controls, 'iterations', 1, 12).step(1);

  // get canvas and webgl context
  const canvas = <HTMLCanvasElement> document.getElementById('canvas');
  const gl = <WebGL2RenderingContext> canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2 not supported!');
  }
  // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
  // Later, we can import `gl` from `globals.ts` to access it
  setGL(gl);

  // Initial call to load scene
  loadScene();

  let cameraPos: vec3 = vec3.fromValues(0, 5, -25);
  const camera = new Camera(cameraPos, vec3.fromValues(0, 5, 0));

  const renderer = new OpenGLRenderer(canvas);
  renderer.setClearColor(0.2, 0.2, 0.2, 1);
  gl.enable(gl.DEPTH_TEST);

  const instancedShader = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/instanced-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/instanced-frag.glsl')),
  ]);

  const flat = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/flat-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/flat-frag.glsl')),
  ]);

  // This function will be called every frame
  function tick() {
    camera.update();
    stats.begin();
    instancedShader.setTime(time);
    flat.setTime(time++);
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.clear();
    renderer.render(camera, flat, [screenQuad]);
    renderer.render(camera, instancedShader, [
      branch,
      leaf
    ]);
    stats.end();

    // Tell the browser to call `tick` again whenever it renders a new frame
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.setAspectRatio(window.innerWidth / window.innerHeight);
    camera.updateProjectionMatrix();
    flat.setDimensions(window.innerWidth, window.innerHeight);
  }, false);

  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.setAspectRatio(window.innerWidth / window.innerHeight);
  camera.updateProjectionMatrix();
  flat.setDimensions(window.innerWidth, window.innerHeight);

  // Start the render loop
  tick();
}

main();
