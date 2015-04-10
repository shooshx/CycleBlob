
// special effects


function Explode(myPlayer) {
    this.player = myPlayer;
    this.ringsScale = [ -1, -0.5, 0.01 ];
    this.elapsed = 0;    // msec, the time the explosion is going
    
    this.showSpikes = true;
    this.spikesScale = 0.1;
    
}


// an explosion of 1000 msec, rings advance from -1 to RING_MAX_SIZE 
Explode.TOTAL_TIME = 800; // 800 msec (8 frames after the skipes disappear)
Explode.RING_MAX_SIZE = 1.5;
Explode.SPIKES_TIME = 320 // 320 msec (7-8 frames in the movie @ 25 fps)
Explode.SPIKES_MAX_SIZE = 0.8;

// assume we are in the site of the explosion
Explode.prototype.draw = function() {
    
    mv.pushMatrix()
    shaderProg.setUseLight(false);
    
    gl.enable(gl.BLEND);
    mv.translate([0,0,-world.model.scale.WALL_WIDTH*1.2]); // don't put the explosion inside the wall we're hitting
    mv.scale(world.model.scale.GLOBAL_SCALE);

    for(var i = 0; i < this.ringsScale.length; ++i) {
        var s = this.ringsScale[i];
        if (s < 0.1 || s > Explode.RING_MAX_SIZE)
            continue;
        
        //var alpha = 0.2+1.0-(s/2);
        var alpha = (s - Explode.RING_MAX_SIZE)/(0.2 - Explode.RING_MAX_SIZE);
        shaderProg.setColor4(1.0, 0.6, 0.1, alpha); // orange
        
        mv.pushMatrix()
        mv.scale(s, s, s);
        
        // if it's the user, show circles on the ground (because he looks from above
        // otherwise circles are prependicular to the collision
        if (this.player === userPlayer)
            mv.rotate(90, [1, 0, 0]);
        renderModel(resources.explode.ring);
        
        mv.popMatrix();
    }
    
    if (this.showSpikes) {

        mv.scale(this.spikesScale, this.spikesScale, this.spikesScale);
               
        shaderProg.setColor(1,0.6+this.spikesScale,this.spikesScale);
        
        if (this.player === userPlayer)
            mv.rotate(90, [1, 0, 0]);
        renderModel(resources.explode.spikes);
    }
    
    gl.disable(gl.BLEND);
    shaderProg.setUseLight(true);
    mv.popMatrix();

}


Explode.prototype.advance = function(elapsedMsec) {
    for(var i = 0; i < this.ringsScale.length; ++i) {
        this.ringsScale[i] += elapsedMsec * ((Explode.RING_MAX_SIZE+1) / Explode.TOTAL_TIME);
    }
    this.spikesScale += elapsedMsec * (Explode.SPIKES_MAX_SIZE / Explode.SPIKES_TIME);
    
    
    this.elapsed += elapsedMsec;

    if (this.elapsed > Explode.SPIKES_TIME) { // remove spikes
        this.showSpikes = false;
    }
    if (this.elapsed > Explode.TOTAL_TIME) { // explosion is done
        this.player.sfx.explode = null; // effectively delete this
        if (levelCompleted.handler !== null && levelCompleted.called === false) {
            levelCompleted.handler();
        }
    }
}

