/**
 * The GUI Controller Class, holding all logic on how to display on screen shapes, textures
 * to simulate a working GUI and handling all relevant user input to handle how the game
 * should move forward.
 * 
 * 
 * @author Pirjot Atwal
 */

import { tiny } from "./examples/common.js";
import { Kart } from "./kart.js";

const { vec3, vec4, Mat4, Scene, Material, color, Light, unsafe3, hex_color } = tiny;

/**
 * A timer object that supports pause functionality.
 * 
 * TODO: Add Split Time (Lap Functionality), retrieve best time from cache
 */
class Timer {
    constructor() {
        this.state = "play";
        this.totalPausedMilliseconds = 0;
        this.pauseStart = null;
        this.resetTime();
    }

    resetTime() {
        this.startTime = Date.now();

        this.totalPausedMilliseconds = 0;
        this.pauseStart = null;
        this.state = "play";
    }

    pause() {
        if (this.state == "pause") {
            return;
        }
        this.pauseStart = Date.now();
        this.state = "pause";
    }

    unpause() {
        if (this.state == "play") {
            return;
        }
        this.totalPausedMilliseconds += Date.now() - this.pauseStart;
        this.pauseStart = null;
        this.state = "play";
    }
    
    /**
     * Get the time since the last reset.
     * 
     * @return time in seconds.
     */
    getTime() {
        if (this.state == "pause") {
            let ms = this.pauseStart - this.startTime - this.totalPausedMilliseconds;
            return (ms / 1000);
        }

        let ms = Date.now() - this.startTime - this.totalPausedMilliseconds;
        return (ms / 1000);
    }
}

export class GUIController {
    /**
     * 
     * @param {Simulation} parent 
     */
    constructor(parent) {
        // The overlying simulation
        this.parent = parent;

        // We store all relevant parameters here for the parent to read (including variables for the control panel)
        this.state = "initial"; // Initial = First Menu

        /**
         * State transitions:
         * 
         * On boot up: we are always in "initial"
         * 
         * On user choice of [P] we switch to: the .
         * 
         */
        

        // Keep track of all current shapes and relevant textures
        this.shapes = [];
        this.listeners = [];


        // Keep track of all state specific variables
        // Variables for playing the game
        this.timer = new Timer();

        // When we start, we draw the default layout of the initial menu, program will move through its other states automatically
        this.initMenu();
    }


    /**
     * All helper functions to create on screen GUI elements or update them
     * (Essentially acting as wrappers for the Text_Line class).
     */

    /**
     * Build a transform function that takes a camera transformation matrix
     * and returns the matrix after applying the given coords and scale factor.
     * 
     * At the very least translationCoords must be provided.
     * 
     * @param {*} translationCoords 
     * @param {*} scaleFactors 
     * @returns {Function}
     */
    createTransformFunc(translationCoords, scaleFactors=[1, 1, 1]) {
        function transform(cam_matrix) {
            cam_matrix = Mat4.inverse(cam_matrix);
            cam_matrix = cam_matrix.times(Mat4.translation(...translationCoords));
            cam_matrix = cam_matrix.times(Mat4.scale(...scaleFactors));
            
            return cam_matrix;
        }
        
        return transform;
    }

    
    /**
     * Create an object for the given transform and material objects.
     * @param {Function} transform 
     * @param {String} color
     * @param {Texture} texture 
     * @param {Shape} shape 
     */
    createShapeObj(transform, material=false, shape=globalShapes.cube) {
        let obj = {
            "shape": shape,
            "material": globalMaterials.default,
            "transform": transform
        };

        if (material != false) {
            obj["material"] = material;
        }
        
        return obj;
    }

    /**
     * Generate a Text object for this.shapes.
     * 
     * @param {*} transform 
     * @param {String} text 
     * @returns 
     */
    createTextObj(transform, text) {
        return {
            "shape": globalShapes.text,
            "material": globalMaterials.text_mat,
            "transform": transform,
            "text": text
        }
    }

