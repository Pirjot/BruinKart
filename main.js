import {defs, tiny} from './examples/common.js';
import {Body, Simulation} from './physics.js';
import {Kart} from './kart.js';
import {World} from './world.js';


// Pull these names into this module's scope for convenience:
const {vec3, vec4, Mat4, Scene, Material, color, Light, unsafe3, hex_color} = tiny;

// Globally initialize the needed shapes and materials for use

// Load all necessary shapes onto the GPU
globalThis.globalShapes = {
    cube: new defs.Cube()
}

// Load all needed materials
globalThis.globalMaterials = {
    default: new Material(new defs.Phong_Shader())
}


/**
 * The BruinKart class comprises of a Mario Kart Simulation.
 * 
 * this.kart = The Kart body, which can respond to user inputs and collisions.
 * this.shapes = Generic Shapes that can be used
 * this.world = A JSON object of elements and their transform/material information.
 * -- The Kart can collide with certain portions of the world.
 * 
 * The Kart object has its own body, an internal shape, and is 
 */

export class BruinKart extends Simulation {
    constructor() {
        super();

        this.initial_camera_location = Mat4.look_at(
            vec3(0, 20, -50), // Initial Camera position (Backed up by 50 and up high by 20)
            vec3(0, 0, 0), // Look at the origin
            vec3(0, 1, 0) // Top Vector (parallel with y)
        );

        // Load the Kart and the world in default positions
        this.kart = new Kart(this);
        this.world = new World("default");

        // this.bodies allocated as empty array to hold all needed bodies

        /**
         * Because the internal makeup of this.bodies is an array (OOF!),
         * we need to ensure that all the elements in this.bodies correctly represent
         * both all bodies that need to be active and where they are located.
         * 
         * In general, we only work with two types of bodies. 
         * The first type is (this.bodies[0]) is the Kart.
         * The Kart needs to be passed this body on every update_state so that
         * it can hijack the placement and rotation behavior.
         * 
         * The second type is (this.bodies[1:]) is the bodies of the World that are collidable.
         * The World needs to only be passed its bodies array at the time of initialization.
         */
        this.kart.initializeBody(this.bodies);
        this.world.initializeBodies(this.bodies);


        // We also have access to simulation time variables (check default Simulation Class)

        /**
         * Attached Camera position, can be behind the kart or in front of for now.
         * 
         * Values:
         * default
         * kartBack
         * kartFront
         * 
         * (Check this.attachCamera func to see how this is handled)
         */
        this.attachedCamera = "default";
        this.cameraListener = false;

        this.initialized = false;
    }

    /**
     * Create the control_panel, (TODO: Fill in extra buttons if needed, otherwise
     * read from the keyboard manually using JS)
     */
    make_control_panel() {
        this.key_triggered_button("Previous collider", ["b"], this.decrease);
        this.key_triggered_button("Next", ["n"], this.increase);
        this.new_line();
        super.make_control_panel();
    }

    /**
     * Update the Physics engine with the given time step.
     * (Automatically accounts for simulation time lag to keep up with realtime framerate.)
     * 
     * Example: If we need to update the value of velocity based on 
     * gravity, then new_velocity = old_velocity + (-9.8) * dt
     * @param {*} dt 
     */
    update_state(dt) {
        // Let the kart update its body (hijacks the body controls with emplace)
        this.kart.update(dt);

        // TODO: Pass the Kart / World to any external controllers as needed
        // this.GUIController.update(this.kart);

        // Attach the camera to the kart if needed
        this.handleCameraChoice();
    }



    /**
     * Check if the user presses C, in which case we toggle on the camera status to
     * get the Kart.
     */
    handleCameraChoice() {
        /**
         * Return the next camera given the currCam option.
         * @param {*} currCam 
         */
        function nextCam(currCam) {
            return currCam == "default"   ? "kartBack" : 
                   currCam == "kartBack" ? "kartFront" : 
                                            "default";
        }

        if (!this.cameraListener) {
            document.addEventListener("keydown", (evt) => {
                // Set this.attachedCamera string accordingly
                if (evt.keyCode == 67) { // Equal to c
                    this.attachedCamera = nextCam(this.attachedCamera);
                }
            });
            this.cameraListener = true;
        }

    }

    /**
     * Set up the scene's default attributes such as the projection transform, camera, and lights.
     * @param {*} context
     * @param {*} program_state 
     */
    setupDefaults(context, program_state) {
        if (this.initialized) {
            return;
        }
        
        // Camera attributes
        const ANGLE = Math.PI / 4;
        const NEAR = .1;
        const FAR = 1000;

        // Light attributes (by default, white and at given position)
        const LIGHT_POS = vec4(0, 20, -50, 1);
        const SIZE = 10000;
        
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);
        }

        // Default Projection Transform
        program_state.projection_transform = Mat4.perspective(
            ANGLE, context.width / context.height, NEAR, FAR);

        // Set lights
        program_state.lights = [new Light(LIGHT_POS, color(1, 1, 1, 1), SIZE)];

        this.initialized = true;
    }

    /**
     * This func runs once per frame, also simulating the physics of the environment
     * through the parent class.
     * 
     * @param {*} context 
     * @param {*} program_state
     */
    display(context, program_state) {
        // Always first setup the defaults, we want the lights to be ready
        this.setupDefaults(context, program_state);
        
        // Call our super to simulate physics 
        super.display(context, program_state);

        // Display all shapes in the world, this simulator will display all the bodies
        this.world.drawWorld(context, program_state);

        // Handle Camera
        this.attachCamera(context, program_state);
    }

    /**
     * Attach the program_state's camera accordingly from the given kart positions.
     * @param {*} context 
     * @param {*} program_state 
     */
    attachCamera(context, program_state) {
        switch (this.attachedCamera) {
            case "kartBack":
                program_state.set_camera(this.kart.getBackCam());
                break;
            default: 
                program_state.set_camera(this.initial_camera_location);
        }
    }
}