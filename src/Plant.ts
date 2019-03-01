import {vec3, vec4, mat3, mat4, quat} from 'gl-matrix';
import Drawable from './rendering/gl/Drawable';
import {gl} from './globals';
import Turtle from './Turtle';
import ExpansionRule from './ExpansionRule';
import DrawingRule from './DrawingRule';

class Plant {
  upVector: vec3 = vec3.fromValues(0,1,0);
  root: vec3 = vec3.create();
  iterations: number;
  branchCol: vec4;
  leafCol: vec4;

  axiom: string;
  expansionRules: Map<string, ExpansionRule>;
  drawingRules: Map<string, DrawingRule>;

  branchTranslate: number[] = [];
  branchRotate: number[] = [];
  branchScale: number[] = [];
  branchColor: number[] = [];
  branchCount: number = 0;

  leafTranslate: number[] = [];
  leafRotate: number[] = [];
  leafScale: number[] = [];
  leafColor: number[] = [];
  leafCount: number = 0;

  constructor(root: vec3, iterations: number, branchCol: vec4, leafCol: vec4) {
    this.root = root;
    this.iterations = iterations;
    this.branchCol = branchCol;
    this.leafCol = leafCol;

    this.axiom = "VZFFF";

    this.expansionRules = new Map();
    let er1Map: Map<string, number> = new Map();
    er1Map.set("[+++W][---W]YV", 1);
    this.expansionRules.set("V", new ExpansionRule(er1Map));
    let er2Map: Map<string, number> = new Map();
    er2Map.set("+X[-W]Z", 1);
    this.expansionRules.set("W", new ExpansionRule(er2Map));
    let er3Map: Map<string, number> = new Map();
    er3Map.set("-W[+X]Z", 1);
    this.expansionRules.set("X", new ExpansionRule(er3Map));
    let er4Map: Map<string, number> = new Map();
    er4Map.set("YZ", 1);
    this.expansionRules.set("Y", new ExpansionRule(er4Map));
    let er5Map: Map<string, number> = new Map();
    er5Map.set("[-FFF][+FFF]F", 1);
    this.expansionRules.set("Z", new ExpansionRule(er5Map));

    this.drawingRules = new Map();
    let dr1Map: Map<string, number> = new Map();
    dr1Map.set("branch", 1);
    this.drawingRules.set("F", new ExpansionRule(dr1Map));
    let dr2Map: Map<string, number> = new Map();
    dr2Map.set("branch", 1);
    this.drawingRules.set("V", new ExpansionRule(dr2Map));
    let dr3Map: Map<string, number> = new Map();
    dr3Map.set("branch", 1);
    this.drawingRules.set("W", new ExpansionRule(dr3Map));
    let dr4Map: Map<string, number> = new Map();
    dr4Map.set("branch", 1);
    this.drawingRules.set("X", new ExpansionRule(dr4Map));
    let dr5Map: Map<string, number> = new Map();
    dr5Map.set("branch", 1);
    this.drawingRules.set("Y", new ExpansionRule(dr5Map));
    let dr6Map: Map<string, number> = new Map();
    dr6Map.set("branch", 0.5);
    dr6Map.set("leaf", 0.5);
    this.drawingRules.set("Z", new ExpansionRule(dr6Map));
  }

  noise(p: vec3) {
    let val: number = Math.abs(Math.sin((p[0] * 10.0 + 100.0) * 987.654 + (p[1] * 10.0 + 100.0) * 123.456 + (p[2] * 10.0 + 100.0) * 531.975) * 85734.3545);
    return val - Math.floor(val);
  }

  expandString() {
    let currentString: string = this.axiom;
    let newString: string = "";
    for (let i: number = 0; i < this.iterations; i++) {
      for (let j: number = 0; j < currentString.length; j++) {
        let currentChar: string = currentString.charAt(j);
        if (this.expansionRules.has(currentChar)) {
          let er: ExpansionRule = this.expansionRules.get(currentChar);
          newString += er.chooseRandomRule();
        } else {
          newString += currentChar;
        }
      }
      currentString = newString;
      newString = "";
    }
    console.log(currentString);
    return currentString;
  }

