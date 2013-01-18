


function createFacesBuffers(input, model)
{
    var indexOpts = ["triangles", "lines"];
    for (var i in indexOpts) {
        var indexOpt = indexOpts[i];
        if (input[indexOpt]) {
            // less than 32000 vtx
            model[indexOpt] = GLBuffer.Data(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(input[indexOpt]), gl.STATIC_DRAW, 1);
        }
    }
    if (input.quads) { // need to triangulate each quad
        var tridata = new Uint16Array(input.quads.length / 4 * 6); // 2 triangles for each quad
        ti = 0;
        for (var i = 0; i < input.quads.length; i += 4) {
            tridata[ti++] = input.quads[i];
            tridata[ti++] = input.quads[i+1];
            tridata[ti++] = input.quads[i+2];
            tridata[ti++] = input.quads[i];
            tridata[ti++] = input.quads[i+2];
            tridata[ti++] = input.quads[i+3];
        }
        
        model.triangles = GLBuffer.Data(gl.ELEMENT_ARRAY_BUFFER, tridata, gl.STATIC_DRAW, 1);

    }
    
}


function createMeshBuffersIndexed(input, model) 
{
    model.vertexBuffer = GLBuffer.Data(gl.ARRAY_BUFFER, new Float32Array(input.vertexPositions), gl.STATIC_DRAW, 3);

    if (input.vertexNormals) {
        model.vNormalBuffer = GLBuffer.Data(gl.ARRAY_BUFFER, new Float32Array(input.vertexNormals), gl.STATIC_DRAW, 3);
    }
    if (input.vertexTextureCoords) {
        model.vTexCoord = GLBuffer.Data(gl.ARRAY_BUFFER, new Float32Array(input.vertexTextureCoords), gl.STATIC_DRAW, 2);
    }

    if (input.groups) { // compoud mesh with sub groups
        model.groups = [];
        for(var gname in input.groups) {
            var ginput = input.groups[gname];
            var gmodel = {};
            createFacesBuffers(ginput, gmodel);
            model.groups.push(gmodel);
        }
    }
    else { // flat mesh
        createFacesBuffers(input, model);
    }
    
}


function createMeshBuffersInlined(input, model)
{
    model.groups = [];
    for(var gname in input.groups) {
        var ginput = input.groups[gname];
        var gmodel = {};

        var triPos = [];
        var triNorm = [];
        
        var i = 0;
        while (i < ginput.triangles.length) {
            var tripnt = [];

            for (var tri = 0; tri < 3; ++tri) {
                var vidx = ginput.triangles[i];
                var p = [input.vertexPositions[vidx*3], input.vertexPositions[vidx*3+1], input.vertexPositions[vidx*3+2] ]
                triPos.push.apply(triPos, p);
                tripnt[tri] = p;
                ++i;
            }
            //var norm = (tripnt[0].subtract(tripnt[1])).cross(tripnt[0].subtract(tripnt[2]));
            var norm = vec3.ncross(vec3.nsubtract(tripnt[0], tripnt[1]), vec3.nsubtract(tripnt[0], tripnt[2]));
            // add 3 copies of the average normal (no need to normalize, will be done in the shader)
            for (var tri = 0; tri < 3; ++tri) {
                triNorm.push(norm[0], norm[1], norm[2]);
            }    
        }

        gmodel.vertexBuffer = GLBuffer.Data(gl.ARRAY_BUFFER, new Float32Array(triPos), gl.STATIC_DRAW, 3);
        gmodel.vNormalBuffer = GLBuffer.Data(gl.ARRAY_BUFFER, new Float32Array(triNorm), gl.STATIC_DRAW, 3);
        
        gmodel.trianglesInline = true;
        gmodel.diffuseColor = ginput.diffuseColor
        model.groups.push(gmodel);
    }
    
}

// add the elements of the arguments vec3 to an array, assuming 3 elements vectors
/*function arrPushV(arr)
{
    for(var i = 1; i < arguments.length; ++i) {
        arr.push(arguments[i][0], arguments[i][1], arguments[i][2]);
    }
}*/

function arrPushV1(arr, cursor, v)
{
    arr[cursor] = v[0];
    arr[cursor+1] = v[1];
    arr[cursor+2] = v[2];
}


//const GRID_LINE_WIDTH_BASE = 0.2;

