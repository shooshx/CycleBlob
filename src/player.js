

// call with gl.ELEMENT_ARRAY_BUFFER or gl.ARRAY_BUFFER
function GLBuffer(target) {
    if (arguments.length != 1)
        throw new Error("GLBuffer() needs 1 arguments");

    this.buf = gl.createBuffer();
    this.target = target;
}

// c'tor with data
// array should be a new TypedArray
//   target: gl.ELEMENT_ARRAY_BUFFER or gl.ARRAY_BUFFER
//   initArray: TypedArray of items
//   usage: gl.STATIC_DRAW for instance
//   elementsInItem: (x,y,z) is 3 items
GLBuffer.Data = function(target, initArray, usage, elementsInItem) {
    if (arguments.length != 4)
        throw new Error("GLBuffer.Data needs 4 arguments");

    var b = new GLBuffer(target);
    gl.bindBuffer(b.target, b.buf);
    gl.bufferData(b.target, initArray, usage);
    b.itemSize = elementsInItem;
    b.numItems = initArray.length / elementsInItem;
    
    if (initArray instanceof Float32Array)
        b.type = gl.FLOAT;
    else if (initArray instanceof Uint32Array)
        b.type = gl.UNSIGNED_INT;
    else if (initArray instanceof Int32Array)
        b.type = gl.INT;
    else if (initArray instanceof Uint16Array)
        b.type = gl.UNSIGNED_SHORT;
    else if (initArray instanceof Int16Array)
        b.type = gl.SHORT;
    else if (initArray instanceof Uint8Array)
        b.type = gl.UNSIGNED_BYTE;
    else if (initArray instanceof Int8Array)
        b.type = gl.BYTE;
        
    return b;
}

function glTypes() {
    if (!glTypes.t) {
        glTypes.t = {};
        glTypes.t[gl.FLOAT] =          { byteSize: 4, arrCtor: Float32Array };
        glTypes.t[gl.UNSIGNED_INT] =   { byteSize: 4, arrCtor: Uint32Array };
        glTypes.t[gl.INT] =            { byteSize: 4, arrCtor: Int32Array };
        glTypes.t[gl.UNSIGNED_SHORT] = { byteSize: 2, arrCtor: Uint16Array };
        glTypes.t[gl.SHORT] =          { byteSize: 2, arrCtor: Int16Array };
        glTypes.t[gl.UNSIGNED_BYTE] =  { byteSize: 1, arrCtor: Uint8Array };
        glTypes.t[gl.BYTE] =           { byteSize: 1, arrCtor: Int8Array };
    }
    return glTypes.t;
}

// c'tor with size
// an item is for instance a Vec3
// an element is for instance a single float
//   target: gl.ELEMENT_ARRAY_BUFFER or gl.ARRAY_BUFFER
//   bytesInElement: x is a float and has 4 bytes
//   elementsInItem: (x,y,z) is 3 items
//   nItems: number of vertices/indexes to allocate
//   usage: gl.DYNAMIC_DRAW for instance
//   recordData: boolean - should the appended data be recorded, the TypedArray is created according to the type
GLBuffer.Size = function(target, type, elementsInItem, nItems, usage, recordData) {
    if (arguments.length < 5)
        throw new Error("GLBuffer.Size needs 5 or 6 arguments");

    var b = new GLBuffer(target);
    b.itemSize = elementsInItem;
    b.numItems = 0; // size with actual data appended
    b.allocElements = elementsInItem * nItems;
    var typeObj = glTypes()[type]
    b.bytesInElement = typeObj.byteSize;

    gl.bindBuffer(b.target, b.buf);
    gl.bufferData(b.target, b.bytesInElement * elementsInItem * nItems, usage)
    if (recordData) {
        b.record = new typeObj.arrCtor(elementsInItem * nItems);
    }
    return b;
}

