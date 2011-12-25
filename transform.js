
function MatrixStack() {
    this.stack = [];
    // 20 deep stack outght to be enough for anyone.
    for(var i = 0; i < 20; ++i)
        this.stack.push(mat4.create());
    this.stackTop = 0; // points to the place in the stack when the next matrix should be pushed to.    
    this.current = mat4.create();
    this.loadIdentity();
}

MatrixStack.prototype.pushMatrix = function(m) {
    if (this.stackTop >= this.stack.length) // deepen the stack...
        this.stack.push(mat4.create());
        
    if (m) {
        //this.stack.push(mat4.create(m));
        //this.current = mat4.create(m);
        mat4.set(m, this.stack[this.stackTop]);
        mat4.set(m, this.current);
    } else {
        //this.stack.push(mat4.create(this.current));
        mat4.set(this.current, this.stack[this.stackTop]);
    }
    ++this.stackTop;
}

MatrixStack.prototype.popMatrix = function() {
    if (this.stackTop === 0) {
        throw "Invalid popMatrix!";
    }
    --this.stackTop;
    
    mat4.set(this.stack[this.stackTop], this.current);
    return this.current;
}

MatrixStack.prototype.loadIdentity = function() {
    mat4.identity(this.current);
}

MatrixStack.prototype.load = function(m) {
    mat4.set(m, this.current);
}


MatrixStack.prototype.multMatrix = function(m) {
    mat4.multiply(this.current, m);
}

// expects an array
MatrixStack.prototype.translate = function(v) {
    mat4.translate(this.current, v);
}


MatrixStack.prototype.scale = function(s) {
    mat4.scale(this.current, [s,s,s]);
}


// v is Array
// angle in degrees
MatrixStack.prototype.rotate = function(angle, v) {
    mat4.rotate(this.current, radFromDeg(angle), v);
}

MatrixStack.prototype.rotateX = function(angle) {
    mat4.rotateX(this.current, radFromDeg(angle));
}
MatrixStack.prototype.rotateY = function(angle) {
    mat4.rotateY(this.current, radFromDeg(angle));
}
MatrixStack.prototype.rotateZ = function(angle) {
    mat4.rotateZ(this.current, radFromDeg(angle));
}



MatrixStack.prototype.perspective = function(fovy, aspect, znear, zfar) {
    mat4.perspective(fovy, aspect, znear, zfar, this.current);
}


var mv = new MatrixStack();
var pr = new MatrixStack();



