/**
 * The Kart class, holding all the information for the creation of the Kart in a given World,
 * how it interacts with given user input, its physics and model transforms.
 * 
 * 
 * @author Pirjot Atwal
 */

import {defs, tiny} from './examples/common.js';
import {Body, Simulation} from './physics.js';
import {Model} from './model.js';

// Pull these names into this module's scope for convenience:
const {vec3, vec4, Mat4, Scene, Material, color, Light, unsafe3, hex_color} = tiny;

// Read user input globally (using deprecated keyCode)
globalThis.keys = {};

document.onkeydown = function(e){
    if(!keys[e.keyCode])   {
        keys[e.keyCode] = true;
    }
}

document.onkeyup = function(e){
    if(keys[e.keyCode])   {
        keys[e.keyCode] = false;
    }
}


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
        this.maxVelocityF = 10; // The max speed forward
        this.maxVelocityB = -5; // The max speed backward
        this.acceleration = .05; // Acceleration per dt forward
        this.slowDownSpeed = .01;

        // Angle Defaults
        this.maxDeltaAngle = Math.PI / 8; // The maximum movement that the kart can turn
        this.shortDeltaAngle = Math.PI / 128; // How much the kart can change its angle per frame
        this.slowDownAngle = Math.PI / 512;

        // Update params per frame
        this.angle = 0;
        this.deltaAngle = 0;
        this.velocity = 0;

        // Collider Default
        this.collider = {
            intersect_test: Body.intersect_cube, 
            points: new defs.Cube(), 
            leeways: [1, 1, 1]
        }
    }

    generateBody(options={}) {
        // Generate a body, TODO: Add the model for the kart here
        let model = globalShapes.model;
        let material = new Material(new defs.Phong_Shader(), {
            color: hex_color("#888888"),
            ambient: 1
        });
        let scale = vec3(1, 1, 1);
        let location = Mat4.translation(112, 1, 128);
        let velocity = vec3(0, 0, 0);

        this.body = new Body(model, material, scale);

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
        // First update the kart's current movement based on user input
        this.updateUserInput();

        // Rotation for given angle
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
        this.handleCollisions(location);
    }

    /**
     * Update the kart's parameters based on the input provided through the keyboard.
     * 
     * We update parameters such as this.velocity and this.deltaAngle.
     */
    updateUserInput() {
        // We use the globally set keys to see if a certain key is pressed
        // For now just use I, J, K, L for driving (73, 74, 75, 76)

        if (keys[73]) { // I
            // Accelerate
            this.velocity = Math.min(this.velocity + this.acceleration, this.maxVelocityF);
        } else if (keys[75]) { // K
            // Decelerate
            this.velocity = Math.max(this.velocity - this.acceleration, this.maxVelocityB);
        } else {
            // Create an artificial slow down effect
            this.velocity += this.velocity > 0 ? -1 * this.slowDownSpeed : this.slowDownSpeed;
        }

        if (keys[74]) { // J
            // Turn Left
            this.deltaAngle = Math.min(this.maxDeltaAngle, this.deltaAngle + this.shortDeltaAngle);
        } else if (keys[76]) { // L
            // Turn Right
            this.deltaAngle = Math.max(-1 * this.maxDeltaAngle, this.deltaAngle - this.shortDeltaAngle);
        } else {
            // Create an artificial straightening effect
            if (Math.abs(this.deltaAngle) < this.slowDownAngle) {
                this.deltaAngle = 0;
                return;
            }
            this.deltaAngle += this.deltaAngle > 0 ? -1 * this.slowDownAngle : this.slowDownAngle;
        }
    }

    /**
     * Handle Collisions by changing the way the kart reacts with its velocity.
     */
    handleCollisions(prevLocation) {
        // The inverse of the first body must be set
        this.body.inverse = Mat4.inverse(this.body.drawn_location);

        for (let i = 1; i < this.game.bodies.length; i++) {
            if (this.body.check_if_colliding(this.game.bodies[i], this.collider)) {
                /**
                 * We assume that the Kart is always traveling forward, in which case,
                 * after it incurs a collision, it can either end up solely at some distance
                 * on its x-axis or or on its z-axis, depending on the current angle.
                 */
                
                if (Math.abs(this.velocity) < 10 * this.slowDownSpeed) {
                    // The user turned in, so push the angle back
                    this.deltaAngle = -this.deltaAngle;
                    return;
                }

                // First reduce the velocity
                let val = 2 * this.velocity;
                let Z_PUSH = val / 5;
                this.velocity = 0;
                
                prevLocation = prevLocation.times(Mat4.translation(0, 0, -Z_PUSH));
                
                // Apply emplace
                this.body.emplace(prevLocation, vec3(0, 0, -val), 0);
                this.body.inverse = Mat4.inverse(this.body.drawn_location);

                if (this.body.check_if_colliding(this.game.bodies[i], this.collider)) {
                    prevLocation = prevLocation.times(Mat4.translation(0, 0, 2 * Z_PUSH));
                    this.body.emplace(prevLocation, vec3(0, 0, val), 0);
                }

                this.velocity = -val / 5;
            }
        }
    }

    /**
     * Return the camera position for behind the kart.
     */
    getBackCam() {
        // Generate the matrix using the drawn location
        let drawn = this.body.drawn_location;
        
        // TODO: Hard set the parameters for the camera as alterable
        drawn = drawn.times(Mat4.translation(0, 10, -20));
        drawn = drawn.times(Mat4.rotation(Math.PI / 8, 1, 0, 0));
        drawn = drawn.times(Mat4.rotation(Math.PI, 0, 1, 0));

        drawn = Mat4.inverse(drawn);

        return drawn;
    }

    /**
     * Return the camera position for the front of the kart.
     */
    getFrontCam() {
        // Generate the matrix 
        let drawn = this.body.drawn_location;

        drawn = drawn.times(Mat4.translation(0, 0, 3));
        drawn = drawn.times(Mat4.rotation(Math.PI, 0, 1, 0));
        drawn = Mat4.inverse(drawn);

        return drawn;
    }
}