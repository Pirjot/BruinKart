/**
 * The World Class, storing the values for all scenes/worlds/tracks.
 * 
 * 
 * @author Zane Witter, Pirjot Atwal
 */

import {defs, tiny} from './examples/common.js';
import {Body, Simulation} from './physics.js';

// Pull these names into this module's scope for convenience:
const {vec, vec3, vec4, Mat4, Scene, Material, Texture, color, Light, unsafe3, hex_color} = tiny;
const {Cube, Textured_Phong} = defs

/**
 * A Helper class to abstractify the operation of setting up certain
 * scenes in a given world.
 * 
 */
export class World {
    /**
     * Initialize and prepare the given 
     * @param {*} name 
     */
    constructor(name) {
        this.initialized = false;

        /**
         * Example:
         * "ground": {
                "shape": globalShapes.cube,
                "material": globalMaterials.default.override({
                    "color": hex_color("#666666")
                }),
                "transform": Mat4.identity().times(Mat4.translation(0, -.5, 0)).times(Mat4.scale(30, .5, 30))
            }
         */
        this.activeShapes = {};
        this.activeBodies = {};
        this.numWalls = 0;
        this.colors = {
            red: hex_color("#FF0000"),
            green: hex_color("#00FF00"),
            blue: hex_color("#0000FF"),
            yellow: hex_color("#FFFF00")
        }
        this.materials = {
            ground: new Material(new defs.Textured_Phong(1), {
                color: hex_color("#000000"), ambient: 1.0,
                texture: new Texture("assets/ground.png")}),
            mult32x2: new Material(new defs.Textured_Phong(1), {
                color: hex_color("#000000"), ambient: 1.0,
                texture: new Texture("assets/mult32x2.png")}),
            red2x2: new Material(new defs.Textured_Phong(1), {
                color: hex_color("#000000"), ambient: 1.0,
                texture: new Texture("assets/red2x2.png")}),
            yellow2x2: new Material(new defs.Textured_Phong(1), {
                color: hex_color("#000000"), ambient: 1.0,
                texture: new Texture("assets/yellow2x2.png")}),
            green2x2: new Material(new defs.Textured_Phong(1), {
                color: hex_color("#000000"), ambient: 1.0,
                texture: new Texture("assets/green2x2.png")}),
            blue2x2: new Material(new defs.Textured_Phong(1), {
                color: hex_color("#000000"), ambient: 1.0,
                texture: new Texture("assets/blue2x2.png")}),
            red4x2: new Material(new defs.Textured_Phong(1), {
                color: hex_color("#000000"), ambient: 1.0,
                texture: new Texture("assets/red4x2.png")}),
            yellow4x2: new Material(new defs.Textured_Phong(1), {
                color: hex_color("#000000"), ambient: 1.0,
                texture: new Texture("assets/yellow4x2.png")}),
            green4x2: new Material(new defs.Textured_Phong(1), {
                color: hex_color("#000000"), ambient: 1.0,
                texture: new Texture("assets/green4x2.png")}),
            blue4x2: new Material(new defs.Textured_Phong(1), {
                color: hex_color("#000000"), ambient: 1.0,
                texture: new Texture("assets/blue4x2.png")}),  
        }
        this.shapes = {
            ground: new Cube(),
            multEW32: new Cube(),
            multNS32: new Cube(),
            multWE32: new Cube(),
            multSN32: new Cube(),
            solidEW6: new Cube(),
            solidNS6: new Cube()
        }
        this.shapes.ground.arrays.texture_coord = [
            vec(0, 0), vec(1, 0), vec(0, 1), vec(1, 1),       // Bottom face
            vec(0, 0), vec(-1, 0), vec(0, 1), vec(-1, 1),     // Top face
            vec(0, 0), vec(1, 0), vec(0, 1), vec(1, 1),       // East face
            vec(0, 0), vec(1, 0), vec(0, 1), vec(1, 1),       // West face
            vec(0, 0), vec(1, 0), vec(0, 1), vec(1, 1),       // South face
            vec(0, 0), vec(1, 0), vec(0, 1), vec(1, 1)        // North face    
        ];
        this.shapes.multEW32.arrays.texture_coord = [
            vec(0, 0), vec(1, 0), vec(0, 1), vec(1, 1),         // Bottom face
            vec(0, 0), vec(-1, 0), vec(0, 1), vec(-1, 1),       // Top face
            vec(0, 0), vec(1/16, 0), vec(0, 1), vec(1/16, 1),   // East face
            vec(15/16, 0), vec(1, 0), vec(15/16, 1), vec(1, 1), // West face
            vec(0, 0), vec(1, 0), vec(0, 1), vec(1, 1),         // South face
            vec(0, 0), vec(-1, 0), vec(0, 1), vec(-1, 1)        // North face
        ];
        this.shapes.multNS32.arrays.texture_coord = [
            vec(0, 0), vec(0, 1), vec(1, 0), vec(1, 1),         // Bottom face
            vec(0, 0), vec(0, 1), vec(1, 0), vec(1, 1),         // Top face
            vec(0, 0), vec(1, 0), vec(0, 1), vec(1, 1),         // East face
            vec(0, 0), vec(-1, 0), vec(0, 1), vec(-1, 1),       // West face
            vec(15/16, 0), vec(1, 0), vec(15/16, 1), vec(1, 1), // South face
            vec(0, 0), vec(1/16, 0), vec(0, 1), vec(1/16, 1)    // North face
        ];
        this.shapes.multWE32.arrays.texture_coord = [
            vec(0, 0), vec(-1, 0), vec(0, -1), vec(-1, -1),             // Bottom face
            vec(0, 0), vec(1, 0), vec(0, -1), vec(1, -1),               // Top face
            vec(0, 0), vec(-1/16, 0), vec(0, -1), vec(-1/16, -1),       // East face
            vec(-15/16, 0), vec(-1, 0), vec(-15/16, -1), vec(-1, -1),   // West face
            vec(0, 0), vec(-1, 0), vec(0, -1), vec(-1, -1),             // South face
            vec(0, 0), vec(1, 0), vec(0, -1), vec(1, -1)                // North face
        ];
        this.shapes.multSN32.arrays.texture_coord = [
            vec(0, 0), vec(0, -1), vec(-1, 0), vec(-1, -1),             // Bottom face
            vec(0, 0), vec(0, -1), vec(-1, 0), vec(-1, -1),             // Top face
            vec(0, 0), vec(-1, 0), vec(0, -1), vec(-1, -1),             // East face
            vec(0, 0), vec(1, 0), vec(0, -1), vec(1, -1),               // West face
            vec(-15/16, 0), vec(-1, 0), vec(-15/16, -1), vec(-1, -1),   // South face
            vec(0, 0), vec(-1/16, 0), vec(0, -1), vec(-1/16, -1)        // North face
        ];
        this.shapes.solidEW6.arrays.texture_coord = [
            vec(0, 0), vec(1, 0), vec(0, 1), vec(1, 1),         // Bottom face
            vec(0, 0), vec(1, 0), vec(0, 1), vec(1, 1),         // Top face
            vec(0, 0), vec(1/2, 0), vec(0, 1), vec(1/2, 1),     // East face
            vec(0, 0), vec(1/2, 0), vec(0, 1), vec(1/2, 1),     // West face
            vec(0, 0), vec(1, 0), vec(0, 1), vec(1, 1),         // South face
            vec(0, 0), vec(1, 0), vec(0, 1), vec(1, 1)          // North face
        ];
        this.shapes.solidNS6.arrays.texture_coord = [
            vec(0, 0), vec(0, 1), vec(1, 0), vec(1, 1),         // Bottom face
            vec(0, 0), vec(0, 1), vec(1, 0), vec(1, 1),         // Top face
            vec(0, 0), vec(1, 0), vec(0, 1), vec(1, 1),         // East face
            vec(0, 0), vec(1, 0), vec(0, 1), vec(1, 1),         // West face
            vec(0, 0), vec(1/2, 0), vec(0, 1), vec(1/2, 1),     // South face
            vec(0, 0), vec(1/2, 0), vec(0, 1), vec(1/2, 1)      // North face
        ];

        switch (name) {
            default:
                this.initDefault();
        }
    }

