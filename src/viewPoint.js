
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// controls the camera position and orientation


function OutsideView(eyeDist)
{
    this.eye = vec3.create([0,0,1]);
    this.upDir = vec3.create([0,1,0]);
    this.eyeDist = eyeDist; // distance along the normal (4?)
    
    this.toPoint = vec3.create([0,0,0]); // to at this point

    this.twoSided = false
    this.addNearClip = 0;
    this.lightPoint = [-10, 4, 20];
}

OutsideView.prototype.getCamera = function()
{
    return this; 
}

OutsideView.prototype.moveUpdate = function(player)
{
    if (player !== userPlayer)
        return;
    var frac = player.curStepFrac;
    vec3.linearMix(player.normal, player.last.normal, frac, this.eye);
    vec3.scale(this.eye, this.eyeDist);
    vec3.linearMix(player.upDir, player.last.upDir, frac, this.upDir);
}

// translate the direction according to the view.
// in outside view no translation needed
OutsideView.prototype.translateDir = function(dir, player) {
    return dir;
}

OutsideView.prototype.translateRelativeDir = OutsideView.prototype.translateDir


OutsideView.prototype.getLight = function() {
    return this.lightPoint;
}



function InsideView()
{
    this.eye = vec3.create([0,0,0]);
    this.upDir = vec3.create([0,1,0]);
    this.toPoint = vec3.create([0,0,1]);
    
    this.centerDist = 1.5; //slideval1;
    this.addNearClip = Math.max(0, this.centerDist-0.8);        
    
    this.twoSided = true;
    this.bikeFlip = true;
    this.lightPoint = [0, -4, 20];
}

InsideView.prototype.getCamera = function()
{
    return this; 
}

InsideView.prototype.moveUpdate = function(player)
{
    if (player !== userPlayer)
        return;
    var frac = player.curStepFrac;
    vec3.linearMix(player.normal, player.last.normal, frac, this.toPoint);
    vec3.negate(this.toPoint, this.eye);
    
   // this.centerDist = slideval1;
   // this.addNearClip = Math.max(0, this.centerDist-1);        
    
    vec3.scale(this.eye, this.centerDist);
    vec3.linearMix(player.upDir, player.last.upDir, frac, this.upDir);

}

// in inside view, left turns to right and right turns to left.
// another way to do this is to flip the actual projection but... too strange.
InsideView.prototype.translateDir = function(dir, player) {
    if (dir === Directions.Left || dir === Directions.Right)
        return dir.opposite;
    return dir;
}

InsideView.prototype.translateRelativeDir = InsideView.prototype.translateDir;

InsideView.prototype.getLight = function() {
    return this.lightPoint;
}



function FirstPersonView()
{
    this.eye = vec3.create([0,0,0]);
    this.upDir = vec3.create([0,1,0]);
    this.toPoint = vec3.create([0,0,0]);
    
    this.t = vec3.create();
    
    this.twoSided = false
    this.addNearClip = 0;

    this.lightPoint = [-10, 4, 20];

}


FirstPersonView.prototype.getCamera = function()
{
    return this; 
}

FirstPersonView.prototype.moveUpdate = function(player)
{
    if (player !== userPlayer) 
        return;
    
       var frac = player.curStepFrac;

    vec3.linearMix(world.model.vtx[player.point], world.model.vtx[player.last.point], frac, this.eye);

    vec3.linearMix(player.forward, player.last.forward, frac, this.t);
    vec3.scale(this.t, slideval1);
    vec3.add(this.t, this.eye, this.toPoint);    

    vec3.linearMix(player.normal, player.last.normal, frac, this.upDir);
    vec3.scale(this.upDir, 0.1, this.t);
    vec3.add(this.eye, this.t);
}

FirstPersonView.prototype.translateDir = function(dr, player) {
    return Directions.getRelativeDir(player.eDir, dr);
}

FirstPersonView.prototype.translateRelativeDir = function(dr, player) {
    return dr;
}

FirstPersonView.prototype.getLight = function() {
    return this.lightPoint;
}