// construct the world mesh
// require mesh data to be built first
// this function itself returns almost immediately
// it starts a chain of timeouts that constructs the mesh bit by bit
function createGridMeshBuffers(model, async, ondone, onprogress)
{
    var vtxFlat = new Float32Array(model.totalNeiCount*3);
    var normBuf = new Float32Array(model.totalNeiCount*3);
    var triBuf = []; // triangle indices
    var baseStarting = []; // for every base, in which index it starts in vtxBuf;
    var addedVtx = 0, arrcursor = 0;
    
   // for every point i, to neighbor j connects vertices u,v
   // there is: nei[i].tc[j] = [v,u];
  
    for (var i = 0; i < model.nei.length; ++i) {
        model.nei[i].tc = {};
    }

    var i = 0;
    
    var vtxAdvance = function() {
        for(var ti = 0; ti < 100; ++ti)
        {
            // construct base for vertex i
            var p = model.vtx[i];
            var n = model.normals[i]; // assume it's normalized
            
            var myNeiList = Object.keys(model.nei[i].t);
            var neiCount = model.nei[i].nc; 
          
          //  if (neiCount > 6)
          //      throw new Error("not supported more than 6 neighbors per vertex " + i);
        
            for(var ni in model.nei[i].d)
                model.nei[i].tc[ni] = [];
            
            // put a vertex between every two neighbots
            var basei = baseStarting[i] = addedVtx;
            // ne - current neighbor. nene - next neighbor
            var ne = model.nei[i].t[myNeiList[0]];
            for (var c = 0; c < neiCount; ++c)
            {
                var nene = model.nei[i].t[ne]; // next neighbor
                // vertex between the two neighbors
                var toNe = vec3.nsubtract(model.vtx[ne], p);
                var toNene = vec3.nsubtract(model.vtx[nene], p);
                var between = toNe;
                vec3.normalize(vec3.add(between, toNene));
                vec3.scale(between, model.scale.GRID_LINE_WIDTH * 1.41421);
                vec3.add(between, p);
    
                model.nei[i].tc[ne].unshift(addedVtx);   // save connectivity for the next step
                model.nei[i].tc[nene].push(addedVtx);
                
                arrPushV1(vtxFlat, arrcursor, between);
                arrPushV1(normBuf, arrcursor, n); // pushes flat
                
                ++addedVtx;
                arrcursor += 3;
                
                ne = nene; // neighbor
            }
    
            // add the triangulation of the base
            for(var tadd = 1; tadd < model.nei[i].nc - 1; ++tadd) {
                triBuf.push(basei, basei + tadd, basei + tadd + 1);
            }
            /////////////////
            ++i;
            if (i >= model.vtx.length)
                break;
        }

        var nextStep = (i < model.vtx.length)?vtxAdvance:finishModel;
        return nextStep;
    };
    
    
    var finishModel = function() {
        if (addedVtx > 65536) // vertex buffer cannot be larger than uint16 index
            alert("model too big " + vtxBuf.length + " vertices");
        
        // make grid bridges
        var tempnei = new Array(model.vtx.length); // used for remembering which neighbors we've already done
        for (var i = 0; i < tempnei.length; ++i) 
            tempnei[i] = {};
            
        for(var i = 0; i < model.vtx.length; ++i) //model.vtx.length
        {       
            for(var n in model.nei[i].d)
            {
                n = parseInt(n);
                // avoid adding every neighbor twice
                var sortedi = (i<n)?[i,n]:[n,i];
                if (tempnei[sortedi[0]][sortedi[1]])
                    continue;
                tempnei[sortedi[0]][sortedi[1]] = true;
                
                var ci = model.nei[i].tc[n];
                var bi = model.nei[n].tc[i];
    
                triBuf.push(ci[0], bi[1], bi[0]);
                triBuf.push(ci[0], bi[0], ci[1]);
            }
        }
        
        delete tempnei;
        delete baseStarting;
        
        // make buffers
        if (typeof(gl) !== 'undefined') { // not worker
            model.vertexBuffer = GLBuffer.Data(gl.ARRAY_BUFFER, vtxFlat, gl.STATIC_DRAW, 3);
            model.vNormalBuffer = GLBuffer.Data(gl.ARRAY_BUFFER, normBuf, gl.STATIC_DRAW, 3);
            model.triangles = GLBuffer.Data(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(triBuf), gl.STATIC_DRAW, 1);
           // if (writeModel)
           //     writeModel(vtxFlat, normBuf, triBuf);
            delete vtxFlat;
            delete normBuf;
            delete triBuf;
        
        } else {
            model.vertexBuffer = vtxFlat;
            model.vNormalBuffer = normBuf;
            model.triangles = new Uint16Array(triBuf);
        }
    
       // writeDebug("done " + triBuf.length/3);
    
        for (var i = 0; i < model.nei.length; ++i) 
            delete model.nei[i].tc;

        return null;
    }
  
    var cnext = vtxAdvance;
    
    var runOnce = function() {
        cnext = cnext();
        if (cnext === null) {
            if (onprogress)
                onprogress(1);
            ondone();
        }
        else if (onprogress)
            async = onprogress(i/(model.vtx.length+200));
    }
    
    var runner = function() {
        runOnce()
        if (cnext !== null && async)
            setTimeout(runner, 100);
        else {
            while (cnext !== null && !async) {
                runOnce();
            }
        }
    }
    
    // run it 
    runner();
    
    
}



