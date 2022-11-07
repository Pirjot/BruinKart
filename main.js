import {defs, tiny} from './examples/common.js';
import { Body, Simulation} from './physics.js';


// Pull these names into this module's scope for convenience:
const {vec3, vec4, Mat4, Scene, Material, color, Light, unsafe3, hex_color} = tiny;


export class Main extends Simulation {
    constructor() {
        super();

        this.initial_camera_location = Mat4.look_at(vec3(0, 20, -50), vec3(0, 0, 0), vec3(0, 1, 0));

        this.shapes = {
            cube: new defs.Cube()
        }

        this.materials = {
            default: new Material(new defs.Phong_Shader(), {
                color: color(255/255, 120/255, 120/255, 1),
                ambient: 1
            })
        }

    }


    update_state(dt) {
        // Put a moving cube into the mix
        if (this.bodies.length == 0) {
            let body = new Body(
                this.shapes.cube,
                this.materials.default.override({
                    color: hex_color("#000012")
                }),
                vec3(1, 1, 1)
            );

            body.emplace(
                Mat4.identity(), // Starting position
                vec3(0, 0, 1), // Starting linear velocity
                0, // Starting angular velocity (can also specify angular axis)
            );

            this.bodies.push(body);
        }

        if (this.currentAngle == undefined) {
            this.currentAngle = 0;
        }

        let location = this.bodies[0].center;
        location = Mat4.translation(...location);

        // Apply a rotation
        this.angle = Math.PI / 8;
        let dtangle = dt * this.angle;
        this.currentAngle += dtangle;
        this.currentAngle = this.currentAngle % (2 * Math.PI);


        location = location.times(Mat4.rotation(this.currentAngle, 0, 1, 0));

        //Calculate the linear velocity to always be towards the z-axis after the rotation
        // Assume that the rotating axis is always the z-axis
        let linear_velocity = vec3(Math.sin(this.currentAngle), 0, Math.cos(this.currentAngle));

        this.bodies[0].emplace(location, linear_velocity, 0);

        // The above cancels the rotation, so you will need to apply it yourself.

        // Put another cube and check the collision between the two bodies
        if (this.bodies.length == 1) {
            let body = new Body(
                this.shapes.cube,
                this.materials.default.override({
                    color: hex_color("002300")
                }),
                vec3(1, 1, 1)
            );

            body.emplace(
                Mat4.identity().times(Mat4.translation(5, 0, 0)),
                vec3(0, 0, 0),
                0
            );

            this.bodies.push(body)
        }

        let collider = {
            intersect_test: Body.intersect_cube, 
            points: new defs.Cube(), 
            leeway: .1
        }

        this.bodies[0].inverse = Mat4.inverse(this.bodies[0].drawn_location);

        if (this.bodies[0].check_if_colliding(this.bodies[1], collider)) {
            console.log("Colliding")
            this.currentAngle = 0;
        }

    }



    display(context, program_state) {
        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);
        }

        // Default Projection Transform
        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, .1, 100);

        // Set lights
        program_state.lights = [new Light(vec4(0, 20, -50, 1), color(1, 1, 1, 1), 10000)];

        // Draw the ground
        let model_transform = Mat4.identity();
        model_transform = model_transform.times(Mat4.translation(0, -1.5, 0));
        model_transform = model_transform.times(Mat4.scale(20, .5, 20));
        this.shapes.cube.draw(context, program_state, model_transform, this.materials.default);
        
        
        // Simulate the physics environment, updating all bodies
        super.display(context, program_state);
    }
}