// array should be a new TypedArray
GLBuffer.prototype.append = function(addArray) {
    if (!this.allocElements)
        throw new Error("Cannot append to this kind of GLBuffer");
    if (addArray.BYTES_PER_ELEMENT !== this.bytesInElement)
        throw new Error("Cannot append this type of array " + addArray.toString + " != " + this.bytesInElement);
    if (this.numItems + addArray.length >= this.allocElements) // too long
        return null;

    gl.bindBuffer(this.target, this.buf);
    gl.bufferSubData(this.target, this.numItems * this.itemSize * this.bytesInElement, addArray);

    if (this.record) { // copy the array item by item. future version- built in copy?
        for(var i = 0; i < addArray.length; ++i) 
            this.record[this.numItems * this.itemSize + i] = addArray[i];
    }

    var startAt = this.numItems;
    this.numItems += addArray.length / this.itemSize;
    return startAt; // the index of the first item added in this bunch
}

GLBuffer.prototype.backtrack = function(nItems) {
    this.numItems -= nItems;
    this.numItems = Math.max(this.numItems, 0);
}

GLBuffer.prototype.bind = function() {
    gl.bindBuffer(this.target, this.buf);
}

GLBuffer.prototype.rewriteWithRecord = function() {
    gl.bindBuffer(this.target, this.buf);
    gl.bufferSubData(this.target, 0, this.record);
    
}

///////////////////////////////////////////////////////////////////////////////////////////////////////

var Directions = {
    Left: { name: "Left", opposite: {}, leftHand: {}, rightHand: {}, move:null },
    Right: { name: "Right", opposite: {}, leftHand: {}, rightHand: {}, move:null },
    Up: { name: "Up", opposite: {}, leftHand: {}, rightHand: {}, move:null },
    Down: { name: "Down", opposite: {}, leftHand: {}, rightHand: {}, move:null }
};

Directions.Left.opposite = Directions.Right; Directions.Left.leftHand = Directions.Down; Directions.Left.rightHand = Directions.Up; 
Directions.Right.opposite = Directions.Left; Directions.Right.leftHand = Directions.Up;  Directions.Right.rightHand = Directions.Down;
Directions.Up.opposite = Directions.Down; Directions.Up.leftHand = Directions.Left; Directions.Up.rightHand = Directions.Right; 
Directions.Down.opposite = Directions.Up; Directions.Down.leftHand = Directions.Right; Directions.Down.rightHand = Directions.Left;

Directions.getRelativeDir = function(from, reldir) {
    if (reldir === Directions.Left)
        return from.leftHand;
    if (reldir === Directions.Right)
        return from.rightHand;
    if (reldir === Directions.Up)
        return from;
    if (reldir === Directions.Down)
        return from.opposite;
    return null;
}

//
var PlayerColors = [
    { model: [0.2, 0.22, 1.0], trail: [0.1, 0.1, 1.0],  text: "#3939FF", name: "Blue" },   // blue
    { model: [1.0, 0.12, 0.1], trail: [1.0, 0.1, 0.1],  text: "#FF1313", name: "Red" },   // red
    { model: [1.0, 0.43, 0.0], trail: [1.0, 0.48, 0.0], text: "#FF6701", name: "Orange" },  // orange
    { model: [0.0, 0.82, 0.1], trail: [0.0, 0.9, 0.1],  text: "#14A800", name: "Green" },   // green
    { model: [0.74, 0.1, 1.0], trail: [0.71, 0.0, 1.0], text: "#D21DFF", name: "Purple" },   // purple
    { model: [1.0, 0.92, 0.1], trail: [1.0, 0.92, 0.1], text: "#FFE401", name: "Yellow" }  // yellow
];

function Wall() {
    // the queue of points is needed because the point the bike is on is not the point where we start to draw wall
    // the wall is started POINT_DELAY steps after the bike
    this.queue = [];
    this.pntRecord = []; // a record of the indexes of the world points the wall passes on
    this.standing = true;
}