    /**
     * Build the objects with the given parameter.
     * 
     * Appends all the shapes to this.shapes.
     * 
     * Assumes each JSON in objects has the property "obj" which
     * is in the valid form for a shape.
     * 
     * @param {JSON[]} objects 
     */
    buildShapes(objects) {
        for (let i = 0; i < objects.length; i++) {
            let object = objects[i];

            this.shapes.push(object["obj"]);
        }
    }

    /**
     * Add all the listeners to the document
     */
    activateListeners() {
        for (let i = 0; i < this.listeners.length; i++) {
            let listener = this.listeners[i];

            document.addEventListener(listener["type"], listener["listener"]);
        }
    }

    /**
     * Remove all the listeners from the document
     */
    deactivateListeners() {
        for (let i = 0; i < this.listeners.length; i++) {
            let listener = this.listeners[i];

            document.removeEventListener(listener["type"], listener["listener"]);
        }
    }

    /**
     * Reset the shapes and listeners and add the default listeners in if needed.
     */
    reset() {
        this.deactivateListeners();
        this.shapes = [];
        this.listeners = [];

        // Always have the listener for the Escape button added, don't activate it though, since it will be activated by the calling function
        this.listeners.push({
            "type": "keydown",
            "listener": (evt) => {
                if (evt.keyCode == 27) { // The ESC key
                    this.pauseGame();
                }
            }
        });
    }

    /**
     * For the initial state, we load the shapes on the screen for the initial menu solely,
     * on user input for one of the options on the menu, we handle the option on the onscreen
     * GUI and the main parent.
     * 
     * This will be extremely messy, because we have a series of functions that correspond to all
     * user input.
     * 
     * Also, we should override inputs from the parent, allowing the user to play the game or not
     * accordingly.
     */
    initMenu() {
        this.state = "initial";
        
        // Reset the Kart, (we can reset the entire world here if based on user parameters)
        this.parent.kart = new Kart(this.parent);
        let tempBodies = [];
        this.parent.kart.initializeBody(tempBodies);
        this.parent.bodies[0] = tempBodies[0];

        this.reset();

        // Disable the game, Enable it when the user chooses an option to start the game
        this.parent.disableKart();

        // Load shapes for the main menu
        // The Main Menu has the following option:
        /**
         * P: Play the game
         */
        this.buildShapes([
            {
                "name": "Background Cube",
                "obj": this.createShapeObj(this.createTransformFunc([0, 0, -5], [1.8 * 2, 2, 1])) // 1.8 is the Aspect Ratio of the screen
            },
            {
                "name": "Welcome Title",
                "obj": this.createTextObj(this.createTransformFunc([-2, 1, -3.99], [.15, .15, 1]), "Welcome to BruinKart!")
            },
            {
                "name": "Play Option",
                "obj": this.createTextObj(this.createTransformFunc([-2, .5, -3.99], [.1, .1, 1]), "Press P to Play")
            } 
            // Possible parameter change for the Kart Model / Map HERE TODO
        ]);

        // Build all listeners for the Menu
        /**
         * First add all listener functions then activate them in the document.
         */

        function getASCII(char) {
            return char.charCodeAt(0);
        }

        // Play Listener
        this.listeners.push({
            "type": "keydown",
            "listener": (evt) => {
                if (evt.keyCode == getASCII("P")) {
                    this.initGame();
                }
            }
        });

        this.activateListeners();
    }

    /**
     * If the user decides to play the game then we initialize the world according to
     * their set parameters in the parent and enable the kart game.
     * 
     * Make sure to display the game GUI for time and laps.
     */
    initGame() {
        this.state = "playing";

        // Reset the state of the controller
        this.reset();

        // Build the GUI for the user playing the game

        // First build the timer string, we will have a listener to update it on every update call
        this.timeString = this.createTextObj(this.createTransformFunc([-.5, 1.5, -3.99], [.1, .1, .1]), "TIME")
        this.shapes.push(this.timeString);

        // Allow the user to start (after the countdown??)
        this.parent.enableKart();

        // Start our internal timer at the start of the race
        this.timer.resetTime();

        // Activate all listeners
        this.activateListeners();
    }