    /**
     * Add a new body to this.bodies and emplace it.
     * 
     * 
     * NOTE: Ensure that all calls to this happen before initializeBodies
     * is called by the master controller so that all bodies are prepared
     * before they are added to the actual bodies array for drawing.
     * 
     * @param {JSON} params A JSON object of the following type:
     * 
     * {
     *      name: <String>,
     *      shape: <Shape>,
     *      material: <Material>,
     *      scale: <Vec3>,
     *      location: <Mat4>,
     *      velocity: <Vec3> (Usually 0, 0, 0)
     *      angular: <Number> (Usually 0)
     *      spin_axis: <Vec3> (Usually unspecified)
     * }
     * 
     */
    addBody(params) {
        // Generate a body and place it using the params provided
        let body = new Body(params.shape, params.material, params.scale);

        // Make sure to emplace the body
        body.emplace(params.location, params.velocity, params.angular, params.spin_axis);

        this.activeBodies[params.name] = body;
    }

    /**
     * A wrapper function for addBody which can place scaled cubes ("walls") at a given location.
     * The corresponding wall will be named "Wall-i", where i is the number of walls that have
     * been placed using this function.
     * @param {string} wall Specifies what kind of wall to build to determine 
     *                      color, orientation, and dimensions. 
     *                      For example, multEW32 is a multicolored 32x2x2 wall that runs east/west
     *                      Valid walls are:
     *                      - multEW32, multNS32, multWE32, multSN32
     *                      - redEW4, redNS4, red2
     *                      - yellowEW4, yellowNS4, yellow2
     *                      - greenEW4, greenNS4, green4
     *                      - blueEW4, blueNS4, blue4
     * @param {vec3} location The x,y,z coordinates where the top left (least x, least z)
     *                        of the wall should be placed
     */
    addWall(wall, location) {
        const wallName = `Wall-${this.numWalls}`;
        let material = globalMaterials.default;
        let shape = globalShapes.cube;
        let dims = vec3(2, 2, 2);
        switch(wall) {
            case "multEW32":
                shape = this.shapes.multEW32;
                material = this.materials.mult32x2; 
                dims = vec3(32, 2, 2); break;
            case "multNS32": 
                shape = this.shapes.multNS32; 
                material = this.materials.mult32x2; 
                dims = vec3(2, 2, 32); break;
            case "multWE32":
                shape = this.shapes.multWE32;
                material = this.materials.mult32x2;
                dims = vec3(32, 2, 2); break;
            case "multSN32":
                shape = this.shapes.multSN32;
                material = this.materials.mult32x2;
                dims = vec3(2, 2, 32); break;
            case "red2":
                shape = globalShapes.cube;
                material = this.materials.red2x2;
                dims = vec3(2, 2, 2); break;
            case "yellow2":
                shape = globalShapes.cube;
                material = this.materials.yellow2x2;
                dims = vec3(2, 2, 2); break;
            case "green2":
                shape = globalShapes.cube;
                material = this.materials.green2x2;
                dims = vec3(2, 2, 2); break;
            case "blue2":
                shape = globalShapes.cube;
                material = this.materials.blue2x2;
                dims = vec3(2, 2, 2); break;
            case "redEW4": case "redWE4":
                shape = this.shapes.solidEW6;
                material = this.materials.red4x2;
                dims = vec3(4, 2, 2); break;
            case "redNS4": case "redSN4":
                shape = this.shapes.solidNS6;
                material = this.materials.red4x2;
                dims = vec3(2, 2, 4); break;
            case "yellowEW4": case "yellowWE4":
                shape = this.shapes.solidEW6;
                material = this.materials.yellow4x2;
                dims = vec3(4, 2, 2); break;
            case "yellowNS4": case "yellowSN4":
                shape = this.shapes.solidNS6;
                material = this.materials.yellow4x2;
                dims = vec3(2, 2, 4); break;
            case "greenEW4": case "greenWE4":
                shape = this.shapes.solidEW6;
                material = this.materials.green4x2;
                dims = vec3(4, 2, 2); break;
            case "greenNS4": case "greenSN4":
                shape = this.shapes.solidNS6;
                material = this.materials.green4x2;
                dims = vec3(2, 2, 4); break;
            case "blueEW4": case "blueWE4":
                shape = this.shapes.solidEW6;
                material = this.materials.blue4x2;
                dims = vec3(4, 2, 2); break;
            case "blueNS4": case "blueSN4":
                shape = this.shapes.solidNS6;
                material = this.materials.blue4x2;
                dims = vec3(2, 2, 4); break;
        }

        this.addBody({
            name: wallName,
            shape: shape,
            material: material,
            scale: vec3(dims[0] / 2, dims[1] / 2, dims[2] / 2),
            location: Mat4.translation(location[0], location[1], location[2]).times(
                Mat4.translation(dims[0] / 2, dims[1] / 2, dims[2] / 2)
            )
        });
        this.numWalls++;
    }

