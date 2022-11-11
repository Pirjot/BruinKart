

import {defs, tiny} from './examples/common.js';

const {Vector, Vector3, Vec,vec, vec3, vec4, color, hex_color, Matrix, Mat4, Light, Shape, Material, Scene,} = tiny;


class Wedge extends Shape{
    constructor() {
        super("position", "normal");
        this.arrays.position = Vector3.cast(
            [1,-1,-1],[1,1,-1],[1,-1,1],[-1,-1,1],[-1,-1,-1],[-1,1,-1]
        );
        this.arrays.normal = Vector3.cast([0,0,-1],[0,1,1],[0,1,1],[0,1,1],[0,0,-1],[0,1,1]);
        this.indices.push(0,1,2,2,1,3,3,5,1,1,0,4,4,1,5,5,4,3,3,4,0,0,2,3);


    }

}

class Rectangle extends Shape{
    constructor() {
        super("position", "normal", "texture_coord");
        defs.Square.insert_transformed_copy_into(this, [], Mat4.scale(2,1,1));
    }

}

class Prism extends Shape{
    constructor() {
        super("position", "normal", "texture_coord");
        defs.Square.insert_transformed_copy_into(this, [], Mat4.translation(0,0,4));
        defs.Square.insert_transformed_copy_into(this, [], Mat4.identity());
        for(let i =0; i <=1; i++){
            const angle = Math.PI/2;
            Rectangle.insert_transformed_copy_into(this, [],
                Mat4.translation(-(1-i),-i,2).times(Mat4.rotation(angle*i,0,0,1 )).times(Mat4.rotation(angle, 0,1,0)));
            Rectangle.insert_transformed_copy_into(this, [],
                Mat4.translation(1-i,i,2).times(Mat4.rotation(angle*i,0,0,1 )).times(Mat4.rotation(angle, 0,1,0)));
        }

    }
}

export class Model extends Shape {                                   // **Shape_From_File** is a versatile standalone Shape that imports
                                                                               // all its arrays' data from an .obj 3D model file.
    constructor(filename) {
        super("position", "normal", "texture_coord");
        // Begin downloading the mesh. Once that completes, return
        // control to our parse_into_mesh function.
        this.load_file(filename);
    }

    load_file(filename) {                             // Request the external file and wait for it to load.
        // Failure mode:  Loads an empty shape.
        return fetch(filename)
            .then(response => {
                if (response.ok) return Promise.resolve(response.text())
                else return Promise.reject(response.status)
            })
            .then(obj_file_contents => this.parse_into_mesh(obj_file_contents))
            .catch(error => {
                this.copy_onto_graphics_card(this.gl);
            })
    }

    parse_into_mesh(data) {                           // Adapted from the "webgl-obj-loader.js" library found online:
        var verts = [], vertNormals = [], textures = [], unpacked = {};

        unpacked.verts = [];
        unpacked.norms = [];
        unpacked.textures = [];
        unpacked.hashindices = {};
        unpacked.indices = [];
        unpacked.index = 0;

        var lines = data.split('\n');

        var VERTEX_RE = /^v\s/;
        var NORMAL_RE = /^vn\s/;
        var TEXTURE_RE = /^vt\s/;
        var FACE_RE = /^f\s/;
        var WHITESPACE_RE = /\s+/;

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            var elements = line.split(WHITESPACE_RE);
            elements.shift();

            if (VERTEX_RE.test(line)) verts.push.apply(verts, elements);
            else if (NORMAL_RE.test(line)) vertNormals.push.apply(vertNormals, elements);
            else if (TEXTURE_RE.test(line)) textures.push.apply(textures, elements);
            else if (FACE_RE.test(line)) {
                var quad = false;
                for (var j = 0, eleLen = elements.length; j < eleLen; j++) {
                    if (j === 3 && !quad) {
                        j = 2;
                        quad = true;
                    }
                    if (elements[j] in unpacked.hashindices)
                        unpacked.indices.push(unpacked.hashindices[elements[j]]);
                    else {
                        var vertex = elements[j].split('/');

                        unpacked.verts.push(+verts[(vertex[0] - 1) * 3 + 0]);
                        unpacked.verts.push(+verts[(vertex[0] - 1) * 3 + 1]);
                        unpacked.verts.push(+verts[(vertex[0] - 1) * 3 + 2]);

                        if (textures.length) {
                            unpacked.textures.push(+textures[((vertex[1] - 1) || vertex[0]) * 2 + 0]);
                            unpacked.textures.push(+textures[((vertex[1] - 1) || vertex[0]) * 2 + 1]);
                        }

                        unpacked.norms.push(+vertNormals[((vertex[2] - 1) || vertex[0]) * 3 + 0]);
                        unpacked.norms.push(+vertNormals[((vertex[2] - 1) || vertex[0]) * 3 + 1]);
                        unpacked.norms.push(+vertNormals[((vertex[2] - 1) || vertex[0]) * 3 + 2]);

                        unpacked.hashindices[elements[j]] = unpacked.index;
                        unpacked.indices.push(unpacked.index);
                        unpacked.index += 1;
                    }
                    if (j === 3 && quad) unpacked.indices.push(unpacked.hashindices[elements[0]]);
                }
            }
        }
        {
            const {verts, norms, textures} = unpacked;
            for (var j = 0; j < verts.length / 3; j++) {
                this.arrays.position.push(vec3(verts[3 * j], verts[3 * j + 1], verts[3 * j + 2]));
                this.arrays.normal.push(vec3(norms[3 * j], norms[3 * j + 1], norms[3 * j + 2]));
                this.arrays.texture_coord.push(vec(textures[2 * j], textures[2 * j + 1]));
            }
            this.indices = unpacked.indices;
        }
        this.normalize_positions(false);
        this.ready = true;
    }

    draw(context, program_state, model_transform, material) {               // draw(): Same as always for shapes, but cancel all
        // attempts to draw the shape before it loads:
        if (this.ready)
            super.draw(context, program_state, model_transform.times(Mat4.translation(0,-0.35,0)).times(Mat4.rotation(-Math.PI/2,0,1,0)), material);
    }
}
/*export class Model extends Shape{
    constructor() {
        super("position", "normal", "texture_coord");

        //Front Bumper
        defs.Tetrahedron.insert_transformed_copy_into(this,[], Mat4.translation(1,-.5,4));
        defs.Tetrahedron.insert_transformed_copy_into(this,[],
            Mat4.translation(-1,-.5,4).times(Mat4.rotation(-Math.PI/2,0,1,0)));

        Prism.insert_transformed_copy_into(this, [], Mat4.scale(1,0.5,1));
        Wedge.insert_transformed_copy_into(this,[],
            Mat4.translation(0,0,4.5).times(Mat4.scale(1,0.5,0.5)));
        Wedge.insert_transformed_copy_into(this, [],
            Mat4.scale(2,0.5))
    }
}*/


