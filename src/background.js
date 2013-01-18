

function Background(model, scale) {
    this.model = model;
    this.scale = scale;
    this.time = 0;
}

Background.prototype.draw = function () {
    mv.pushMatrix();
    mv.scale(this.scale);
    mv.rotate(this.time*4, [1, 1, 0]);
    bkgProg.setTime(this.time);
    renderModel(this.model);

    mv.popMatrix();
}

Background.prototype.advance = function (elapsed) {
    var sec = elapsed / 1000.0
    this.time += sec;
}


function makeBackground(model) {
    var vtx = [-5.28, -1.72, -2.78, 0.00, 0.00, -6.21, 0.00, -5.55, -2.78, 5.28, -1.72, -2.78, 3.26, -4.49, 2.78, 0.00, 0.00, 6.21, -3.26, -4.49, 2.78, 5.28, 1.72, 2.78, -5.28, 1.72, 2.78, -3.26, 4.49, -2.78, 3.26, 4.49, -2.78, 0.00, 5.55, 2.78];
    var triangles = [0, 1, 2, 2, 3, 4, 4, 5, 6, 7, 5, 4, 2, 1, 3, 7, 4, 3, 0, 8, 9, 2, 6, 0, 3, 1, 10, 5, 8, 6, 9, 1, 0, 1, 9, 10, 10, 9, 11, 8, 11, 9, 11, 7, 10, 4, 6, 2, 8, 0, 6, 7, 11, 5, 10, 7, 3, 5, 11, 8];

    model.vertexBuffer = GLBuffer.Data(gl.ARRAY_BUFFER, new Float32Array(vtx), gl.STATIC_DRAW, 3);
    model.triangles = GLBuffer.Data(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(triangles), gl.STATIC_DRAW, 1);
}