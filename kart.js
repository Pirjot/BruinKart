/**
 * The Kart class, holding all the information for the creation of the Kart in a given World,
 * how it interacts with given user input, its physics and model transforms.
 * 
 * 
 * @author Pirjot Atwal
 */

import {defs, tiny} from './examples/common.js';
import {Body, Simulation} from './physics.js';

// Pull these names into this module's scope for convenience:
const {vec3, vec4, Mat4, Scene, Material, color, Light, unsafe3, hex_color} = tiny;

export class Kart {
    /**
     * Construct a new Kart.
     * 
     * Using the given game we can check all bodies that the
     * kart's body may collide with.
     * @param {BruinKart} game 
     */
    constructor(game, options={}) {
        this.game = game;
        
        // TODO: Provide ability to alter Kart default parameters through options
        this.generateBody(options);

        // Set default values for angles and movement parameters (acceleration, max_speed, etc.)
        this.angle = -Math.PI / 5 + .09;
        this.deltaAngle = Math.PI / 32;
        this.velocity = 3;

        // Collider Default
        this.collider = {
            intersect_test: Body.intersect_cube, 
            points: new defs.Cube(), 
            leeway: .1
        }

        // TODO: Remove this
        this.messaged = false;
    }

    generateBody(options={}) {
        // Generate a body, TODO: Add the model for the kart here
        let cube = globalShapes.cube;
        let material = new Material(new defs.Phong_Shader(), {
            color: hex_color("#00AA00"),
            ambient: 1
        });
        let scale = vec3(1, 1, 1);
        let location = Mat4.identity().times(Mat4.translation(0, 1, 0));
        let velocity = vec3(0, 0, 1);

        this.body = new Body(cube, material, scale);

        // Make sure to emplace the body (velocity and angular will be hijacked regardless)
        this.body.emplace(location, velocity, 0);
    }

    /**
     * Provide the kart's body into the game's body array
     * @param {*} bodies 
     */
    initializeBody(bodies) {
        bodies[0] = this.body;
    }

    /**
     * Update the body based on user inputs.
     * 
     * We hijack movement and rotation controls from the simulation here.
     * @param {*} dt 
     */
    update(dt) {
        // DEMO MODE, Rotation with following forward only
        this.angle += dt * this.deltaAngle;
        this.angle = this.angle % (2 * Math.PI);
        
        // Get the current location and rotate it by the angle
        let location = this.body.center;
        location = Mat4.translation(...location);
        location = location.times(Mat4.rotation(this.angle, 0, 1, 0));

        // Calculate rotation for velocity
        let linear_velocity = vec3(Math.sin(this.angle), 0, Math.cos(this.angle)).times(this.velocity);
        
        // Apply emplace
        this.body.emplace(location, linear_velocity, 0);

        // Handle collisions with other bodies in the game world (Maybe send the location and linear_velocity to the collisions?)
        this.handleCollisions();
    }

    /**
     * Handle Collisions by changing the way the kart reacts with its velocity.
     */
    handleCollisions() {
        // DEMO MODE, just alert collision message

        // The inverse of the first body must be set
        this.body.inverse = Mat4.inverse(this.body.drawn_location);

        for (let i = 1; i < this.game.bodies.length; i++) {
            if (this.body.check_if_colliding(this.game.bodies[i], this.collider)) {
                if (!this.messaged) {
                    alert("'BONK!' in Zane's Voice would play at this moment.");
                    this.messaged = true;
                }
            }
        }

    }
}