  createPlant() {
    let expandedString: string = this.expandString();

    let turtles: Turtle[] = [];
    let rootCopy: vec3 = vec3.create();
    vec3.copy(rootCopy, this.root);
    turtles.push(new Turtle(rootCopy, vec3.fromValues(0,1,0), vec3.fromValues(0.2,1.0,0.2), 0));
    let firstBranchDrawn: boolean = false;
    let currentTurtle: Turtle = turtles[0];
    let initialTurtle: Turtle = turtles[0];
    for (let i: number = 0; i < expandedString.length; i++) {
      let currentChar: string = expandedString.charAt(i);
      if (this.drawingRules.has(currentChar)) {
        let dr: DrawingRule = this.drawingRules.get(currentChar);
        let rule: string = dr.chooseRandomRule();
        if (rule == "branch") {
          if (currentTurtle.scale[1] < 0.001) {
            continue;
          }

          if (currentTurtle != initialTurtle || firstBranchDrawn) {
            currentTurtle.rotate(vec3.fromValues(0,0,1), 30 * this.noise(currentTurtle.position) - 15);
            currentTurtle.rotate(vec3.fromValues(1,0,0), 30 * this.noise(currentTurtle.position) - 15);
          }
          if (currentTurtle.orientation[1] < 0) {
            currentTurtle.orientation[1] *= -1;
          }
          currentTurtle.scale[0] *= 0.96;
          currentTurtle.scale[1] *= 0.96;
          currentTurtle.scale[2] *= 0.96;

          let quaternion: quat = quat.fromValues(0,0,0,1);
          quat.rotationTo(quaternion, this.upVector, currentTurtle.orientation);
          quat.normalize(quaternion, quaternion);
          this.branchTranslate.push(currentTurtle.position[0], currentTurtle.position[1], currentTurtle.position[2], 0);
          this.branchRotate.push(quaternion[0], quaternion[1], quaternion[2], quaternion[3]);
          this.branchScale.push(currentTurtle.scale[0], currentTurtle.scale[1], currentTurtle.scale[2], 1);
          this.branchColor.push(this.branchCol[0], this.branchCol[1], this.branchCol[2], this.branchCol[3]);
          this.branchCount += 1
          firstBranchDrawn = true;

          currentTurtle.move();
        } else if (rule == "leaf") {
          if (currentTurtle.scale[1] < 0.01) {
            continue;
          }

          let quaternion: quat = quat.fromValues(0,0,0,1);
          quat.rotationTo(quaternion, this.upVector, currentTurtle.orientation);
          quat.normalize(quaternion, quaternion);
          this.leafTranslate.push(currentTurtle.position[0], currentTurtle.position[1], currentTurtle.position[2], 0);
          this.leafRotate.push(quaternion[0], quaternion[1], quaternion[2], quaternion[3]);
          this.leafScale.push(0.4,0.4,0.4,1);
          this.leafColor.push(this.leafCol[0], this.leafCol[1], this.leafCol[2], this.leafCol[3]);
          this.leafCount += 1;
        }
      } else {
        if (currentChar == "[") {
          let newTurtle: Turtle = currentTurtle.copy();
          newTurtle.depth += 1;
          newTurtle.rotate(vec3.fromValues(0,0,1), 30 * this.noise(currentTurtle.position) - 15);
          newTurtle.rotate(vec3.fromValues(1,0,0), 30 * this.noise(currentTurtle.position) - 15);
          turtles.push(newTurtle);

          currentTurtle.scale[0] *= 0.75;
          currentTurtle.scale[1] *= 0.9;
          currentTurtle.scale[2] *= 0.75;
        } else if (currentChar == "]") {
          if (currentTurtle.scale[1] < 0.001) {
            continue;
          }

          let quaternion: quat = quat.fromValues(0,0,0,1);
          quat.rotationTo(quaternion, this.upVector, currentTurtle.orientation);
          quat.normalize(quaternion, quaternion);
          this.leafTranslate.push(currentTurtle.position[0], currentTurtle.position[1], currentTurtle.position[2], 0);
          this.leafRotate.push(quaternion[0], quaternion[1], quaternion[2], quaternion[3]);
          this.leafScale.push(0.4,0.4,0.4,1);
          this.leafColor.push(this.leafCol[0], this.leafCol[1], this.leafCol[2], this.leafCol[3]);
          this.leafCount += 1;

          currentTurtle = turtles.pop();
        } else if (currentChar == "+") {
          let quaternion: quat = quat.fromValues(0,0,0,1);
          quat.rotationTo(quaternion, this.upVector, currentTurtle.orientation);
          quat.normalize(quaternion, quaternion);

          let tangent: vec3 = vec3.create();
          vec3.transformQuat(tangent, vec3.fromValues(1,0,0), quaternion);
          let bitTangent: vec3 = vec3.create();
          vec3.transformQuat(bitTangent, vec3.fromValues(0,0,1), quaternion);

          currentTurtle.rotate(tangent, 180 * this.noise(currentTurtle.position));
          currentTurtle.rotate(bitTangent, 60 * this.noise(currentTurtle.position));
        } else if (currentChar == "-") {
          let quaternion: quat = quat.fromValues(0,0,0,1);
          quat.rotationTo(quaternion, this.upVector, currentTurtle.orientation);
          quat.normalize(quaternion, quaternion);

          let tangent: vec3 = vec3.create();
          vec3.transformQuat(tangent, vec3.fromValues(1,0,0), quaternion);
          let bitTangent: vec3 = vec3.create();
          vec3.transformQuat(bitTangent, vec3.fromValues(0,0,1), quaternion);

          currentTurtle.rotate(tangent, -180 * this.noise(currentTurtle.position));
          currentTurtle.rotate(bitTangent, -60 * this.noise(currentTurtle.position));

        }
      }
    }
  }
};

export default Plant;
