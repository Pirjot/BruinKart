/**
 * The World Class, storing the values for all scenes/worlds/tracks.
 * 
 * 
 * @author Zane Witter, Pirjot Atwal
 */

import {defs, tiny} from './examples/common.js';
import {Body, Simulation} from './physics.js';

// Pull these names into this module's scope for convenience:
const {vec3, vec4, Mat4, Scene, Material, color, Light, unsafe3, hex_color} = tiny;

/**
 * A Helper class to abstractify the operation of setting up certain
 * scenes in a given world.
 * 
 */
export class World {
    /**
     * Initialize and prepare the given world.
     * @param {*} name 
     */
    constructor(name) {
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
     * @param {vec3} dims The x,y,z dimensions of the wall 
     * @param {vec3} location The x,y,z coordinates where the top left (least x, least z)
     *                        of the wall should be placed
     * @param {vec3} color (default is red)
     */
    addWall(dims, location, color = hex_color("#cf2d21")) {
        this.addBody({
            name: `Wall-${this.numWalls}`,
            shape: globalShapes.cube,
            material: globalMaterials.default.override({
                color: color,
                ambient: 1
            }),
            scale: vec3(dims[0] / 2, dims[1] / 2, dims[2] / 2),
            location: Mat4.translation(location[0], location[1], location[2]).times(
                Mat4.translation(dims[0] / 2, dims[1] / 2, dims[2] / 2)
            )
        });
        this.numWalls++;
    }

    // Emplace the outer edges of the racetrack
    createOuterBoundary() {
        const red = this.colors.red;
        const green = this.colors.green;
        const blue = this.colors.blue;
        const yellow = this.colors.yellow;

        this.addWall(vec3(44, 2, 2), vec3(-50, 0, 48), blue);
        this.addWall(vec3(2, 2, 96), vec3(-50, 0, -48), red);
        this.addWall(vec3(64, 2, 2), vec3(-50, 0, -50), blue);
        this.addWall(vec3(2, 2, 18), vec3(12, 0, -48), green);
        this.addWall(vec3(38, 2, 2), vec3(12, 0, -30), blue);
        this.addWall(vec3(2, 2, 76), vec3(48, 0, -28), green);
        this.addWall(vec3(48, 2, 2), vec3(2, 0, 48), blue);
        this.addWall(vec3(2, 2, 18), vec3(2, 0, 30), green);
        this.addWall(vec3(12, 2, 2), vec3(-8, 0, 28), blue);
        this.addWall(vec3(2, 2, 18), vec3(-8, 0, 30), green);
    }

    // Emplace the inner edges of the racetrack
    createInnerBoundary() {
        const red = this.colors.red;
        const green = this.colors.green;
        const blue = this.colors.blue;
        const yellow = this.colors.yellow;

        this.addWall(vec3(2, 2, 60), vec3(-28, 0, -32), red);
        this.addWall(vec3(16, 2, 2), vec3(-26, 0, -32), green);
        this.addWall(vec3(2, 2, 22), vec3(-10, 0, -32), red);
        this.addWall(vec3(28, 2, 2), vec3(-8, 0, -12), yellow);
        this.addWall(vec3(2, 2, 38), vec3(18, 0, -10), green);
        this.addWall(vec3(44, 2, 2), vec3(-26, 0, 14), blue);
    }

    // Emplace miscellaneous obstacles
    createObstacles() {
        const red = this.colors.red;
        const green = this.colors.green;
        const blue = this.colors.blue;
        const yellow = this.colors.yellow;

        this.addWall(vec3(4, 2, 2), vec3(24, 0, 4), blue);
        this.addWall(vec3(4, 2, 2), vec3(40, 0, 4), red);
        this.addWall(vec3(12, 2, 2), vec3(28, 0, 20), yellow);
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
            "shape": globalShapes.cube,
            "material": globalMaterials.default.override({
                "color": hex_color("#666666")
            }),
            "transform": Mat4.identity().times(Mat4.translation(0, -.5, 0)).times(Mat4.scale(100, .5, 100))
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