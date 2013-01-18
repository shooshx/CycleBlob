
var AiLevels = [
    {}, // level 0 - invalid
    { stepsAhead: 2 },  // level 1 (stupid)
    { stepsAhead: 5 },  // level 2
    { stepsAhead: 10 },  // level 3
    { stepsAhead: 15 },  // level 4
    { stepsAhead: 20 }   // level 5 (smart)
]

// created in startLife
function Ai(player, level)
{
    this.player = player; // player object
    var ailevel = AiLevels[level];
    
    this.stepsAhead = ailevel.stepsAhead;
    
    this.look = new VirtualWalk();
  
    this.occFwd = true;
    this.occLeft = true;
    this.occRight = true;
}


Ai.prototype.turnLeft = function() {
    this.player.selDir = this.player.eDir.leftHand; 
}
Ai.prototype.turnRight = function() {
    this.player.selDir = this.player.eDir.rightHand;
}

function isOccupied(point) {
    var w = world.map.getPiece(point);
    return (w !== undefined && w >= 0) // (occupied) can be equal to 0.. for player 0
}



Ai.prototype.turnToAvailableSide = function(nei, fwdBlocked)
{
    this.occRight = isOccupied(nei.toRight); 
    this.occLeft = isOccupied(nei.toLeft);
    
    if (this.occRight && this.occLeft) // no where to turn
        return; // we're screwed, nothing to do but die.
    if (!this.occRight && !this.occLeft)
    { // both are clear, choose one
        if (fwdBlocked && this.checkWallHeading(nei)) // returns true if made a decision
            return;
        if (this.checkFarBlocks()) // returns true if made a decision
            return; 
        if (randomChoise(0.5))
            this.turnLeft();
        else
            this.turnRight();
    }
    else if (this.occRight) { // right is occupied
        this.turnLeft();
    }
    else if (this.occLeft) { // left is occupied
        this.turnRight();
    }   
}

function VirtualWalk(start, last) {
    this.init(start, last);
}

VirtualWalk.prototype.init = function(start, last) {
    this.last = last;
    this.point = start;
    this.count = 0;
    this.ok = true;
    return this;
}

// returns false if crashed
VirtualWalk.prototype.goRelDir = function(reldir) {
    var last = this.point;
    this.point = directionNei(this.point, reldir, this.last)
    this.last = last;
    if (isOccupied(this.point)) {
        this.ok = false;
        return false;
    }
    ++this.count;
    return true;
}

VirtualWalk.prototype.goForward = function() { return this.goRelDir(RelativeDir.forward); }
VirtualWalk.prototype.goRight = function() { return this.goRelDir(RelativeDir.rightHand); }
VirtualWalk.prototype.goLeft = function() { return this.goRelDir(RelativeDir.leftHand); }


function countFree(vw, togo, went) {
    if (togo === 0)
        return went;
    if (vw.goForward())
        return countFree(vw, togo-1, went+1);
    return went;
}

function pieceIsPlayer(piece, playerId) {
    return piece >= 100 && piece < 200 && (piece - 100 == playerId);
}

Ai.prototype.checkWallHeading = function (nei) {
    var thisPlayerId = this.player.id;
    var fwdVal = world.map.get(nei.toFwd);
    var fwdPiece = PieceMap.piece(fwdVal);
    if (!pieceIsPlayer(fwdPiece, thisPlayerId)) {
        return false; // only consider my wall
    }
    var fwdWc = PieceMap.meta(fwdVal); // wall-count

    var p = this.player.point, l = this.player.last.point;
    this.look.init(p, l).goLeft();
    this.look.goRight();
    var leftPnt = this.look.point;
    this.look.init(p, l).goRight();
    this.look.goLeft();
    var rightPnt = this.look.point;

    var leftVal = world.map.get(leftPnt), rightVal = world.map.get(rightPnt);
    var leftPiece = PieceMap.piece(leftVal), rightPiece = PieceMap.piece(rightVal);
    var leftWc = PieceMap.meta(leftVal), rightWc = PieceMap.meta(rightVal);
    writeDebug("wall-h " + leftPiece + ":" + leftWc + " - " + rightPiece + ":" + rightWc);
    if (!pieceIsPlayer(leftPiece, thisPlayerId) || !pieceIsPlayer(rightPiece, thisPlayerId))
        return false;

    if (leftWc < fwdWc)
        this.turnLeft();
    else
        this.turnRight();
    return true;
}


// advance several steps forward, right and left to see if there is something blocking
Ai.prototype.checkFarBlocks = function()
{
    var p = this.player.point, l = this.player.last.point;

    this.look.init(p, l).goLeft();
    var toLeft = countFree(this.look, this.stepsAhead, 1);
    this.look.init(p, l).goRight();
    var toRight = countFree(this.look, this.stepsAhead, 1);
    
    if (toLeft > toRight)
        this.turnLeft();
    else if (toLeft < toRight)
        this.turnRight();
    else
        return false;
    return true;
}


// entry point
// the ai decision ultimately translates to a change to player.selDir
Ai.prototype.moveControl = function(world)
{
    var nei = calcAllDirNei(this.player.point, this.player.last.point);
    
    var occFwd = isOccupied(nei.toFwd);
    if (occFwd) // the point up ahead is occupied
    {
        this.turnToAvailableSide(nei, true);
        return; 
    }
    
    // random turning for no reason (2% chance)
    if (randomChoise(2)) {
        this.turnToAvailableSide(nei, false);
        return;
    }
    
}