    // Emplace the outer edges of the racetrack
    createOuterBoundary() {
        for (let x = 0; x < 128; x += 32) {
            this.addWall("multEW32", vec3(x, 0, 0));
        }
        for (let z = 0; z < 256; z += 32) {
            this.addWall("multSN32", vec3(126, 0, z));
        }
        for (let z = 0; z < 256; z += 32) {
            this.addWall("multNS32", vec3(0, 0, z));
        }
        for (let x = 0; x < 128; x += 32 ) {
            this.addWall("multWE32", vec3(x, 0, 254));
        } 
        this.addWall("multEW32", vec3(0, 0, 96));
        this.addWall("multSN32", vec3(30, 0, 96));
        this.addWall("multSN32", vec3(30, 0, 128));
        this.addWall("multWE32", vec3(0, 0, 158));
    }

    // Emplace the inner edges of the racetrack
    createInnerBoundary() {
        for (let x = 32; x < 96; x += 32) {
            this.addWall("multEW32", vec3(x, 0, 32));
        }
        for (let z = 32; z < 224; z += 32) {
            this.addWall("multSN32", vec3(94, 0, z));
        }
        for (let x = 32; x < 96; x += 32) {
            this.addWall("multWE32", vec3(x, 0, 222));
        }
        this.addWall("multNS32", vec3(32, 0, 192));
        this.addWall("multEW32", vec3(32, 0, 192));
        for (let z = 64; z < 192; z += 32) {
            this.addWall("multNS32", vec3(64, 0, z));
        }
        this.addWall("multWE32", vec3(32, 0, 62));
        this.addWall("multNS32", vec3(32, 0, 32));
    }