function Player(id, inmodel, startPoint) {
    this.alive = true; 
    this.model = inmodel; // mesh model 
    this.id = id;
    this.ready = false;  // remove?
    this.modelColor = PlayerColors[id].model;
    this.trailColor = PlayerColors[id].trail;
    this.textColor = PlayerColors[id].text;
    this.name = PlayerColors[id].name;

    this.point = startPoint;  // point index on the world mesh where the player stands
    this.normal =  vec3.create([0, 0, 1]);  // immutable.
    this.rightHand = vec3.create([1, 0, 0]); // vector for absolute right of the player in screen space
    this.upDir = vec3.create([0, 1, 0]); // vector for absolute up of the player in screen space. immutable. 
    this.forward = this.upDir;
    this.last = { point: -1, normal: null, upDir: null, forward: null };
    
    // we need to have a last point even though we just landed here.
    // look for the neighbor the point in the opposide direction
    this.last.point = directionNeiAbs(this.point, vec3.nnegate(this.forward));

    this.eDir = Directions.Up;  // direction on the scene the player is currently facing (don't modify from outside)
    this.selDir = Directions.Up; // direction the user selects he wants to go next
    
    this.wall = new Wall();
    this.ai = null; // computer controlled or user controlled (inited in startLife)
    this.sfx = { explode:null, wall_decent:null };  // if not null, these is the instances of the ongoing special effects

    this.lastMadeMoves = 0; // how many moves I did in the last ai check
   // this.moveDistDiff = 0; // the difference between how long we need to go to how long we went
    
    this.dNow2Last = 0; // distance between the current position to the last position
    this.dNow2Point = 0; // distance between the current position to the current point (this.point)
    // when the current position is between last and point, both distances are positive
    this.curStepFrac = 1; // current step fraction [0-1]. start at the latest point
    // the camera uses this to interpolate between the next and previos points/
    // placing the bike uses this to interpolate between two points on the trail queue
    // the wall building uses this to interpolate between two points behind the bike.
    
    this.lastMvDist = 1;

    this.turnCallback = null; // if not null, called when a turn is made (for sound)
    this.stepCount = 0; // how many steps we did. (for wall count used by AI)
    
    // needs to be last
    this.selDir.move.call(this); // align to surface (set the normal, right and up)
}

// called after everything is loaded
// require world mesh
Player.prototype.init = function() {

    this.normal = world.model.normals[this.point];
    this.rightHand = vec3.ncross(this.forward, this.normal)

    // every world vertex in a wall adds 2 new indices (wall base, wall rise)
    var indexesCount = world.model.vtx.length * 2;

    // right wall
    this.wall.idxRbuf = GLBuffer.Size(gl.ELEMENT_ARRAY_BUFFER, gl.UNSIGNED_SHORT, 1, indexesCount, gl.DYNAMIC_DRAW);
    // left wall
    this.wall.idxLbuf = GLBuffer.Size(gl.ELEMENT_ARRAY_BUFFER, gl.UNSIGNED_SHORT, 1, indexesCount, gl.DYNAMIC_DRAW);
    // top cover
    this.wall.idxTbuf = GLBuffer.Size(gl.ELEMENT_ARRAY_BUFFER, gl.UNSIGNED_SHORT, 1, indexesCount, gl.DYNAMIC_DRAW);

    // every world vertex in a wall adds 4 wall vertices, each with 3 elements
    var verticesCount = world.model.vtx.length * 3 * 4;

    this.wall.vtxBuf = GLBuffer.Size(gl.ARRAY_BUFFER, gl.FLOAT, 3, verticesCount, gl.DYNAMIC_DRAW, true);
    this.wall.normalsBuf = GLBuffer.Size(gl.ARRAY_BUFFER, gl.FLOAT, 3, verticesCount, gl.DYNAMIC_DRAW);
    
    // add starting cap of wall as part of the top triangles
    this.wall.idxTbuf.append(new Uint16Array([0, 2, 4, 5])); // still not very good. need duplicate vertices
    
    this.postMove(this.eDir); // set the wall for the starting point

    this.ready = true;
}




//Wall.WALL_WIDTH = 0.015; 
//Wall.WALL_HEIGHT = 0.1;
//Wall.WALL_WIDTH = 0.03; 
//Wall.WALL_HEIGHT = 0.2;

