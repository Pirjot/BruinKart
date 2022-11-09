

import {defs, tiny} from './examples/common.js';

const {Vector, Vector3, Vec,vec, vec3, vec4, color, hex_color, Matrix, Mat4, Light, Shape, Material, Scene,} = tiny;


class Wedge extends Shape{
    constructor() {
        super("position", "normal");
        this.arrays.position = Vector3.cast(
            [1,-1,-1],[1,1,-1],[1,-1,1],[-1,-1,1],[-1,-1,-1],[-1,1,-1]
        );
        this.arrays.normal = Vector3.cast([1,-1,-1],[1,1,-1],[1,-1,1],[-1,-1,1],[-1,-1,-1],[-1,1,-1]);
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

export class Model extends Shape{
    constructor() {
        super("position", "normal", "texture_coord");

        //Front Bumper
        defs.Tetrahedron.insert_transformed_copy_into(this,[], Mat4.translation(1,-.5,4));
        defs.Tetrahedron.insert_transformed_copy_into(this,[],
            Mat4.translation(-1,-.5,4).times(Mat4.rotation(-Math.PI/2,0,1,0)));

        Prism.insert_transformed_copy_into(this, [], Mat4.scale(1,0.5,1));
        Wedge.insert_transformed_copy_into(this,[],
            Mat4.translation(0,0,4.5).times(Mat4.scale(1,0.5,0.5)));
    }
}