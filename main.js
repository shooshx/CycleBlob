if (!writeDebug) {// did not include debug.js
    var writeDebug = function() {}
    var enableDebug = function() {}
    var clearDebug = function() {}
}

function renderFaces(model, defaultColor) {

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
            shaderProg.setColor(model.diffuseColor[0], model.diffuseColor[1], model.diffuseColor[2]);
        else if (defaultColor)
            shaderProg.setColorv(defaultColor);
            
        model.vertexBuffer.bind();
        gl.vertexAttribPointer(shaderProg.vertexPositionAttribute, model.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
        model.vNormalBuffer.bind();
        gl.vertexAttribPointer(shaderProg.vertexNormalAttribute, model.vNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLES, 0, model.vertexBuffer.numItems);
    }
    
}

function renderModel(model, defaultColor) {
    if (model.vertexBuffer) {
        model.vertexBuffer.bind();
        gl.vertexAttribPointer(shaderProg.vertexPositionAttribute, model.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
    }
        // model.vTexCoord.bind();
        // gl.vertexAttribPointer(shaderProg.textureCoordAttribute, model.vTexCoord.itemSize, gl.FLOAT, false, 0, 0);
    
    if (model.vNormalBuffer) {
        model.vNormalBuffer.bind();
        gl.vertexAttribPointer(shaderProg.vertexNormalAttribute, model.vNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);
    }
    
    shaderProg.setMatrixUniforms();

    renderFaces(model);
    if (model.groups) {
        for(var gname in model.groups) {
            renderFaces(model.groups[gname], defaultColor);
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

function drawScene() {
    
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    ++_drawCount;
    //clearDebug();

    pr.perspective(45,  canvas.width / canvas.height, 0.1 + viewControl.addNearClip, 100.0);

    setupLighting();

    mv.loadIdentity();
    
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
            mv.scale(2);

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
        
  //  checkGLErrors("draw"); // huge performance hit apparently.

}


function movePlayer(player)
{
    var lastPoint = player.point;
    var dist = player.selDir.move.call(player);
    
    var collide = world.map[player.point];
    if (collide !== undefined)
    {
        if (collide < 0) { // its a bonus
            var bid = collide + 100;
            if (world.bonuses[bid]) // should always be true...
                world.bonuses[bid].action(player); // also removes the bonus from the map
        }
        else {
            removePlayer(player, collide);
        }
    }
        
    // update map after everything?
    world.map[lastPoint] = player.id + 100; // put wall in the previous point
    if (collide === undefined)
        world.map[player.point] = player.id; // put bike in the current point
        
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
        world.bonuses[bi].advance(elapsed);
    }
    
    
    
    return doDraw;
    //writeDebug(elapsed + " " + iterCount );
}

var dispFps = function() {
    var sum = 0, count = 0;
    return function(elapsed) {
        sum += elapsed;
        ++count;
        if (count > 10) {
            $("#fpsui").text("FPS: " + Math.round(1000/(sum/count)) );
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
    
    if (gameConf.printFps) dispFps(elapsed);

}


// with some luck, deploy a bonus to the world
// activated every 1000 msec
function deployBonus() {
    if (!world.ready || !resources._ready || !enabled3d || game.isPaused())
        return;
    
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


var shaderProg = new Program();

var world = {
    // holds which walls occupy which vertices map vertex index->player id
    // undefined : empty
    // [-100, -1] : bonuses
    // [0, 99] : players
    // [100, 199] : walls of players
    map: [],
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
    var newWidth = Math.round(drawDiv.offsetWidth/WIDTH_MULT)*WIDTH_MULT;
    
    if (newWidth === canvas.width && !bforce)
        return;
    if (newWidth < 600) // don't allow it to be too small
        newWidth = 600;

    gl.viewportWidth = canvas.width = canvas2d.width = newWidth;
    var vpw = newWidth * 0.7;
    drawDiv.style.height = vpw + "px";
    gl.viewportHeight = canvas.height = canvas2d.height = vpw;
    
    c2d.resizeAdjust(canvas2d.width, canvas2d.height);
    
    writeDebug("canvas resized: " + canvas.width + " x " + canvas.height);
}




function webGLStart() {
   
    canvas = document.getElementById("game-canvas");

    if (!initGL(canvas))
        return;
    
    canvas2d = document.getElementById("ctrl-canvas");
    ctx2d = canvas2d.getContext('2d');
    
    containterResize(null, true);
    c2d.showStartScreen(ctx2d); // sets up the screen and returns immediately

    shaderProg.init($('#shadersFrame').contents().find('#phong-fs'), $('#shadersFrame').contents().find('#phong-vs'))
    
    window.onresize = containterResize;
    
   // startWorker(); //worker thread
 
    // load the first 3 levels and process them async right at the start
   // loadLevelWorld(0, true, true);
   // loadLevelWorld(1, true, true);
    //loadLevelWorld(2, true, true);
    $("#fpsui").text("FPS: 0");

    loadModel("models/bikePlayer2.json", "inlined", "bike", loadedResource); 
    loadModel("models/lifeWheel.json", "indexed", "life", loadedResource);
    

    resources.explode = { ring:{} };
    makeExplosionGeom(resources.explode);
    initSounds();
    
//    for(var i = 0; i < 100; ++i)
//    loadLevelWorld(1);

    WebGLUtils.requestAnimationFrame(canvas, tick); // start the ticks
    
    setInterval(deployBonus, 1000);
}