function indexDist(model, a, b) {
    return vec3.distance(model.vtx[a], model.vtx[b]);
}
vec3.minwith = function(a, b) {
    if (b[0] < a[0]) a[0] = b[0];
    if (b[1] < a[1]) a[1] = b[1];
    if (b[2] < a[2]) a[2] = b[2];        
}
vec3.maxwith = function(a, b) {
    if (b[0] > a[0]) a[0] = b[0];
    if (b[1] > a[1]) a[1] = b[1];
    if (b[2] > a[2]) a[2] = b[2];
}
vec3.distance = function(a, b) {
    return Math.sqrt((a[0]-b[0])*(a[0]-b[0]) + (a[1]-b[1])*(a[1]-b[1]) + (a[2]-b[2])*(a[2]-b[2]));
}


// read the data into the a proper mesh data and generate neighbor information
function createMeshData(input, model) {
    model.vtx = [];
    model.bbox = { min: vec3.create([99, 99, 99]), max: vec3.create([-99, -99, -99]) };
    for (var i = 0; i < input.vertexPositions.length; i += 3) {
        p = vec3.create([input.vertexPositions[i], input.vertexPositions[i + 1], input.vertexPositions[i + 2]]);
        model.vtx.push(p);
        vec3.minwith(model.bbox.min, p);
        vec3.maxwith(model.bbox.max, p);
    }

    model.bbox.size = vec3.distance(model.bbox.min, model.bbox.max);
    writeDebug(model.vtx.length + " vertices in world bbox=" + model.bbox.size);
    model.normals = [];
    if (input.vertexNormals) {
        for (var i = 0; i < input.vertexNormals.length; i += 3) {
            model.normals.push(vec3.create([input.vertexNormals[i], input.vertexNormals[i + 1], input.vertexNormals[i + 2]]));
        }
    }
    model.nei = []; // for every vertex, map a list of neighboring vertices
    var nei = new Array(model.vtx.length);
    for (var i = 0; i < nei.length; ++i) 
        nei[i] = { d:{}, t:{}, nc:0 };
    // d: distances by point index,
    // t: order of neighbors going clockwise,
    // nc: neighbor count
    // r: in case of nc!=4, same as t but with negatives as well maybe (to avoid loops)
        
    if (!input.quads)
        throw new Error("not supported"); //(input.lines) {

    var distSum = 0, distCount = 0, d;

    for (var i = 0; i < input.quads.length; i += 4) {
        var a = input.quads[i], b = input.quads[i+1], c = input.quads[i+2]; d = input.quads[i+3];
        ds = indexDist(model, a, b); nei[a].d[b] = ds; nei[b].d[a] = ds; distSum += ds;
        ds = indexDist(model, b, c); nei[b].d[c] = ds; nei[c].d[b] = ds; distSum += ds;
        ds = indexDist(model, c, d); nei[c].d[d] = ds; nei[d].d[c] = ds; distSum += ds;
        ds = indexDist(model, d, a); nei[d].d[a] = ds; nei[a].d[d] = ds; distSum += ds;
        distCount += 4;
        // add pairs of corners to sort out the order of the neighbors later
        nei[a].t[b] = d; // point a sees neighbors from b to d
        nei[b].t[c] = a;
        nei[c].t[d] = b;
        nei[d].t[a] = c;
    }
    
    // count neightbors. need this for the allocation of the neighbor vertices
    var totalNeiCount = 0; 
    for (var i = 0; i < nei.length; ++i) {
        var myNeiList = Object.keys(nei[i].t);
        nei[i].nc = myNeiList.length;
        totalNeiCount += myNeiList.length;
    }
    
    // nei[i].d[j] - the distance fromo i to to neighbor j
    // nei[i].t[j] - the index of the next neighbor of i on the right of j
        
    model.totalNeiCount = totalNeiCount;
    model.distAvg = distSum/distCount;
    model.scale = worldScales(model.distAvg);

    writeDebug(model.distAvg)
    
    model.nei = nei;
   
}


