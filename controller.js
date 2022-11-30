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
 */
class Timer {
    constructor() {
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
         * On user choice of [P] we switch to: Playing State (The Game).
         * 
         */
        

        // Keep track of all current shapes and relevant textures
        this.shapes = [];
        this.listeners = [];

        // Keep track of the Kart Options, when the user starts the game, we load the kart using them
        this.selectedKart = "BruinKart";
        this.selectedMap = "default";

        // Keep track of all state specific variables

        // Variables for playing the game
        this.timer = new Timer();
        this.laps = 0;
        this.bestTime = Infinity;
        this.checks = 0;

        // By default, the world is "loaded" so we can actually start the GUI
        this.worldReady = true;


        /**
         * NEW FEATURE! Ghost Mode.
         * 
         * We keep track of a currentGhost (keeping track of the user's progress)
         * and a pastGhost with coordinates that we pass to the parent to display in
         * the world.
         * 
         * Ghost objects look like this: {
         *      time: [x, y, z] // The position
         * }
         * 
         * Thats all! If we need to update past ghost we'll know simply by checking
         * if the last time in the past ghost is > then the last time in current ghost when
         * we finish a lap.
         */
        // We keep track of the last time we displayed the ghost.
        this.lastGhostTime = -1;
        this.currentGhost = {};
        this.pastGhost = {};

        // Save the options chosen by the user solely for saving to cache
        this.options = {
            world: "default",
            kart: "BruinKart"
        }

        this.memory = {};

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
     * 
     * (i.e. Reset the GUI)
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

        // Reset the timer
        this.timer.resetTime();

        // Reset relevant variables
        this.loadTimes();
    }

    /**
     * Load our best time and ghost from memory.
     */
    loadTimes() {
        this.bestTime = Infinity;
        this.pastGhost = {};
        this.lastGhostTime = -1;
        
    }

    /**
     * Reset the Kart in the parent (to put it in the right position and reload the model/texture)
     * 
     * @param {String} worldType default / classic
     */
    resetKart(worldType) {
        // Reset the Kart, (we can reset the entire world here if based on user parameters)
        this.parent.kart = new Kart(this.parent, this.selectedKart, worldType);
        let tempBodies = [];
        this.parent.kart.initializeBody(tempBodies);
        this.parent.bodies[0] = tempBodies[0];
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

        // Reset the GUI
        this.reset();

        // Pause the timer for now, the countdown will reset it
        this.timer.pause();

        // Disable the game, Enable it when the user chooses an option to start the game
        this.parent.disableKart();

        // Load shapes for the main menu
        // The Main Menu has the following option:
        /**
         * P: Play the game
         */
        let shapes = [
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
            },
            {
                "name": "Kart Option",
                "obj": this.createTextObj(this.createTransformFunc([-2, .1, -3.99], [.1, .1, 1]), "Press K to Switch Your Kart")
            },
            { // Index 4
                "name": "Kart String",
                "obj": this.createTextObj(this.createTransformFunc([-2, -.1, -3.99], [.1, .1, 1]), "CURRENTKART")
            },
            {
                "name": "Map Option",
                "obj": this.createTextObj(this.createTransformFunc([-2, -.5, -3.99], [.1, .1, 1]), "Press M to Switch Your Map")
            },
            { // Index 6
                "name": "Map String",
                "obj": this.createTextObj(this.createTransformFunc([-2, -.7, -3.99], [.1, .1, 1]), "CURRENTMAP")
            },
        ];
        this.buildShapes(shapes);


        // Select all labels that need to be updated by user choice (need to be set to the corresponding string)
        this.currentKartString = shapes[4]["obj"];
        this.currentMapString = shapes[6]["obj"];        


        // Build all listeners for the Menu
        /**
         * First add all listener functions then activate them in the document.
         */

        function getASCII(char) {
            return char.charCodeAt(0);
        }

