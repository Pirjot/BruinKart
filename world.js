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
     * Initialize and prepare the given 
     * @param {*} name 
     */
    constructor(name) {
        this.initialized = false;

        /**
         * Example:
         * "ground": {
         *      
         * }
         */
        this.activeShapes = {};
        this.activeBodies = {};
        this.numWalls = 0;

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
     * @param {*} scale (default is no scaling)
     * @param {*} location 
     * @param {*} color (default is red)
     */
    addWall(scale = vec3(1, 1, 1), location, color = hex_color("#cf2d21")) {
        this.addBody({
            name: `Wall-${this.numWalls}`,
            shape: globalShapes.cube,
            material: globalMaterials.default.override({
                color: color
            }),
            scale: scale,
            location: Mat4.translation(location[0], location[1], location[2])
        });
        this.numWalls++;
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

        // Add a body box (not in activeShapes)
        this.addBody({
            name: "box1",
            shape: globalShapes.cube,
            material: globalMaterials.default.override({
                color: hex_color("#375881")
            }),
            scale: vec3(1, 1, 1),
            location: Mat4.identity().times(Mat4.translation(0, 1, -10)),
        });

        // South Wall
        this.addWall(vec3(100, 1, 1), vec3(0, 1, 100));

        // North Wall
        this.addWall(vec3(100, 1, 1), vec3(0, 1, -100));

        // West Wall
        this.addWall(vec3(1, 1, 100), vec3(100, 1, 0));

        // East Wall
        this.addWall(vec3(1, 1, 100), vec3(-100, 1, 0));
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