function makeWorldSync(input, progress)
{
    var model = {};
    createMeshData(input, model);
    createGridMeshBuffers(model, false,
    function() {  // done
    }, 
    function(pc) { // progress
        if (progress)
            progress(pc)
        return false; 
    })
    return model;
}


// give values to various parameters that depend on the scale of the world
// 4 div -> 0.11333
// 5 div -> 0.0526
function worldScales(distAvg)
{
    var s = {};
    s.GRID_LINE_WIDTH = distAvg * 0.19;  // 0.01
    s.WALL_WIDTH = distAvg * 0.28;        // 0.015
    s.WALL_HEIGHT = distAvg * 1.92;      // 0.1
    s.BIKE_SCALE = distAvg * 0.96;       // 0.05
    s.BASE_SPEED = distAvg * 0.01522;      // 0.0008
    s.GLOBAL_SCALE = distAvg / 0.052; // used for explosion
    s.BONUS_LIFE = distAvg * 0.475;      // 0.025
    return s;
}




var RING_DIV = 100;
var RING_WIDTH = 0.03;  // when the ring is of radius 1.0
var NUM_SPIKES = 40;
var SPIKE_WIDTH = 0.015;

function makeExplosionGeom(model)
{
    // make ring model
    var vtx = [];
    var normals = [];
    var triangleStrip = [];
    
    for(var i = 0; i < RING_DIV; ++i)
    {
        var angle = (Math.PI * 2 / RING_DIV) * i;
        var x = Math.cos(angle);
        var y = Math.sin(angle);
        vtx.push(x, y, 0, x*(1+RING_WIDTH), y*(1+RING_WIDTH), 0);  // two concentric vertices on the x-y plane
        normals.push(0,0,1,0,0,1);

        triangleStrip.push(2*i, 2*i+1); 
    }
    // connect the last to the first
    triangleStrip.push(0, 1);

    // the normals are redundant because we don't use lighting but removing them compicates the renderer
    model.ring = {};
    model.ring.vertexBuffer = GLBuffer.Data(gl.ARRAY_BUFFER, new Float32Array(vtx), gl.STATIC_DRAW, 3);
    model.ring.vNormalBuffer = GLBuffer.Data(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW, 3);
    model.ring.triangleStrip = GLBuffer.Data(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(triangleStrip), gl.STATIC_DRAW, 1);

 //   writeModelStrip(vtx, normals, triangleStrip);

    // make spikes model
    vtx = [];
    normals = [];
    var triangles = [];
    
    var angleInterval = (Math.PI * 2 / NUM_SPIKES);
    for(var i =0; i < NUM_SPIKES; ++i)
    {
        var angle = angleInterval * i;
        // the angle can change in the interval of this spike
        // the length can change from 1.2 to 0.8
        angle += (Math.random()-0.5)*angleInterval
        var len = (Math.random()-0.5)*0.4 + 1;
        var x = Math.cos(angle);
        var y = Math.sin(angle);
        
        var base1x = y*SPIKE_WIDTH;
        var base1y = -x*SPIKE_WIDTH;
        
        vtx.push(x*len, y*len, 0, base1x, base1y, 0, -base1x, -base1y, 0);
        normals.push(0,0,1,0,0,1,0,0,1);
        triangles.push(3*i, 3*i+1, 3*i+2);
    }
    
    model.spikes = {};
    model.spikes.vertexBuffer = GLBuffer.Data(gl.ARRAY_BUFFER, new Float32Array(vtx), gl.STATIC_DRAW, 3);
    model.spikes.vNormalBuffer = GLBuffer.Data(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW, 3);
    model.spikes.triangleStrip = GLBuffer.Data(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(triangles), gl.STATIC_DRAW, 1);

   // writeModel(vtx, normals, triangles);

}




