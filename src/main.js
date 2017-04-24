if (!writeDebug) {// did not include debug.js
    var writeDebug = function() {}
    var enableDebug = function() {}
    var clearDebug = function() {}
}

function renderFaces(model, defaultColor, prog) {

    if (model.triangles) {
        model.triangles.bind();
        gl.drawElements(gl.TRIANGLES, model.triangles.numItems, model.triangles.type, 0);
    }
    if (model.triangleStrip) {
        model.triangleStrip.bind();
        gl.drawElements(gl.TRIANGLE_STRIP, model.triangleStrip.numItems, model.triangleStrip.type, 0);
    }
    if (model.lines) {
        gl.lineWidth(3.0);
        model.lines.bind();
        gl.drawElements(gl.LINES, model.lines.numItems, model.lines.type, 0);
    }
    
    if (model.trianglesInline)
    {
        if (model.diffuseColor)
            prog.setColor(model.diffuseColor[0], model.diffuseColor[1], model.diffuseColor[2]);
        else if (defaultColor)
            prog.setColorv(defaultColor);
            
        model.vertexBuffer.bind();
        gl.vertexAttribPointer(prog.vertexPositionAttribute, model.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
        model.vNormalBuffer.bind();
        gl.vertexAttribPointer(prog.vertexNormalAttribute, model.vNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLES, 0, model.vertexBuffer.numItems);
    }
    
}

function renderModel(model, defaultColor) {
    var prog = Program.current;
    if (model.vertexBuffer) {
        model.vertexBuffer.bind();
        gl.vertexAttribPointer(prog.vertexPositionAttribute, model.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
    }
        // model.vTexCoord.bind();
        // gl.vertexAttribPointer(shaderProg.textureCoordAttribute, model.vTexCoord.itemSize, gl.FLOAT, false, 0, 0);

    if (model.vNormalBuffer) {
        model.vNormalBuffer.bind();
        gl.vertexAttribPointer(prog.vertexNormalAttribute, model.vNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);
    }

    prog.setMatrixUniforms();

    renderFaces(model, undefined, prog);
    if (model.groups) {
        for(var gname in model.groups) {
            renderFaces(model.groups[gname], defaultColor, prog);
        }
    }
}


function mFromVectors(v1, v2, v3) {  
    var m = mat3.create([v1[0], v1[1], v1[2],
                         v2[0], v2[1], v2[2],
                         v3[0], v3[1], v3[2]]);
    return mat3.toMat4(m);
}



// transform the model-view matrix to that of the user position
// and orientation
function mvTransformToPlayer(player) {
    var frac = player.curStepFrac;

    var p = vec3.linearMix(world.model.vtx[player.point], world.model.vtx[player.last.point], frac);
    mv.translate(p);
 
    var o = player.getBikeOrient(); // { player.normal, player.forward }
    var m = mFromVectors(player.rightHand, o.normal, o.forward);
    mv.multMatrix(m);
}

function setupLighting() {
    //var lighting = idget("lightingUi").checked;
    var lighting = true;
    shaderProg.setUseLight(lighting);
    if (lighting) {
        //var ac = idget("ambientColor")
        var ac = { rgb:[0.2, 0.2, 0.2] };

        gl.uniform3f(shaderProg.ambientColorUniform, ac.rgb[0], ac.rgb[1], ac.rgb[2]);

        //var lightPoint = [ parseFloat(idget("lightPositionX").value), parseFloat(idget("lightPositionY").value), parseFloat(idget("lightPositionZ").value)];
        //var lightPoint = [-10, 4, 20];
        var lightPoint = viewControl.getLight();
        gl.uniform3f(shaderProg.pointLightingLocationUniform, lightPoint[0], lightPoint[1], lightPoint[2]);

        var dc = { rgb:[0.8, 0.8, 0.8] };
        gl.uniform3f(shaderProg.pointLightingDiffuseColorUniform, dc.rgb[0], dc.rgb[1], dc.rgb[2]);

    }
}

function drawScene() 
{
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    ++_drawCount;
    //clearDebug();

    pr.perspective(45,  canvas.width / canvas.height, 0.1 + viewControl.addNearClip, 100.0);

    setupLighting();

    mv.loadIdentity();
    Program.use(shaderProg);

    
    // objects that are static in the scene
    for(var ri in world.staticDraw) {
        world.staticDraw[ri].render();
    }

    // draw world
    var camera = viewControl.getCamera();

    mv.multMatrix(mat4.lookAt(camera.eye, camera.toPoint, camera.upDir));

    if (gameConf.debug) {
        mv.multMatrix(userInput.rotationMatrix);
    }

    
    shaderProg.setColor(1.0, 1.0, 1.0);
    shaderProg.setTwoSided(camera.twoSided);
    renderModel(world.model);

    // draw players and walls
    for (var pi = 0; pi < players.length; ++pi)
    {
        shaderProg.setTwoSided(false);
        var player = players[pi];
    
        if (player.wall.standing) {
            var addedFrac = player.alive && player.wall.fracExtend(player); // don't extend after death
            // draw wall
            var trailColor = player.trailColor;
            if (player.sfx.wall_decent) {
                var f = player.sfx.wall_decent.brightness * 0.6;
                trailColor = vec3.nadd(trailColor, [f,f,f]);
            }
            shaderProg.setColorv(trailColor);
            shaderProg.setMatrixUniforms();
            
            player.wall.vtxBuf.bind();
            gl.vertexAttribPointer(shaderProg.vertexPositionAttribute, player.wall.vtxBuf.itemSize, gl.FLOAT, false, 0, 0);
        
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
            player.wall.normalsBuf.bind();
            gl.vertexAttribPointer(shaderProg.vertexNormalAttribute, player.wall.normalsBuf.itemSize, gl.FLOAT, false, 0, 0);
         
            player.wall.idxRbuf.bind(); //right
            gl.drawElements(gl.TRIANGLE_STRIP, player.wall.idxRbuf.numItems, gl.UNSIGNED_SHORT, 0);
            player.wall.idxLbuf.bind(); //left
            gl.drawElements(gl.TRIANGLE_STRIP, player.wall.idxLbuf.numItems, gl.UNSIGNED_SHORT, 0);
            player.wall.idxTbuf.bind(); //top
            gl.drawElements(gl.TRIANGLE_STRIP, player.wall.idxTbuf.numItems, gl.UNSIGNED_SHORT, 0);
            
            if (addedFrac)
                player.wall.backtrackRawPoint(); // backtrack the extension
        }
        
        if (player.alive) {
            shaderProg.setTwoSided(true);
    
            mv.pushMatrix();
            mvTransformToPlayer(player);
            //mv.scale(2); // big bikes

            if (player.alive) {
                // local transformations to specific model of bike
                mv.rotateX(-90);
                if (viewControl.bikeFlip)
                    mv.rotateY(180);
                //mvScale(0.05);
                mv.scale(world.model.scale.BIKE_SCALE);
                mv.translate([0,2,1.3]);  // Z is in the direction of the normal, Y is the forward direction
            
                renderModel(player.model, player.modelColor);

            }
            
            mv.popMatrix();
        }
    }


    // explosions have alpha so draw them after everything    
    for(var pi = 0; pi < players.length; ++pi) {
        var player = players[pi];
        if (player.sfx.explode) {
            
            mv.pushMatrix();
            mvTransformToPlayer(player);
            
            player.sfx.explode.draw();
            mv.popMatrix();

        }
    }
    
    for(var bi in world.bonuses) {
        world.bonuses[bi].draw();
    }

    Program.use(bkgProg);
    world.background.draw();

    Program.use(shaderProg);
  //  checkGLErrors("draw"); // huge performance hit apparently.

}


function movePlayer(player)
{
    var lastPoint = player.point;
    var dist = player.selDir.move.call(player);
    
    var collide = world.map.getPiece(player.point);
    if (collide !== undefined)
    {
        if (collide >= 1000) { // its a bonus
            var bid = collide - 1000;
            if (world.bonuses[bid]) // should always be true...
                world.bonuses[bid].action(player); // also removes the bonus from the map
        }
        else {
            removePlayer(player, collide);
        }
    }

    ++player.stepCount;        
    // update map after everything?
    world.map.set(lastPoint, player.id + 100, player.stepCount); // put wall in the previous point
    if (collide === undefined)
        world.map.set(player.point, player.id, player.stepCount); // put bike in the current point
        
    return { dist:dist, collide:collide };
}


// velocity is 0.02 in 15 msec
//   0.0013 in 1 msec
//var velocity = 0.0008; //0.0010;

function animate(elapsed) {
     
    var doDraw = false;
    var madeMoves = []; // how many moves each player did

    for(var i = 0; i < players.length; ++i)
    {
        var player = players[i];
        if (player.alive)
        {
            var tickDist = 0;
            if (!game.isPaused())
                tickDist = world.model.scale.BASE_SPEED * game.currentLevel.speed * elapsed;
                
            player.dNow2Last += tickDist;
            player.dNow2Point -= tickDist;
            
            player.lastMadeMoves = 0;
            while (player.dNow2Point < 0)
            {
                // just before moving, this is the time the player has all the needed information
                // for making a move decision
                if (player.ai)
                    player.ai.moveControl(world); 
            
                var mr = movePlayer(player);
                player.dNow2Last = -player.dNow2Point;
                player.dNow2Point += mr.dist;
                player.lastMvDist = mr.dist; // is equal to dNow2Last+dNow2Point but its easier this way.
                
                doDraw = true;
                ++player.lastMadeMoves;
                
                if (mr.collide)
                    break; // don't continue moving if a collision occured
            }
            
            // if not alive (just collided) or we're moving with arrows leave it as 1
            if (player.alive && !game.isPaused()) 
                player.curStepFrac = player.dNow2Last/player.lastMvDist;
            
            // update camera according to current move if it was made
            viewControl.moveUpdate(player);
            
            if (player.lastMadeMoves > 1)
                writeDebug("made " + player.lastMadeMoves + " moves elapsed=" + elapsed);

        }
        
        // advance player specific special effects (explosion, wall decent) animation
        for(var si in player.sfx) {
            if (player.sfx[si]) { 
                player.sfx[si].advance(elapsed);
                doDraw = true;
            }
        }
        
       // writeDebug(player.moveDistDiff.toFixed(3) + " " + iterCount );
    }
    
    for(var si in world.staticDraw) {
        world.staticDraw[si].advance(elapsed);
    }
    for(var bi in world.bonuses) {
        if (!world.bonuses[bi].advance(elapsed)) {
            delete world.bonuses[bi]
        }
    }

    if (!game.isPaused() || game._startPause) // on the start we want to animate the back
        world.background.advance(elapsed); // 3d background stripes
    
    if (c2d.menuAnim)
        c2d.menuAnim(elapsed)
    
    return doDraw;
    //writeDebug(elapsed + " " + iterCount );
}

var dispFps = function() {
    var sum = 0, count = 0;
    return function(elapsed) {
        sum += elapsed;
        ++count;
        if (count > 10) {
            fpsui.innerHTML = "FPS: " + Math.round(1000/(sum/count)) ;
            sum = 0;
            count = 0;
        }
    }
}();

var lastAnimTime = 0;
var _drawCount = 0;


function tick() {
    WebGLUtils.requestAnimationFrame(canvas, tick);

    var timeNow = new Date().getTime();
    var elapsed = 0;
    if (lastAnimTime != 0) {
        elapsed = timeNow - lastAnimTime;
    }
    else {
        writeDebug("RESET time");
        lastAnimTime = timeNow;
        return;
    }
    
    //if (elapsed < 27) // don't go to 60 Hz
    //    return;
    
    // compensate for delays
    // this will create a small bump of no movement but that's better than crashing
    if (elapsed > 40) {
       // writeDebug("elapsed " + elapsed + " comp");
        elapsed = 40; // don't skip steps
    }
    
    lastAnimTime = timeNow;

    // give user chance to move
    sampleKeys(userPlayer); // this is not inside enable3d so that keys would not remain stuck
    
    if (c2d.has3dContent)
        c2d.draw3d(elapsed);
        
    if (!world.ready || !resources._ready || !enabled3d)
        return;
    
    var doDraw = animate(elapsed);

    if (enabled3d) // enabled3d can change in animate
        drawScene();
    
    if (gameConf.printFps)
        dispFps(elapsed);

}


// with some luck, deploy a bonus to the world
// activated every 1000 msec
function deployBonus() {
    if (!world.ready || !resources._ready || !enabled3d || game.isPaused())
        return;
    
    //var chance = 100
    var chance = (world.bonuses.length > 0)?0.2:3
    // 5% chance every 500 msec is 1 in 10 sec
    // 2% chance every 500 msec is 1 in 25 sec
    if (randomChoise(chance)) {  
        addBonus();
    }
}



var gl;
function initGL(canvas) {
    
    gl = WebGLUtils.setupWebGL(canvas, { antialias:true, stencil: false, alpha: true });
    if (!gl) {
        return false;
    }
    
    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;
    
    gl.clearColor(0.0, 0.0, 0.0, 1.0); 
    gl.clearDepth(1.0);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    
    checkGLErrors("init");
    return true;
}

function PieceMap() {
    // lower 16 bits (piece)
    //  holds which walls occupy which vertices. maps vertex index->player id
    //  undefined : empty
    //  [1000, 1100] : bonuses
    //  [0, 99] : players
    //  [100, 199] : walls of players (every wall, it's own distinct number)
    // higher 16 bits (meta)
    //  for player/wall: creation time - acending counter
    this.data = []
}
PieceMap.prototype.getPiece = function (index) {
    var v = this.data[index];
    if (v === undefined)
        return v;
    return v & 0xffff;
}
PieceMap.prototype.getMeta = function (index) {
    var v = this.data[index];
    if (v === undefined)
        return v;
    return v >> 16;
}
PieceMap.prototype.get = function (index) {
    return this.data[index];
}
PieceMap.piece = function (val) {
    return val & 0xffff;
}
PieceMap.meta = function (val) {
    return val >> 16;
}
PieceMap.prototype.set = function (index, piece, meta) {
    if (piece > 0x7fff || meta > 0x7fff)
        throw Error("Out of range for map " + piece + " " + meta)
    this.data[index] = (piece & 0xffff) | meta << 16;
}
PieceMap.prototype.unset = function (index) {
    delete this.data[index];
}


var shaderProg = new Program();
var bkgProg = new Program();

// re-initialized in startLife()
var world = {

    map: new PieceMap(),
    // world.ready means the world is loaded, processed and ready for play
    ready: false
};


var userPlayer = null;  // human controlled player
var players = [];  // list of all players
var viewControl = null;
var canvas, canvas2d = null; // needs to be global for requestAnimationFrame and others
var ctx2d = null;
var enabled3d = false;
var c2d = new C2d();


function enable3d(e) {
    if (e === enabled3d)
        return; // nothing changed
    if (e) {
        enabled3d = true;
        lastAnimTime = 0;
    }
    else {
        // clear to a black screen
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        enabled3d = false;
    }
    
}



function containterResize(event, bforce) {
    var WIDTH_MULT = 20; // changing the width in multiples of this
    
    drawDiv = document.getElementById("canvas-container");
    // writeDebug("RESIZE " + drawDiv.offsetWidth + "," + drawDiv.offsetHeight + "|" + window.innerWidth + "," + window.innerHeight);
    var wbyHeight = Math.round(window.innerHeight *0.94 / 0.7 / WIDTH_MULT) * WIDTH_MULT;
    var wbyWidth = Math.round(window.innerWidth *0.94 / WIDTH_MULT) * WIDTH_MULT;
    var newWidth = Math.min(wbyHeight, wbyWidth);
    
    if (newWidth === canvas.width && !bforce)
        return;
    if (newWidth < 600) // don't allow it to be too small
        newWidth = 600;

    gl.viewportWidth = canvas.width = canvas2d.width = newWidth;
    var vpw = newWidth * 0.7;
    drawDiv.style.height = vpw + "px";
    drawDiv.style.width = newWidth + "px";
    gl.viewportHeight = canvas.height = canvas2d.height = vpw;
    
    c2d.resizeAdjust(canvas2d.width, canvas2d.height);
    
    writeDebug("canvas resized: " + canvas.width + " x " + canvas.height);
}

var noiseTex = null;

function handleTextureLoaded(image, texture) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

//    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_BASE_LEVEL, 0);
//    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_LEVEL, 0);
    
   // gl.bindTexture(gl.TEXTURE_2D, null);
}

function loadTexture() {
    noiseTex = gl.createTexture();
    img = new Image();
    img.onload = function() { handleTextureLoaded(img, noiseTex); }
    img.src = "img/tex2d.jpg"; 
}


function hack() {
    game.userLivesCount=10
}

function webGLStart() {
    document.getElementById('shadersFrame').src = "shaders.html"

    canvas = document.getElementById("game-canvas");

    if (!initGL(canvas))
        return;
    
    canvas2d = document.getElementById("ctrl-canvas");
    ctx2d = canvas2d.getContext('2d');
    if (ctx2d == null) {
        alert("failed creating 2d context")
        return
    }
    
    containterResize(null, true);
    c2d.showStartScreen(ctx2d); // sets up the screen and returns immediately



    shaderProg.init(shadersFrame.contentDocument.getElementById('phongFs'), shadersFrame.contentDocument.getElementById('phongVs'));
    shaderProg.initNormParams();
    bkgProg.init(shadersFrame.contentDocument.getElementById('bkgTDtexFs'), shadersFrame.contentDocument.getElementById('bkgVs'));
    bkgProg.initBkgParams();
    Program.use(shaderProg);
    
    window.onresize = containterResize;
    
    loadTexture();
    
   // startWorker(); //worker thread
 
    // load the first 3 levels and process them async right at the start
   // loadLevelWorld(0, true, true);
   // loadLevelWorld(1, true, true);
    //loadLevelWorld(2, true, true);
   // fpsui.innerHTML = "FPS: 0";

    loadModel("models/bikePlayer2.json", "inlined", "bike", loadedResource); 
    loadModel("models/lifeWheel.json", "indexed", "life", loadedResource);
    
    resources.explode = { ring:{} };
    makeExplosionGeom(resources.explode);
    resources.background = {};
    makeBackground(resources.background);

    initSounds();
    
//    for(var i = 0; i < 100; ++i)
//    loadLevelWorld(1);

    WebGLUtils.requestAnimationFrame(canvas, tick); // start the ticks
    
    setInterval(deployBonus, 1000);
}