    pauseGame() {
        // First check if we are entering the pause menu or leaving it
        // We cannot pause the game from the initial menu
        if (this.state == "initial") {
            console.log("Initial Menu Pause, Impossible");
            return;
        }

        let shapes = [
            {
                "name": "Background Cube",
                "obj": this.createShapeObj(this.createTransformFunc([0, 0, -5], [1.8 * 2 / 1.5, 2 / 1.5, 1])) // 1.8 is the Aspect Ratio of the screen
            },
            {
                "name": "Pause Title",
                "obj": this.createTextObj(this.createTransformFunc([-.8, 1, -3.99], [.1, .1, 1]), "Pause Menu.")
            },
            {
                "name": "Exit Prompt",
                "obj": this.createTextObj(this.createTransformFunc([-2, .5, -3.99], [.1, .1, 1]), "Press the E key to Exit.")
            }, 
            {
                "name": "Escape/Unpause Prompt",
                "obj": this.createTextObj(this.createTransformFunc([-2, -.5, -3.99], [.1, .1, 1]), "Press the Esc key to Unpause.")
            }
        ];

        if (this.state == "paused") {
            // We are leaving the paused state, we must be returning to the played state
            console.log("Now leave the paused menu")

            // Reset the shapes
            this.shapes.splice(this.shapes.length - shapes.length, shapes.length);

            // Deallocate the listener
            document.removeEventListener("keydown", this.escapeListener);
            this.escapeListener = null;

            // Reset all necessary params
            this.state = "playing";
            this.parent.enableKart();
            this.timer.unpause();
            return;
        }

        // Otherwise, we are entering the paused menu, pause the game by disabling kart physics
        this.parent.disableKart();
        this.timer.pause();

        // Just overlay the paused menu as shapes to display, DO NOT delete the past GUI elements for simplicity (or possibly just put in an implementation to save them)
        this.buildShapes(shapes);

        this.escapeListener = (evt) => {
            if (evt.keyCode == 69) { // E key
                // The user chose to exit, reset the game

                document.removeEventListener("keydown", this.escapeListener);
                this.initMenu();
            }
        };

        // We have a custom listener that is self disabling to go back to the main menu
        document.addEventListener("keydown", this.escapeListener);

        this.state = "paused";
    }

    /**
     * This function is called every frame by the overlying Simulation class.
     * 
     * this.shapes has JSON objects of properties shape, material, transform, and text if it
     * is a text object.
     * 
     * @param {*} context 
     * @param {*} program_state 
     * @param {Mat4} cam_matrix
     */
    handle(context, program_state, cam_matrix) {
        this.handlePlayState(context, program_state);
        
        /**
         * "Handling" the GUI consists of drawing all the current items and listening
         * for user input that is relevant.
         * 
         * We assume that all the shapes tied to the GUI must be drawn in reference to
         * the camera, thus we specially program each shape to provide their model_transform
         * dynamically on call.
         */
        for (let i = 0; i < this.shapes.length; i++) {
            let shape = this.shapes[i];

            if (shape.text != undefined) {
                shape["shape"].set_string(shape.text, context.context);
            }

            shape["shape"].draw(context, program_state, shape["transform"](cam_matrix), shape["material"]);
        }
    }

    /**
     * Activately handle the play state on every handle call IF we are in the play state.
     */
    handlePlayState(context, program_state) {
        if (this.state != "playing") {
            return;
        }

        // First set the time accordingly
        this.timeString["text"] = "Time: " + this.timer.getTime();
        
    }
}