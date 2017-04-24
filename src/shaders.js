

// get shader text from the DOM
function getShader(gl, elem) {
    var shaderScript = elem; //document.getElementById(id);
    if (!shaderScript) {
        return null;
    }

/*    var str = "";
    var k = shaderScript[0]; //.firstChild;
    while (k) {
        if (k.nodeType == 3) {
            str += k.textContent;
        }
        k = k.nextSibling;
    }*/
    var innerElem = shaderScript;
    var str = innerElem.text;

    var shader;
    if (innerElem.type == "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (innerElem.type == "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }

    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader) + "\n" + innerElem.id);
        return null;
    }

    return shader;
}

function Program() {
    this.prog = null;
}


Program.prototype.init = function (fragElem, vtxElem) {
    var fragmentShader = getShader(gl, fragElem);
    var vertexShader = getShader(gl, vtxElem);

    this.prog = gl.createProgram();
    gl.attachShader(this.prog, vertexShader);
    gl.attachShader(this.prog, fragmentShader);
    gl.linkProgram(this.prog);

    if (!gl.getProgramParameter(this.prog, gl.LINK_STATUS)) {
        alert("Could not initialise shaders");
        return null;
    }
}

Program.prototype.enableArrs = function (en) {
    if (en) {
        gl.enableVertexAttribArray(this.vertexPositionAttribute);
        if (this.vertexNormalAttribute !== undefined)
            gl.enableVertexAttribArray(this.vertexNormalAttribute);
    }
    else {
        gl.disableVertexAttribArray(this.vertexPositionAttribute);
        if (this.vertexNormalAttribute !== undefined)
            gl.disableVertexAttribArray(this.vertexNormalAttribute);
    }
}


Program.prototype.initBkgParams = function () {
    gl.useProgram(this.prog);
    this.vertexPositionAttribute = gl.getAttribLocation(this.prog, "aVertexPosition");
    //gl.enableVertexAttribArray(this.vertexPositionAttribute);

    this.pMatrixUniform = gl.getUniformLocation(this.prog, "uPMatrix");
    this.mvMatrixUniform = gl.getUniformLocation(this.prog, "uMVMatrix");
    this.timeUniform = gl.getUniformLocation(this.prog, "time");
    this.textureUniform = gl.getUniformLocation(this.prog, "noisef");

    //writeDebug(this.pMatrixUniform + "," + this.mvMatrixUniform + "," + this.vertexPositionAttribute);
}

// parameters for the normal shader used for most of the scene except the background
Program.prototype.initNormParams = function() {
    gl.useProgram(this.prog);

    this.vertexPositionAttribute = gl.getAttribLocation(this.prog, "aVertexPosition");
    //gl.enableVertexAttribArray(this.vertexPositionAttribute);

    this.vertexNormalAttribute = gl.getAttribLocation(this.prog, "aVertexNormal");
    //gl.enableVertexAttribArray(this.vertexNormalAttribute);

    // this.textureCoordAttribute = gl.getAttribLocation(this.prog, "aTextureCoord");
    // gl.enableVertexAttribArray(this.textureCoordAttribute);

    this.pMatrixUniform = gl.getUniformLocation(this.prog, "uPMatrix");
    this.mvMatrixUniform = gl.getUniformLocation(this.prog, "uMVMatrix");
    //this.nMatrixUniform = gl.getUniformLocation(this.prog, "uNMatrix");
    //  this.samplerUniform = gl.getUniformLocation(this.prog, "uSampler");
    //this.materialShininessUniform = gl.getUniformLocation(this.prog, "uMaterialShininess");
    //this.showSpecularHighlightsUniform = gl.getUniformLocation(this.prog, "uShowSpecularHighlights");
    //this.useTexturesUniform = gl.getUniformLocation(this.prog, "uUseTextures");
    this.useLightingUniform = gl.getUniformLocation(this.prog, "uUseLighting");
    this.ambientColorUniform = gl.getUniformLocation(this.prog, "uAmbientColor");
    this.pointLightingLocationUniform = gl.getUniformLocation(this.prog, "uPointLightingLocation");
    this.pointLightingSpecularColorUniform = gl.getUniformLocation(this.prog, "uPointLightingSpecularColor");
    this.pointLightingDiffuseColorUniform = gl.getUniformLocation(this.prog, "uPointLightingDiffuseColor");

    this.globColorUniform = gl.getUniformLocation(this.prog, "uGlobColor");
    this.twoSidedUniform = gl.getUniformLocation(this.prog, "uTwoSided");

    //writeDebug(this.pMatrixUniform + "," + this.mvMatrixUniform + "," + this.vertexPositionAttribute);
}


Program.current = null

Program.use = function (prog) {
    if (Program.current === prog)
        return;
    if (Program.current !== null)
        Program.current.enableArrs(false)
    if (prog === null || prog === undefined) {
        gl.useProgram(null);
        Program.current = null;
    }
    else {
        gl.useProgram(prog.prog);
        Program.current = prog;
        if (Program.current !== null)
            Program.current.enableArrs(true)
    }
}


Program.prototype.setMatrixUniforms = function() {
    gl.uniformMatrix4fv(this.pMatrixUniform, false, pr.current);
    gl.uniformMatrix4fv(this.mvMatrixUniform, false, mv.current);

 /*  no need for this. using the MV matrix instead
    var normMat = mat3.create(); 
    mat4.toInverseMat3(mv.current, normMat);
    normMat = mat3.toMat4(normMat);
    mat4.transpose(normMat);

    gl.uniformMatrix4fv(this.nMatrixUniform, false, normMat);*/
    
}

Program.prototype.setColor = function(r, g, b) {
    gl.uniform4f(this.globColorUniform, r, g, b, 1);
}

Program.prototype.setColor4 = function(r, g, b, a) {
    gl.uniform4f(this.globColorUniform, r, g, b, a);
}


Program.prototype.setColorv = function(v) {
    gl.uniform4f(this.globColorUniform, v[0], v[1], v[2], 1);
}

Program.prototype.setColor4v = function(v) {
    gl.uniform4f(this.globColorUniform, v[0], v[1], v[2], v[3]);
}


Program.prototype.setTwoSided = function(b) {
    gl.uniform1i(this.twoSidedUniform, b);    
}
Program.prototype.setUseLight = function(b) {
    gl.uniform1i(this.useLightingUniform, b);
}

Program.prototype.enableNormals = function(b) {
    if (b)
        gl.enableVertexAttribArray(this.vertexNormalAttribute);
    else
        gl.disableVertexAttribArray(this.vertexNormalAttribute);

}

Program.prototype.setTime = function (v) {
    gl.uniform1f(this.timeUniform, v);
}