Wall.POINT_DELAY = 4; // the number of steps back the wall takes (the length of the queue)

// this function was specifically optimized to do as little possible new creations of vectors.
Wall.prototype.addRawPoint = function()
{ // static variables.
    var fwr = vec3.create(), fwl = vec3.create();
    var rn = vec3.create(), ln = vec3.create(), tn = vec3.create();
    var rp = vec3.create(), lp = vec3.create();
    var rap = vec3.create(), lap = vec3.create();
    var concat = new Float32Array(6*3);

    function concatVecs() {
        var ri = 0;
        for(var i = 1; i < 7; ++i) {
            concat[ri++] = arguments[i][0];
            concat[ri++] = arguments[i][1];
            concat[ri++] = arguments[i][2];
        }
        return concat;
    }
    
    var indexPair = new Uint16Array(2);
    function makePair(a, b) {
        indexPair[0] = a;
        indexPair[1] = b;
        return indexPair;
    }

    return function(leftAdd, rightAdd, p, n, rightHand, forward) {
        // points of a corner need to go a smalls step backwards and forwards
        var WW = world.model.scale.WALL_WIDTH, WH = world.model.scale.WALL_HEIGHT;
    
        vec3.set(forward, fwr);
        vec3.scale(fwr, rightAdd);
        vec3.set(forward, fwl);
        vec3.scale(fwl, leftAdd);
        
        // normals of a corner need to be slanted forward 45 degrees (normalized in the shader). this creates a round corner effect
        // another solution would be to duplicate the vertices which would make the corner sharp
        //var rn = vec3.nadd(rightHand, vec3.x(forward, rightAdd));
        //var ln = vec3.nadd(vec3.nnegate(rightHand), vec3.x(forward, leftAdd));
        
        vec3.set(rightHand, rn);
        vec3.add(rn, fwr);
        vec3.set(rightHand, ln);
        vec3.negate(ln);
        vec3.add(ln, fwl);
        if (viewControl.bikeFlip) {
            vec3.negate(n, tn); 
            n = tn;
        }
        
        this.normalsBuf.append(concatVecs(concat, rn, rn, ln, ln, n, n));
    
        vec3.set(rightHand, rp);
        vec3.scale(rp, WW);
        vec3.add(rp, p);
        vec3.scale(fwr, WW);
        vec3.add(rp, fwr);
        
        vec3.set(rightHand, lp);
        vec3.scale(lp, -WW);
        vec3.add(lp, p);
        vec3.scale(fwl, WW);
        vec3.add(lp, fwl);
        
    /*    var rp = vec3.create(p);
        vec3.add(rp, vec3.x(rightHand, WW));
        vec3.add(rp, vec3.x(forward, rightAdd * WW));
        var lp = vec3.create(p);
        vec3.add(lp, vec3.x(rightHand, -WW));
        vec3.add(lp, vec3.x(forward, leftAdd * WW));
        
        var rap = vec3.nadd(rp, vec3.x(n, WH));
        var lap = vec3.nadd(lp, vec3.x(n, WH));*/
        
        vec3.scale(n, WH, fwr) // reuse fwr;
        vec3.set(rp, rap);
        vec3.add(rap, fwr);
        vec3.set(lp, lap);
        vec3.add(lap, fwr);
        
        var vs = this.vtxBuf.append(concatVecs(concat, rp, rap, lp, lap, rap, lap)); // returns the starting index
    
        this.idxRbuf.append(makePair(vs, vs + 1));
        this.idxLbuf.append(makePair(vs + 2, vs + 3));
        this.idxTbuf.append(makePair(vs + 4, vs + 5));
    }    
}();


Wall.prototype.addPoint = function(leftAdd, rightAdd, player)
{
    this.pntRecord.push(player.point);
    var p = world.model.vtx[player.point]; //added point
    var n = world.model.normals[player.point]; // point normal
    this.addRawPoint(leftAdd, rightAdd, p, n, player.rightHand, player.forward);
}


