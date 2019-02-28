import {vec3, vec4, mat3, mat4, quat} from 'gl-matrix';
import Drawable from './rendering/gl/Drawable';
import {gl} from './globals';
import Turtle from './Turtle';
import ExpansionRule from './ExpansionRule';
import DrawingRule from './DrawingRule';

class Plant {
  upVector: vec3 = vec3.fromValues(0,1,0);
  root: vec3;
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

    this.axiom = "F";

    this.expansionRules = new Map();
    let er1Map: Map<string, number> = new Map();
    er1Map.set("FF+[+F-F-F]-[-F+F+F]", 1);
    this.expansionRules.set("F", new ExpansionRule(er1Map));

    this.drawingRules = new Map();
    let dr1Map: Map<string, number> = new Map();
    dr1Map.set("branch", 1);
    this.drawingRules.set("F", new ExpansionRule(dr1Map));
  }

  noise(p: vec3) {
    let val: number = Math.abs(Math.sin(p[0] * 987.654 + p[1] * 123.456 + p[2] * 531.975) * 85734.3545);
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
    return currentString;
  }

  createPlant() {
    let expandedString: string = this.expandString();

    let turtles: Turtle[] = [];
    turtles.push(new Turtle(this.root, vec3.fromValues(0,1,0), vec3.fromValues(2,2,2), 0));

    let firstBranchDrawn: boolean = false;
    let currentTurtle: Turtle = turtles[0];
    let initialTurtle: Turtle = turtles[0];
    for (let i: number = 0; i < expandedString.length; i++) {
      let currentChar: string = expandedString.charAt(i);
      if (this.drawingRules.has(currentChar)) {
        let dr: DrawingRule = this.drawingRules.get(currentChar);
        let rule: string = dr.chooseRandomRule();
        if (rule == "branch") {
          if (currentTurtle.scale[1] < 0.01) {
            continue;
          }

          if (currentTurtle != initialTurtle || firstBranchDrawn) {
            currentTurtle.rotate(vec3.fromValues(0,0,1), 10 * this.noise(currentTurtle.position) - 5);
            currentTurtle.rotate(vec3.fromValues(1,0,0), 10 * this.noise(currentTurtle.position) - 5);
          }
          if (currentTurtle.orientation[1] < 0 && currentTurtle.depth < 7) {
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

          currentTurtle.move();
        } else if (rule == "leaf") {
          if (currentTurtle.scale[1] < 0.01 || currentTurtle.depth < 3) {
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
          newTurtle.rotate(vec3.fromValues(0,0,1), 10 * this.noise(currentTurtle.position) - 5);
          newTurtle.rotate(vec3.fromValues(1,0,0), 10 * this.noise(currentTurtle.position) - 5);
          turtles.push(newTurtle);

          currentTurtle.scale[0] *= 0.75;
          currentTurtle.scale[1] *= 1.0;
          currentTurtle.scale[2] *= 0.75;
        } else if (currentChar == "]") {
          currentTurtle = turtles.pop();
        } else if (currentChar == "+") {
          let rotationMatrix: mat4 = mat4.create();
          let target: vec3 = vec3.create();
          vec3.add(target, currentTurtle.position, currentTurtle.orientation);
          mat4.targetTo(rotationMatrix, currentTurtle.position, target, this.upVector);

          let tangent4: vec4 = vec4.create();
          vec4.transformMat4(tangent4, vec4.fromValues(1,0,0,1), rotationMatrix);
          let tangent: vec3 = vec3.fromValues(tangent4[0], tangent4[1], tangent4[2]);

          let bitTangent4: vec4 = vec4.create();
          vec4.transformMat4(bitTangent4, vec4.fromValues(0,0,1,1), rotationMatrix);
          let bitTangent: vec3 = vec3.fromValues(bitTangent4[0], bitTangent4[1], bitTangent4[2]);

          currentTurtle.rotate(tangent, 30 * this.noise(currentTurtle.position));
          currentTurtle.rotate(bitTangent, 30 * this.noise(currentTurtle.position));
        } else if (currentChar == "-") {
          let rotationMatrix: mat4 = mat4.create();
          let target: vec3 = vec3.create();
          vec3.add(target, currentTurtle.position, currentTurtle.orientation);
          mat4.targetTo(rotationMatrix, currentTurtle.position, target, this.upVector);

          let tangent4: vec4 = vec4.create();
          vec4.transformMat4(tangent4, vec4.fromValues(1,0,0,1), rotationMatrix);
          let tangent: vec3 = vec3.fromValues(tangent4[0], tangent4[1], tangent4[2]);

          let bitTangent4: vec4 = vec4.create();
          vec4.transformMat4(bitTangent4, vec4.fromValues(0,0,1,1), rotationMatrix);
          let bitTangent: vec3 = vec3.fromValues(bitTangent4[0], bitTangent4[1], bitTangent4[2]);

          currentTurtle.rotate(tangent, -30 * this.noise(currentTurtle.position));
          currentTurtle.rotate(bitTangent, -30 * this.noise(currentTurtle.position));
        }
      }
    }
  }
};

export default Plant;