    // Emplace miscellaneous obstacles
    createObstacles() {
        this.addWall("blueNS4", vec3(64, 0, 224));
        this.addWall("blueNS4", vec3(64, 0, 250));
        this.addWall("blueNS4", vec3(64, 0, 246));
        this.addWall("blueNS4", vec3(64, 0, 242));

        this.addWall("redEW4", vec3(24, 0, 228));
        this.addWall("redEW4", vec3(24, 0, 230));

        this.addWall("greenEW4", vec3(48, 0, 128));
        this.addWall("greenEW4", vec3(48, 0, 126));

        this.addWall("yellowEW4", vec3(36, 0, 86));
        this.addWall("yellowEW4", vec3(36, 0, 88));

        this.addWall("yellowNS4", vec3(40, 0, 10));
        this.addWall("yellowNS4", vec3(40, 0, 22));

        this.addWall("blueNS4", vec3(60, 0, 14));
        this.addWall("blueNS4", vec3(60, 0, 18));
    }

    /**
     * Setup the default world and draw it and ensure that its bodies are added.
     * 
     * The Default world solely contains a single box and the ground.
     * 
     * As default, we assume the ground will always have a height of 1 in the y direction,
     * and the top of the ground will be at y = 0. 
     */
    initDefault() {
        // Add the ground
        this.activeShapes["ground"] = {
            "shape": this.shapes.ground,
            "material": this.materials.ground,
            "transform": Mat4.translation(64, -.5, 128).times(Mat4.scale(64, .5, 128))
        }

        this.createOuterBoundary();
        this.createInnerBoundary();
        this.createObstacles();
    }

    /**
     * Append all the static bodies to the given bodies array.
     * 
     * Assume that the first element is to be ignored, as it represents the kart's body
     * @param {*} bodies 
     */
    initializeBodies(bodies) {
        if (bodies.length < 1) {
            alert("The Kart needs to be initialized first");
            return;
        } else {
            bodies.splice(1, bodies.length);
        }

        let myBodies = Object.values(this.activeBodies);

        for (let i = 0; i < myBodies.length; i++) {
            bodies.push(myBodies[i]);
        }
    }

    /**
     * Draw all the shapes (not the bodies, which are drawn in simulation)
     * @param {*} context 
     * @param {*} program_state 
     */
    drawWorld(context, program_state) {
        let shapes = Object.values(this.activeShapes);

        for (let i = 0; i < shapes.length; i++) {
            let shape = shapes[i];

            shape["shape"].draw(context, program_state, shape["transform"], shape["material"]);
        }
    }
}