Wall.prototype.backtrackRawPoint = function() {
    this.vtxBuf.backtrack(6);
    this.normalsBuf.backtrack(6);
    this.idxRbuf.backtrack(2);
    this.idxLbuf.backtrack(2);
    this.idxTbuf.backtrack(2);
}

Wall.prototype.backtrackPoint = function() {
    this.pntRecord.pop();
    this.backtrackRawPoint();
}


Wall.prototype.queuePoint = function(leftAdd, rightAdd, player) {
    if (Wall.POINT_DELAY === 0)
        this.addPoint(leftAdd, rightAdd, player);
    else {
        this.queue.push( { la:leftAdd, ra:rightAdd, playerDummy: {
                             point:player.point, forward:player.forward, rightHand:player.rightHand } } );
        if (this.queue.length > Wall.POINT_DELAY) {
            var qmv = this.queue.shift();
            this.addPoint(qmv.la, qmv.ra, qmv.playerDummy);
        }
    }
}

Wall.prototype.queueBacktrack = function() {
    if (Wall.POINT_DELAY === 0 || this.queue.length === 0)
        this.backtrackPoint();
    else
        this.queue.pop(); // just remove the last thing entered into the queue.
}

Wall.prototype.flushQueue = function() {
    while (this.queue.length > 0) {
        var qmv = this.queue.shift();
        this.addPoint(qmv.la, qmv.ra, qmv.playerDummy);
    }
}

// called when the player dies
Wall.prototype.deathEnd = function(player) {
    // last point should be recessed because I don't want it to go over
    // the wall collided to.
    this.queueBacktrack();
    this.queuePoint(-1,-1, player); // also affects normals...
    this.flushQueue()
}

// frac: [0-1] of the full height
Wall.prototype.setWallHeight = function(frac) {
    var height = frac * world.model.scale.WALL_HEIGHT;
    if (viewControl.bikeFlip)
        height = -height; // wall goes to the inside
    // vtxBuf is made of 6 items of 3 elements. first two are the base-right, high-right, base-left, high-left, top-right, top-left
    
    // we're going to modify this data and rewrite it to the buffer
    var data = this.vtxBuf.record;
    var nPnt = this.pntRecord.length;
    
    for(var i = 0; i < nPnt; ++i)
    {
        var n = vec3.x(world.model.normals[this.pntRecord[i]], height); // point normal scaled by the required height
        var ii = i*6*3; // item index
        var br = vec3.create([data[ii], data[ii+1], data[ii+2]]);
        ii = (i*6+2)*3;
        var bl = vec3.create([data[ii], data[ii+1], data[ii+2]]);
        br = vec3.nadd(br, n);
        bl = vec3.nadd(bl, n);
        ii = (i*6+1)*3; // high-right
        data[ii] = br[0]; data[ii+1] = br[1]; data[ii+2] = br[2];
        ii = (i*6+4)*3; // top-right
        data[ii] = br[0]; data[ii+1] = br[1]; data[ii+2] = br[2];
        ii = (i*6+3)*3; // high-left
        data[ii] = bl[0]; data[ii+1] = bl[1]; data[ii+2] = bl[2];
        ii = (i*6+5)*3; // top-left
        data[ii] = bl[0]; data[ii+1] = bl[1]; data[ii+2] = bl[2];
        
    }
    
    this.vtxBuf.rewriteWithRecord();
    
}

// extend the wall to the fraction of the next point to avoid
// blinking of the trail behind the bike
Wall.prototype.fracExtend = function(player) {
    if (this.pntRecord.length === 0)
        return false;
    var lpi = this.pntRecord[this.pntRecord.length - 1];
    var nwd; // next wall dummy player 
    if (this.queue.length > 0)
        nwd = this.queue[0].playerDummy; // head of the queue is the next point to be added
    else
        nwd = player;
    var npi = nwd.point;
    var frac = player.curStepFrac;
    //var p = world.model.vtx[npi].x(frac).add( world.model.vtx[lpi].x(1-frac) );
    var p = vec3.linearMix(world.model.vtx[npi], world.model.vtx[lpi], frac);
    var n = world.model.normals[npi];
    var right = nwd.rightHand;
    var forward = nwd.forward;
    
    this.addRawPoint(0, 0, p, n, right, forward);
    return true;
}