        // Push all listeners
        this.listeners.push(
            { // Play Listener
                "type": "keydown",
                "listener": (evt) => {
                    if (evt.keyCode == getASCII("P")) {
                        this.initGame();
                    }
                }
            },
            { // Kart Listener
                "type": "keydown",
                "listener": (evt) => {
                    if (evt.keyCode == getASCII("K")) {
                        this.nextKart();
                    }
                }
            },
            { // Map Listener
                "type": "keydown",
                "listener": (evt) => {
                    if (evt.keyCode == getASCII("M")) {
                        this.nextMap();
                    }
                }
            },
        );

        this.activateListeners();
    }

    /**
     * Increment the current selected kart to the next kart.
     */
    nextKart() {
        let curr = this.selectedKart;
        this.selectedKart = curr == "BruinKart" ? "Clown" :
                            curr == "Clown" ? "Toad" :
                                    "BruinKart";
        
        this.options.kart = this.selectedKart;
    }

    /**
     * Increment the current selected map to the next map.
     */
    nextMap() {
        this.selectedMap = this.selectedMap == "default" ? "classic" :
                                               "default";
        
        this.options.world = this.selectedMap;
    }

    /**
     * If the user decides to play the game then we initialize the world according to
     * their set parameters in the parent and enable the kart game.
     * 
     * Make sure to display the game GUI for time and laps.
     */
    async initGame() {
        this.state = "playing";

        // Reset the state of the controller
        this.reset();
        this.timer.pause();

        // Set the Kart accordingly (based on user option)
        this.resetKart(this.selectedMap);

        // Set the world to not ready so no GUI updates happen
        this.worldReady = false;

        // Enable the kart for a bit, then disable it after the world is done loading
        this.parent.enableKart();

        // Asyncronously load the world (we assume the asynchronous part is handled on part of the world)
        await this.parent.loadWorld(this.selectedMap);
        this.worldReady = true;

        this.parent.disableKart();

        // Load the ghost memory
        this.loadMemory();

        // Set the parameters accordingly
        if (Object.keys(this.memory).includes(this.selectedKart) && Object.keys(this.memory[this.selectedKart]).includes(this.selectedMap)) {
            let ghostVals = this.memory[this.selectedKart][this.selectedMap];
            this.bestTime = ghostVals.bestTime;
            this.pastGhost = ghostVals.ghost;
        }


        // Build the GUI for the user playing the game

        // First build the timer string, we will have a listener to update it on every update call
        this.timeString = this.createTextObj(this.createTransformFunc([-2.8, 1.5, -3.99], [.1, .1, 1]), "TIME")
        
        // Build the Best Time string in the same fashion
        this.bestTimeString = this.createTextObj(this.createTransformFunc([-.7, 1.5, -3.99], [.1, .1, 1]), "BESTTIME")

        // Build the Laps string in the same fashion
        this.lapsString = this.createTextObj(this.createTransformFunc([2, 1.5, -3.99], [.1, .1, 1]), "LAPS")

        // Build the Checks string in the same fashion
        this.checkString = this.createTextObj(this.createTransformFunc([1.9, 1.3, -3.99], [.08, .08, 1]), "CHECKS")
        
        // Build a special counter string that has its own timer, the function will call the callback to start the game
        this.counterString = this.createCounter(3, () => {
            // Allow the user to start after the countdown if finished
            this.parent.enableKart();

            // Start our internal timer at the start of the race
            this.timer.resetTime();
        });

        this.shapes.push(this.timeString, this.bestTimeString, this.lapsString, this.checkString, this.counterString);

        // Activate all listeners (in this case this just activates the pause menu)
        this.activateListeners();
    }

    /**
     * Create a special string that counts down for the user to start the race.
     * 
     * @param {Number} seconds The time the counter should count down for
     * @param {Function} callback 
     */
    createCounter(seconds, callback) {
        let counter = this.createTextObj(this.createTransformFunc([-.55, 0, -3.99], [.2, .2, 1]), "  " + seconds);

        let parent = this.parent;

        let counterListener = setInterval((evt) => {
            // EDGE CASE: We have found that the reliance on setinterval allows the user to cheat the starting counter in some cases, thus we always disable the kart here.
            parent.disableKart();
            
            seconds -= 1;

            counter["text"] = "  " + seconds;

            if (seconds <= 0) {
                counter["text"] = "  GO";

                // Clear the counter after a second
                setTimeout(() => counter["text"] = "", 1000);

                clearInterval(counterListener);

                callback();
            }
        }, 1000);

        return counter;
    }

    pauseGame() {
        // First check if we are entering the pause menu or leaving it
        // We cannot pause the game from the initial menu
        if (this.state == "initial") {
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
        // Make sure the world is loaded before doing any onscreen GUI stuff
        if (!this.worldReady) {
            return;
        }

        // Handle the values of each state accordingly
        this.handleMenuState();
        this.handlePlayState();
        
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
     * Handle the Menu state's current parameters by updating them.
     */
    handleMenuState() {
        if (this.state != "initial") {
            return;
        }

        this.currentKartString["text"] = "Current Kart: " + this.selectedKart;
        this.currentMapString["text"] = "Current Map: " + this.selectedMap;
    }

    /**
     * Handle the play state on every handle call IF we are in the play state.
     */
    handlePlayState() {
        if (this.state != "playing") {
            return;
        }

        // Update all of our parameters on the GUI accordingly
        let time = this.timer.getTime().toFixed(1);
        this.timeString["text"] = "Time: " + time;
        this.bestTimeString["text"] = "Best Time: " + (this.bestTime == Infinity ? "N/A" : this.bestTime.toFixed(1));
        this.lapsString["text"] = "Lap: " + this.laps;
        this.checkString["text"] = "Check: " + this.checks;

        // Save the position to currentGhost if last ghost time is greater than current time
        if (time - this.lastGhostTime > 0) { // We have to write the condition this way because writing it normally doesn't work for some reason
            // Update the time accordingly
            this.currentGhost[time] = this.parent.kart.getLoc();

            this.lastGhostTime = time;
        }

        // If we can, ask the parent to display a ghost model at the given coords
        if (Object.keys(this.pastGhost).includes(time)) {
            this.parent.displayGhostAt(this.pastGhost[time]);
        }
    }

    /**
     * Handles the Update of a given checkpoint and lap
     * 
     * Handle the case when the kart completes a lap on the track (calculate bestTime).
     * @param {*} checkIndex
     * @param {*} laps 
     */
    updateStatus(checkIndex, laps) {
        if (laps > this.laps) { // The Kart JUST completed a new lap, check if they beat the record
            if (this.timer.getTime() < this.bestTime) { // New PR in the gym
                this.bestTime = this.timer.getTime();
                
                // We ALWAYS assume that beating the best time means you beat your past ghost
                // This idea only works if we save bestTime over sessions in cookies or cache
                this.pastGhost = this.currentGhost;

                // Save the Best Time and Past Ghost to Cache / Memory and retrieve it on initGame
                let kart = this.options.kart;
                let world = this.options.world;
                if (!Object.keys(this.memory).includes(kart)) {
                    this.memory[kart] = {};
                }
                if (!Object.keys(this.memory[kart]).includes(world)) {
                    this.memory[kart][world] = {}
                }
                this.memory[kart][world]["ghost"] = this.pastGhost;
                this.memory[kart][world]["bestTime"] = this.bestTime;

                this.saveMemory();
            }
            this.timer.resetTime();

            // Reset the Ghost Timer
            this.currentGhost = {};
            this.lastGhostTime = -1;

        }
        this.laps = laps;
        this.checks = checkIndex + 1;        
    }


    /**
     * Save Memory to Cache
     */
    saveMemory() {
        localStorage.setItem("memory", JSON.stringify(this.memory));
    }

    /**
     * Load Memory from Cache
     */
    loadMemory() {
        this.memory = JSON.parse(localStorage.getItem("memory")) || {};
    }
}