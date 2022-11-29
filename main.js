import {defs, tiny} from './examples/common.js';
import { Text_Line } from './examples/text-demo.js';
import {Body, Simulation} from './physics.js';
import {Kart} from './kart.js';
import {World} from './world.js';
import {Model} from './model.js';
import {GUIController} from './controller.js';


// Pull these names into this module's scope for convenience:
const {vec3, vec4, Mat4, Scene, Material, Texture, color, Light, unsafe3, hex_color} = tiny;

// Globally initialize the needed shapes and materials for use

// Load all necessary shapes onto the GPU
globalThis.globalShapes = {
    cube: new defs.Cube(),
    model: new Model('assets/kart.obj'),
    text: new Text_Line(40),
}

// Load all needed materials
globalThis.globalMaterials = {
    default: new Material(new defs.Phong_Shader()),
    text_mat: new Material(new defs.Textured_Phong(1), {
        ambient: 1, diffusivity: 0, specularity: 0,
        texture: new Texture("assets/text.png")
    })
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
            vec3(50, 0, 50), // Look at center of map
            vec3(0, 1, 0) // Top Vector (parallel with y)
        );

        // The Matrix used to transform the camera
        this.currCamMatrix = null;

        // Load the Kart and the world in default positions (the GUIController is enabled last to hijack these values)
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
         * default (Deprecated)
         * kartBack
         * kartFront
         * 
         * (Check this.attachCamera func to see how this is handled)
         */
        this.attachedCamera = "kartBack";
        this.cameraListener = false;

        /**
         * GUIController Flags and Helper Funcs, the GUIController will set/use these 
         * defined immediately below, which is used to divert user
         * input accordingly (i.e. disable the kart from moving if needed)
         */

        // If true, kart can be moved and camera buttons are active
        this.kartEnabled = false;

        this.disableKart = () => this.kartEnabled = false;
        this.enableKart = () => this.kartEnabled = true;

        // Load the GUI
        this.controller = new GUIController(this);
        this.initialized = false;
    }

    

    /**
     * Create the control_panel, (TODO: Fill in extra buttons if needed, otherwise
     * read from the keyboard manually using JS)
     */
    make_control_panel() {
        // this.key_triggered_button("Default", ["b"], () => this.testFunc);
        // super.make_control_panel();
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
        console.log(this.kartEnabled)

        if (this.kartEnabled) {
            // Let the kart update its body (hijacks the body controls with emplace)
            this.kart.update(dt);

            // Attach the camera to the kart if needed
            this.handleCameraChoice();
        }
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
            return currCam == "kartBack" ? "kartFront" : 
                                            "kartBack";
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

        // TODO: Lights should be set by the world/bodies/karts
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
        // Always first setup the defaults
        this.setupDefaults(context, program_state);

        // Handle Camera
        this.attachCamera(context, program_state);

        // Call our super to simulate physics 
        super.display(context, program_state, !this.kartEnabled);

        // Display all shapes in the world, this simulator will display all the bodies
        this.world.drawWorld(context, program_state);

        /**
         * How we go about doing a consistent GUI:
         * 
         * Simply treat the "GUI" as a collection of shapes, and pass all mouse
         * inputs from the user to the GUI to handle. If the GUI thinks its important
         * to handle, it can call this object's relevant function.
         * 
         * Also, we override user input and simulation as needed depending on the
         * parameters of the GUI.
         * 
         * The GUI will handle moving through different "states" of the game.
         */
        this.controller.handle(context, program_state, this.currCamMatrix);

        // TODO: GUI Logic here
    }

    /**
     * Attach the program_state's camera accordingly from the given kart positions.
     * @param {*} context 
     * @param {*} program_state 
     */
    attachCamera(context, program_state) {
        switch (this.attachedCamera) {
            case "kartBack":
                this.currCamMatrix = this.kart.getBackCam();
                program_state.set_camera(this.kart.getBackCam());
                break;
            case "kartFront":
                this.currCamMatrix = this.kart.getFrontCam();
                program_state.set_camera(this.kart.getFrontCam());
                break;
            default: 
                this.currCamMatrix = this.initial_camera_location;
                program_state.set_camera(this.initial_camera_location);
        }
    }
}