Player.prototype.getBikeOrient = function() {
    var forward, normal;
    if (this.wall.queue.length == 0) {
        forward = this.forward;
        normal = world.model.normals[this.point];        
    }
    else if (this.wall.queue.length == 1) {
        var dummyPlayer = this.wall.queue[0].playerDummy;
        forward = dummyPlayer.forward;
        normal = world.model.normals[dummyPlayer.point];
    }
    else
    {
      //  var nqi = Math.floor(this.wall.queue.length / 2); // size->index: 3->1, 2->1, 1->0
        var nqi = Math.min(this.wall.queue.length - 1, 1); // 1->0, 2->1, 3->1
        var dummyPlayer = this.wall.queue[nqi].playerDummy;
        var nextPlayer = this.wall.queue[nqi-1].playerDummy;
        var frac = this.curStepFrac;

        forward = vec3.linearMix(dummyPlayer.forward, nextPlayer.forward, frac);
        normal = vec3.linearMix(world.model.normals[dummyPlayer.point], world.model.normals[nextPlayer.point], frac);
    }
    return { normal: normal, forward: forward }

}

// this is the number of chained lookups in nei[i].t we need to perform to get to the relative
// map neigbor count -> number of loopups (hops)
// with 3 neighbors, right and forward are the same
// with 5 neighbors, right and left are sharp turns, skipping the right-forward neighbor
// with 6 neighbors, right and left are sharp turns, forward is direct, skiping the left-forward and right-forward
// there are no models with more than 6 quads intersecting at the same point. checked in createGridMeshBuffers
var RelativeDir = {
    rightHand: { 4:1, 3:1, 5:1, 6:1 }, 
    forward:   { 4:2, 3:1, 5:2, 6:3 },
    leftHand:  { 4:3, 3:2, 5:4, 6:5 },
    back:      { 4:0, 3:0, 5:0, 6:0 }
}


// pind - point index
// dir - a vector of the direction
function directionNeiAbs(pind, dir) {
    var p = world.model.vtx[pind]
    
    var pnei = world.model.nei[pind].d;
    var maxDot = -100;
    var maxNeiInd = -100;
    for (i in pnei) {
        var np = world.model.vtx[i];
        var ton = vec3.normalize(vec3.nsubtract(np, p));
        var dt = vec3.dot(dir, ton);
        if (dt > maxDot) {
            maxDot = dt;
            maxNeiInd = i;
        }
    }
    return parseInt(maxNeiInd); // key is a string, need it as a number
}


// pind - point index
// reldir - relative direction offset, from RelativeDir
// returns: the index of the neighbor to turn to
function directionNei(pind, reldir, lastp) {
    var nei = world.model.nei[pind];
    
    var hops = reldir[nei.nc];
    var next = lastp; // point we came from to pind
    for(var i = 0; i < hops; ++i)
        next = nei.t[next];
    return next;
}


// calculate the current neighbors in all directions keyd by the relative direction
function calcAllDirNei(pind, lastp) {
    var nei = world.model.nei[pind];

    var neiPoints = {}

    var next = lastp;
    var hops = RelativeDir.rightHand[nei.nc];
    for(var i = 0; i < hops; ++i)
        next = nei.t[next];
    neiPoints.toRight = next;
    
    hops = RelativeDir.forward[nei.nc] - RelativeDir.rightHand[nei.nc];
    for(var i = 0; i < hops; ++i)
        next = nei.t[next];
    neiPoints.toFwd = next;

    hops = RelativeDir.leftHand[nei.nc] - RelativeDir.forward[nei.nc];
    for(var i = 0; i < hops; ++i)
        next = nei.t[next];
    neiPoints.toLeft = next;

//    neiPoints.toRight = directionNei(this.point, RelativeDir.rightHand, this.last.point);
//    neiPoints.toLeft = directionNei(this.point, RelativeDir.leftHand, this.last.point);
//    neiPoints.toFwd = directionNei(this.point, RelativeDir.forward, this.last.point);

    return neiPoints;
}


