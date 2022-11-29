/**
 * The GUI Controller Class, holding all logic on how to display on screen shapes, textures
 * to simulate a working GUI and handling all relevant user input to handle how the game
 * should move forward.
 * 
 * 
 * @author Pirjot Atwal
 */

import { tiny } from "./examples/common.js";

const { vec3, vec4, Mat4, Scene, Material, color, Light, unsafe3, hex_color } = tiny;

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

        // Keep track of all current shapes and relevant textures
        function transformFunc(cam_trans) {
            cam_trans = Mat4.inverse(cam_trans);
            cam_trans = cam_trans.times(Mat4.translation(0, 0, -5));
            return cam_trans;
        }

        function transform2(cam_trans) {
            cam_trans = Mat4.inverse(cam_trans);
            cam_trans = cam_trans.times(Mat4.translation(-1, 0, -3.9));
            cam_trans = cam_trans.times(Mat4.scale(.1, .1, 1));

            return cam_trans;
        }

        this.shapes = [
            {
                "shape": globalShapes.cube,
                "material": globalMaterials.default.override({color: hex_color("#ffffff")}),
                "transform": transformFunc // TODO, automate this
            },
            {
                "shape": globalShapes.text,
                "material": globalMaterials.text_mat,
                "transform": transform2,
                "text": "Hello World"
            }
        ];

        // When we start, we draw the default layout of the initial menu, program will move through its other states automatically
        this.initMenu();
    }

    initMenu() {
        
    }

    /**
     * This function is called every frame by the overlying Simulation class.
     * @param {*} context 
     * @param {*} program_state 
     * @param {Mat4} cam_matrix
     */
    handle(context, program_state, cam_matrix) {
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
}