function startExplosion(player, collideId)
{
    // if we collide with a bike (and not a wall) and the bike is the user
    // then show a user exlosion rather than a wall explosion
    if (collideId < 100 && collideId == userPlayer.id)
        player = userPlayer;
    player.sfx.explode = new Explode(player);
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

WallDecent.START_DELAY = 500; // time after the explosion the effect begins. 1500
WallDecent.HEIGHT_DELAY = 250; // time from start of effect till start of height reduction
WallDecent.DECENT_TIME = 900; // time the hight reduction takes. 680 msec (17 frames @ 25 fps)
WallDecent.BRIGHT_TIME = 340; // time the brightness increase takes
WallDecent.DARKEN_TIME = 200;

function WallDecent(myPlayer)
{
    this.player = myPlayer;
    this.brightness = 0;  // [0-1]
    this.height = 1; // start from full height [0-1]
    this.elapsed = 0; // total time since start of effect
}

WallDecent.prototype.advance = function(elapsedMsec)
{
    this.elapsed += elapsedMsec;
    
    if (this.elapsed <= WallDecent.BRIGHT_TIME) {
        this.brightness = (this.elapsed * (1 / WallDecent.BRIGHT_TIME));
    }
    else { // after brightness increase, return to normal brightness
        this.brightness = Math.max(0, 1 - ((this.elapsed - WallDecent.BRIGHT_TIME) * (1 / WallDecent.DARKEN_TIME)));
    }
    
    if (this.elapsed >= WallDecent.HEIGHT_DELAY) {
        this.height = 1 - ((this.elapsed - WallDecent.BRIGHT_TIME) * (1 / WallDecent.DECENT_TIME));
        this.height = Math.min(1, Math.max(0, this.height));
    }
    
    if (this.height <= 0) {
        this.player.sfx.wall_decent = null; // effectively delete this
        var pwall = this.player.wall;
        pwall.standing = false; // stop drawing it
        // update map, last point in the record is the crash, don't delete it because it's another wall
        for(var i = 0; i < pwall.pntRecord.length - 1; ++i) {
            world.map.unset(pwall.pntRecord[i]);
        }
        
        return;
    }

    this.player.wall.setWallHeight(this.height);
}


function startWallDecent(player)
{
    player.sfx.wall_decent = new WallDecent(player);    
}

function queueWallDecent(player)
{
    window.setTimeout(function() { startWallDecent(player); }, Explode.TOTAL_TIME + WallDecent.START_DELAY); 
}



/////////////////////////////////////// bonuses /////////////////////////////////////////////////////////////////

function addBonus() {
    // don't allow more than 5 bonuses at a time and more than 99 in total in a life... just bare safeties.
    if (Object.keys(world.bonuses).length >= 5 || world.bonuses.length > 99)
        return;
    
    var b = new LifeBonus(world.bonuses.length);
    if (b.point === null)
        return; // could not find a place...
    world.bonuses.push(b);
    
}

function LifeBonus(index) {
    var nei = randomFreePoint();
    this.point = nei[0];
    if (this.point === null)
        return;

    this.index = index;
    this.occupy = nei;    
    for(var ni in this.occupy)
        world.map.set(this.occupy[ni], 1000 + index, 0)
    
    this.normal = world.model.normals[this.point];
    this.forward = vec3.normalize(vec3.nsubtract(world.model.vtx[this.point], world.model.vtx[nei[1]])); // an estimate, nor really perpendicular
    this.rightHand = vec3.ncross(this.forward, this.normal);
    this.forward = vec3.ncross(this.normal, this.rightHand); // exact perpendicular
    
    this.anglex = 0;
    this.angley = 0;
    this.elapsed = 0;
    this.inflate = 0; // range [0, 1]
    this.active = true;
    this.removeElapsed = -1; // remove animation
    this.alpha = null;
    c2d.addMessage("Life bonus appeared");   
}

LifeBonus.prototype.startRemove = function() {
    this.removeElapsed = 0;
    this.alpha = 1.0;
}

LifeBonus.prototype.getColor = function(angle) {
    return hslToRgb(angle/360, 1, 0.5);
}


LifeBonus.prototype.draw = function() {
    mv.pushMatrix();
    
    mv.translate(world.model.vtx[this.point]);
    var m = mFromVectors(this.rightHand, this.normal, this.forward);
    mv.multMatrix(m);
    
    var s = world.model.scale.BONUS_LIFE;
    if (viewControl.bikeFlip)
        s = -s; // appear on the inside
    
    mv.translate([0, s*2.3, 0]);    
    mv.scale(s * this.inflate);
    mv.rotateY(this.anglex);
    mv.rotateX(this.angley);
    color = this.getColor(this.anglex)
    if (this.alpha == null) {
        shaderProg.setColorv(color);
    }
    else {
        gl.enable(gl.BLEND);
        shaderProg.setColor4(color[0], color[1], color[2], this.alpha);
    }
    
    renderModel(resources.life);
    
    if (this.alpha != null) {
        gl.disable(gl.BLEND);
    }
    
    mv.popMatrix();
}

LifeBonus.INFLATE_TIME = 500; // time it takes for the bonus to grow from tiny to full size
LifeBonus.REMOVE_TIME = 500; // time it takes for the bonus to be removed after it is taken

LifeBonus.prototype.advance = function(elapsed) {
    LifesRenderable.prototype.rotate.call(this, elapsed);
    
    if (this.elapsed < LifeBonus.INFLATE_TIME) {
        this.elapsed = Math.min(this.elapsed + elapsed, LifeBonus.INFLATE_TIME);
        this.inflate = this.elapsed * (1/LifeBonus.INFLATE_TIME);
    }
    else if (this.removeElapsed != -1) {
        this.removeElapsed = Math.min(this.removeElapsed + elapsed, LifeBonus.REMOVE_TIME);
        var et = this.removeElapsed * (1/LifeBonus.REMOVE_TIME)
        this.inflate = 1 + 3 * et;
        this.alpha = 1 - et;
        if (et >= 1) {
            return false; // remove the bonus item. 
        }
    }
    else
        this.inflate = 1;
    return true;
}

// called when player takes this bonus
LifeBonus.prototype.action = function(player) {
    if (player === userPlayer) {
        ++game.userLivesCount;
        world.staticDraw.lives.startOneUp();
    }
    
    for(var ni in this.occupy)
        world.map.unset(this.occupy[ni]);
    //delete world.bonuses[this.index];
    world.bonuses[this.index].startRemove()
    
    playBonusSound(player);
    c2d.addMessage(player.prettyName() + " found a life bonus");
}