Player.prototype.preMove = function(newDir) {
    var reldir;    
    // if we're turning, need to fix wall
    if (newDir === this.eDir.rightHand) {
        this.wall.queueBacktrack();
        this.wall.queuePoint(1, -1, this);
        this.wall.flushQueue();
        if (this.turnCallback)
            this.turnCallback(false); // goes to playTurnSound
        reldir = RelativeDir.rightHand;
    }
    else if (newDir === this.eDir.leftHand) {
        this.wall.queueBacktrack();
        this.wall.queuePoint(-1, 1, this);
        this.wall.flushQueue();
        if (this.turnCallback)
            this.turnCallback(true); // playTurnSound
        reldir = RelativeDir.leftHand;
    }
    else {  // can't go back.
        reldir = RelativeDir.forward;
    }

    var next = directionNei(this.point, reldir, this.last.point); // the next index to move to
    var tonext = vec3.nsubtract(world.model.vtx[next], world.model.vtx[this.point]); // approximates up
    var dist = world.model.nei[this.point].d[next]; // return value
    
    this.last = { point: this.point, normal: this.normal, upDir: this.upDir, forward: this.forward };
    this.point = next;
    this.normal = world.model.normals[this.point];
 
    return { tonext:tonext, dist:dist };    
}

// things to do after we went to a new point
Player.prototype.postMove = function(newDir) {
    this.rightHand = vec3.ncross(this.forward, this.normal) // fix it to be actually perpendiculat to the other two

    this.wall.queuePoint(0, 0, this);
    this.eDir = newDir;
}




Player.prototype.moveUp = function() {
    var r = this.preMove(Directions.Up);
    
    this.rightHand = vec3.normalize(vec3.ncross(r.tonext, this.normal));
    this.upDir = vec3.normalize(vec3.ncross(this.normal, this.rightHand));
    this.forward = this.upDir;

    this.postMove(Directions.Up)
    return r.dist;
}

Player.prototype.moveDown = function() {
    var r = this.preMove(Directions.Down);
    
    this.rightHand = vec3.normalize(vec3.ncross(this.normal, r.tonext));
    this.upDir = vec3.normalize(vec3.ncross(this.normal, this.rightHand));
    this.forward = vec3.nnegate(this.upDir);

    this.postMove(Directions.Down)
    return r.dist;
}

Player.prototype.moveLeft = function() {
    var r = this.preMove(Directions.Left);
    
    this.upDir = vec3.normalize(vec3.ncross(r.tonext, this.normal));
    this.rightHand = vec3.normalize(vec3.ncross(this.upDir, this.normal));
    this.forward = vec3.nnegate(this.rightHand);

    this.postMove(Directions.Left)
    return r.dist;
}

Player.prototype.moveRight = function() {
    var r = this.preMove(Directions.Right);

    this.upDir = vec3.normalize(vec3.ncross(this.normal, r.tonext));
    this.rightHand = vec3.normalize(vec3.ncross(this.upDir, this.normal));
    this.forward = this.rightHand;

    // writeDebug("right " + this.point + "->" + next);
    this.postMove(Directions.Right)
    return r.dist;
}

// when using this 'move' property, always call with 'move.call(player)' since 'this'
// needs to be the player, not the direction
Directions.Up.move = Player.prototype.moveUp;
Directions.Down.move = Player.prototype.moveDown;
Directions.Right.move = Player.prototype.moveRight;
Directions.Left.move = Player.prototype.moveLeft;



/*Player.prototype.print = function() {
    writeDebug("up=" + strVector(this.upDir));
    writeDebug("right=" + strVector(this.rightHand));
    writeDebug("n=" + strVector(this.normal));
    writeDebug("fwd=" + strVector(this.forward));
}*/

Player.prototype.prettyName = function() {
    return "<" + this.id + ">" + this.name + "</>";
}



