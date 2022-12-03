import {defs, tiny} from './examples/common.js';
import { Text_Line } from './examples/text-demo.js';
import {Body, Simulation} from './physics.js';
import {Kart} from './kart.js';
import {World} from './world.js';
import {Kart1, StadiumLight, Tire, Kart2, Kart3} from './model.js';


// Pull these names into this module's scope for convenience:
const {vec3, vec4, Mat4, Scene, Material, color, Light, unsafe3, hex_color, Texture} = tiny;
import {GUIController} from './controller.js';



// Globally initialize the needed shapes and materials for use

// Load all necessary shapes onto the GPU
globalThis.globalShapes = {
    axle: new defs.Cylindrical_Tube(5,100),
    cube: new defs.Cube(),
    tire: new Tire(),
    kart1: new Kart1(),
    kart2: new Kart2(),
    kart3: new Kart3(),
    stadium_light: new StadiumLight(),
    text: new Text_Line(40),
    sphere: new defs.Subdivision_Sphere(4)
}

// Load all needed materials
globalThis.globalMaterials = {
    default: new Material(new defs.Phong_Shader()),
    textured: new Material(new defs.Textured_Phong(1)),
    kart1_texture: new Material(new defs.Textured_Phong(1), {
        color: color(0,0,0, 1),
        ambient: 1, diffusivity: .1, specularity: .1, texture: new Texture("assets/kart1.png")
    }),
    kart2_texture: new Material(new defs.Textured_Phong(1), {
        color: color(0,0,0, 1),
        ambient: 1, diffusivity: .1, specularity: .1, texture: new Texture("assets/kart2.png")
    }),
    kart3_texture: new Material(new defs.Textured_Phong(1), {
        color: color(0,0,0, 1),
        ambient: 1, diffusivity: .1, specularity: .1, texture: new Texture("assets/kart3.png")
    }),
    tire_texture:  new Material(new defs.Phong_Shader, {
        color: color(0,0,0, 1),
        ambient: 1, diffusivity: 1, specularity: 0.5, texture: new Texture('assets/tire.png')
    }),
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

        // Load the Kart, we load the world later
        this.kart = new Kart(this);

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
         * 
         * The world now loads later
         */
        this.kart.initializeBody(this.bodies);

        /**
         * Checkpoint Logic
         * 
         * We have a finite set of checkpoints that we guarantee are of atleast size 2.
         * 
         * The last checkpoint represents the end of a lap.
         * 
         * We keep track of a checkpoint index, and solely test collision between the 
         * kart's body and this invisible checkpoint (by not adding each checkpoint body
         * to this.bodies, they are not rendered and the collision for the kart is not applied).
         */
        this.setupCheckpoints = () => {
            this.collider = {
                intersect_test: Body.intersect_cube, 
                points: new defs.Cube(), 
            }
            this.checkpoints = [];
            this.world.initializeCheckpoints(this.checkpoints);
            this.checkpointIndex = 0;
            this.laps = 0;
        };
    
        // Now load the world, in this way we can initialize the skybox correctly
        this.loadWorld("default");

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

        // NEW FEATURE: Initialize the Ghost variables
        this.ghostPos = null;
    }

    /**
     * Asynchronously load a world and return when it has been processed on screen.
     * 
     * 
     * @param {*} worldName 
     */
    async loadWorld(worldName) {
        // Clear all bodies relevant to current world
        this.bodies.splice(1, this.bodies.length - 1);
        this.ghostPos = null;

        // Get the world
        this.world = new World(worldName);

        // Load the bodies and checkpoints
        this.world.initializeBodies(this.bodies);
        this.setupCheckpoints();

        // Perform Skybox logic

        this.skybox = {
            shape: globalShapes.cube,
            material: globalMaterials.textured.override({
                color: hex_color("#000000"),
                texture: new Texture("assets/skybox.png"),
                ambient: 1.0
            }),
            center: [62, 1, 125],
            scale: [500, 100, 500]
        }


        const delay = (ms = 500) => new Promise(callMeToResolve => setTimeout(callMeToResolve, ms));

        // We don't have a way to actually measure how long it takes it to load the textures so we just guess it take 1/10 second atmost
        return await delay(100);
    }

    /**
     * Create the control_panel, (TODO: Fill in extra buttons if needed, otherwise
     * read from the keyboard manually using JS)
     */
    make_control_panel() {
        this.key_triggered_button("Clear Memory (PERMANENT!)", ["r"], () => confirm("Are you sure you would like to clear all your past best times? (this will refresh the page)") ? localStorage.clear() || window.location.reload() : null);
        
        // super.make_control_panel();

        this.control_panel.style["overflow-y"] = "auto";
        let html = `<div>
                        <h1 style="text-align:center; text-decoration: underline">Welcome to BruinKart!</h1>
                        <h2 style="text-align:center">Built by Zane Witter, Jonathan Woo, and Pirjot Atwal.</h2>
                        <h2>Main Controls:</h2>
                        <p>To play, use the keys "I", "J", "K", and "L" for 
                           Forward, Left, Right, and Backward respectively.
                        </p>
                        <h2>Other Controls:</h2>
                        <p>You can pause the game with "Esc", and change the camera
                        while in game with "C". All other controls are provided onscreen. The third camera
                        is a free camera, which can be navigated using the camera controls displayed to the
                        left. Press R at anytime if you would like to restart the memory of the game.
                        </p>
                        
                    </div>`;
        this.control_panel.innerHTML += html;

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
        if (this.kartEnabled) {
            // Let the kart update its body (hijacks the body controls with emplace)
            this.kart.update(dt);

            // Attach the camera to the kart if needed
            this.handleCameraChoice();

            // Handle the checkpoints
            this.handleCheckpoints();
        }
    }

    /**
     * Handle the checkpoint logic.
     * 
     * We assume that the checkpoint index is < this.checkpoints.length always at the start.
     */
    handleCheckpoints() {
        // We test if the kart is colliding with the selected checkpoint.
        let nextCheckpoint = this.checkpoints[this.checkpointIndex];

        let collider = this.collider;
        collider.leeways = nextCheckpoint["leeway"];
        let checkBody = nextCheckpoint["body"];

        if (this.kart.body.check_if_colliding(checkBody, collider)) {
            this.checkpointIndex++;
        }

        // Test if a lap has been completed
        if (this.checkpointIndex == this.checkpoints.length) {
            this.laps++;

            this.checkpointIndex = 0;
        }

        // We tell the controller what's the current status
        this.controller.updateStatus(this.checkpointIndex, this.laps);
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
                   currCam == "kartFront" ? "kartSeat" :
                   currCam == "kartSeat" ? "default" :
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
        
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);
        }

        // Default Projection Transform
        program_state.projection_transform = Mat4.perspective(
            ANGLE, context.width / context.height, NEAR, FAR);
        
        // NEW CHANGE: We move the ability to add lights to be specific to the world/kart
        program_state.lights = [];

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

        this.drawSkybox(context, program_state);

        /**
         * Ghost mode, simply draw a noncollidable shape at the position if
         * it exists.
         */
        if (this.ghostPos) {
            // Generate the model transform
            let model_transform = Mat4.identity().times(
                Mat4.translation(this.ghostPos[0], this.ghostPos[1], this.ghostPos[2])).times(
                Mat4.rotation(this.ghostPos[3], 0, 1, 0)
            );

            // We grab the model to display directly from the current kart's body
            this.kart.body.shape.draw(context, program_state, model_transform, this.kart.body.material);
        }
    }

    /**
     * Attach the program_state's camera accordingly from the given kart positions.
     * @param {*} context 
     * @param {*} program_state 
     */
    attachCamera(context, program_state) {
        // Special Case: The user has disabled the kart, change the camera to kartBack always
        if (!this.kartEnabled) {
            this.attachedCamera = "kartBack";
        }

        switch (this.attachedCamera) {
            case "kartBack":
                this.currCamMatrix = this.kart.getBackCam();
                program_state.set_camera(this.kart.getBackCam());
                break;
            case "kartFront":
                this.currCamMatrix = this.kart.getFrontCam();
                program_state.set_camera(this.kart.getFrontCam());
                break;
            case "kartSeat":
                this.currCamMatrix = this.kart.getSeatCam();
                program_state.set_camera(this.kart.getSeatCam());
                break;
            default: 
                this.currCamMatrix = this.initial_camera_location;
                program_state.set_camera(this.initial_camera_location);
        }
    }

    /**
     * Display a ghost at the given coordinates in display.
     * 
     * We simply set the parameters here, if they exist during a display
     * call then they are displayed
     */
    displayGhostAt(coords) {
        this.ghostPos = coords;
    }

    /**
     * Draw a very janky skybox.
     */
    drawSkybox(context, program_state) {
        let centerMat = Mat4.identity().times(Mat4.translation(...this.skybox.center));
        let skyboxTransform = centerMat.times(Mat4.scale(...this.skybox.scale));
        this.skybox.shape.draw(context, program_state, skyboxTransform, this.skybox.material);

        // Draw a bottom and top floor
        let height = this.skybox.scale[1] - 10;
        let size = [this.skybox.scale[0], this.skybox.scale[2]];

        let model_top = centerMat.times(Mat4.translation(0, height, 0)).times(Mat4.scale(size[0], 1, size[1]));
        let model_bot = centerMat.times(Mat4.translation(0, -height, 0)).times(Mat4.scale(size[0], 1, size[1]));

        let top_mat = globalMaterials.default.override({
            color: hex_color("#87CEEB"),
            ambient: 1
        });
        let bot_mat = globalMaterials.default.override({
            color: hex_color("#FFE5B4"),
            ambient: 1
        });

        globalShapes.cube.draw(context, program_state, model_top, top_mat);
        globalShapes.cube.draw(context, program_state, model_bot, bot_mat);
    }
}