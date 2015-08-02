
var userInput = {
    mouseDown: false,
    lastMouseX: null,
    lastMouseY: null,
    rotationMatrix: mat4.nidentity(),
    
    // a queue of objects. each object can have 'dir' or 'reldir' (relative direction) and 'skippedCount' - the number of iterations it was skipped
    currentlyPressedDirs: [],
    
    touchX: null,
    touchY: null,
    
    HANDLERS_MENU: 1, HANDLERS_3D: 2,
    handlersSet: 0  // which set of event handlers is connected at the moment
}


function handleMouseDown(event) {
    userInput.mouseDown = true;
    userInput.lastMouseX = event.clientX;
    userInput.lastMouseY = event.clientY;
}


function handleMouseUp(event) {
    userInput.mouseDown = false;
}


function handleMouseMove(event) {
    if (!userInput.mouseDown) {
        return;
    }
    var newX = event.clientX;
    var newY = event.clientY;

    if (!gameConf.debug)
        return;
    
    var deltaX = newX - userInput.lastMouseX
    var deltaY = newY - userInput.lastMouseY;
    var newRot = mat4.nidentity(); //createRotationMatrix(deltaX / 2, [0, 1, 0]);
    mat4.rotateY(newRot, radFromDeg(deltaX / 2));
    mat4.rotateX(newRot, radFromDeg(deltaY / 2)); // =  // newRotationMatrix.x(createRotationMatrix(deltaY / 2, [1, 0, 0]));

//    userInput.rotationMatrix = newRotationMatrix.x(userInput.rotationMatrix);
    
    mat4.multiply(newRot, userInput.rotationMatrix, userInput.rotationMatrix);

    userInput.lastMouseX = newX
    userInput.lastMouseY = newY;

}

function resetUserRotation() {
    mat4.identity(userInput.rotationMatrix);
}



// https://developer.mozilla.org/En/DOM/Event/UIEvent/KeyEvent
// from http://stackoverflow.com/questions/1465374/javascript-event-keycode-constants
if (typeof KeyEvent == "undefined") {
    var KeyEvent = {
        DOM_VK_RETURN: 13,
        DOM_VK_ENTER: 14,
        DOM_VK_PAUSE: 19,
        DOM_VK_ESCAPE: 27,
        DOM_VK_SPACE: 32,
        DOM_VK_LEFT: 37,
        DOM_VK_UP: 38,
        DOM_VK_RIGHT: 39,
        DOM_VK_DOWN: 40,
        
        DOM_VK_0: 	48,
        DOM_VK_1: 	49,
        DOM_VK_2: 	50,
        DOM_VK_3: 	51,
        DOM_VK_4: 	52,
        DOM_VK_5: 	53,
        DOM_VK_6: 	54,
        DOM_VK_7: 	55,
        DOM_VK_8: 	56,
        DOM_VK_9: 	57,
        
        DOM_VK_A:	65,
        DOM_VK_B: 	66,
        DOM_VK_C: 	67,
        DOM_VK_D: 	68,
        DOM_VK_E: 	69,
        DOM_VK_F: 	70,
        DOM_VK_G: 	71,
        DOM_VK_H: 	72,
        DOM_VK_I: 	73,
        DOM_VK_J: 	74,
        DOM_VK_K: 	75,
        DOM_VK_L: 	76,
        DOM_VK_M: 	77,
        DOM_VK_N: 	78,
        DOM_VK_O: 	79,
        DOM_VK_P: 	80,
        DOM_VK_Q: 	81,
        DOM_VK_R: 	82,
        DOM_VK_S: 	83,
        DOM_VK_T: 	84,
        DOM_VK_U: 	85,
        DOM_VK_V: 	86,
        DOM_VK_W:	87,
        DOM_VK_X: 	88,
        DOM_VK_Y: 	89,
        DOM_VK_Z:	90,

        DOM_VK_F1: 	112,
        DOM_VK_F2: 	113,
        DOM_VK_F3: 	114,
        DOM_VK_F4: 	115,
        DOM_VK_F5: 	116,
        DOM_VK_F6: 	117,
        DOM_VK_F7: 	118,
        DOM_VK_F8: 	119,
        DOM_VK_F9: 	120,
        DOM_VK_F10: 	121,
        DOM_VK_F11: 	122,
        DOM_VK_F12: 	123
    };
}
KeyEvent._DOM_VK_OPEN_SQUARE = 219;   // open square brackets for relative directions
KeyEvent._DOM_VK_CLOSE_SQUARE = 221;


var keysFuncs = {}
keysFuncs[KeyEvent.DOM_VK_LEFT] =  Directions.Left;
keysFuncs[KeyEvent.DOM_VK_RIGHT] = Directions.Right;
keysFuncs[KeyEvent.DOM_VK_UP] =    Directions.Up;
keysFuncs[KeyEvent.DOM_VK_DOWN] =  Directions.Down;
keysFuncs[KeyEvent.DOM_VK_W] =  Directions.Up;
keysFuncs[KeyEvent.DOM_VK_A] =  Directions.Left;
keysFuncs[KeyEvent.DOM_VK_S] =  Directions.Down;
keysFuncs[KeyEvent.DOM_VK_D] =  Directions.Right;



function handleKeyDown(event) {
    var ret = true;
    // directions control
    if (keysFuncs[event.keyCode] !== undefined)
    {
        // skippedCount is the number of samples the key was not consumed in
        userInput.currentlyPressedDirs.push( { dir:keysFuncs[event.keyCode], skippedCount:0 } );
        ret = false;
    }
    else if (event.keyCode === KeyEvent._DOM_VK_OPEN_SQUARE) { // left
        userInput.currentlyPressedDirs.push( { reldir:Directions.Left, skippedCount:0 } );
        ret = false;
    }
    else if (event.keyCode === KeyEvent._DOM_VK_CLOSE_SQUARE) { // right
        userInput.currentlyPressedDirs.push( { reldir:Directions.Right, skippedCount:0 } );
        ret = false;
    }
    
    // other keys or "any key"
    if (event.keyCode === KeyEvent.DOM_VK_P || event.keyCode === KeyEvent.DOM_VK_PAUSE) {
        game.setPaused(!game.isPaused());
        ret = false;
    }
    else if (event.keyCode === KeyEvent.DOM_VK_M) {
        game.enableSound(!game.soundEnabled);
        ret = false;
    }
    else if (event.keyCode === KeyEvent.DOM_VK_ESCAPE) {
        game.setPaused(true);
        c2d.verbosePauseScreen();
        ret = false;
    }

    else if (!gameConf.debug && game.isPaused()) { // if in operational mode, any other key takes us out of manual mode
        game.setPaused(false);
        ret = false;
    }
    
    // consume space, not to scroll down
    if (event.keyCode === KeyEvent.DOM_VK_SPACE)
        ret = false;

    
    if (gameConf.debug) {
        
        if (event.keyCode === KeyEvent.DOM_VK_E) {
            startExplosion(userPlayer, 1);
        }
        else if (event.keyCode === KeyEvent.DOM_VK_U) {
            ++game.userLivesCount;
            world.staticDraw.lives.startOneUp();
        }
        else if (event.keyCode === KeyEvent.DOM_VK_B) {
            addBonus();
        }
        
        
    }
    
    return ret;
}


function handleKeyUp(event) {
   // userInput.currentlyPressedKeys[event.keyCode] = 0;
}



function sampleKeys(player)
{
    for(var k in userInput.currentlyPressedDirs)
    {
        var inRec = userInput.currentlyPressedDirs[k]; // TBD-this is BAD, still takes memory
        if (inRec === undefined)
            continue;
        //writeDebug("SAMP-FOUND " + userInput.currentlyPressedDirs.length)
        
        if (inRec.dir)
            moveDir = viewControl.translateDir(inRec.dir, player);
        else // reldir  Directions.getRelativeDir(player.eDir, dr);
            moveDir = viewControl.translateRelativeDir(Directions.getRelativeDir(player.eDir, inRec.reldir, player));
        writeDebug("SAMP-DIR " + moveDir.name)

        // its need to not be the opposite of where the player is currently heading
        // since the selected direction might not have updated the current direction yet
        if (moveDir !== null && moveDir !== player.eDir.opposite)
        {
            player.selDir = moveDir;
            if (game.isPaused() && gameConf.debug) { // debugging step-by-step
                writeDebug("DO")
                movePlayer(userPlayer);
                userPlayer.curStepFrac = 1;
            }
           
            userInput.currentlyPressedDirs[k] = undefined; // delete inRec
        }
        else {
            ++inRec.skippedCount;
            // if we didn't consume it after 4 samples, discard it.
            // this means that the backwards key was pressed well before the turn key
            if (inRec.skippedCount > 4)
                userInput.currentlyPressedDirs[k] = undefined;
        }
            
        
    }
}

var touchX = null, touchY = null

function handleTouchStart(evt) {
    evt.preventDefault();
   // writeDebug("TOUCH U " + userInput.touchX)
    //writeDebug("TOUCH STARTI " + evt.touches[0].clientX + " " + evt.touches[0].clientY)
    touchX = evt.touches[0].clientX;                                      
    touchY = evt.touches[0].clientY;
  //  writeDebug("TOUCH STARTX " + touchX + " " +  touchY)
    return false
};                                                

function handleTouchMove(evt) {
    evt.preventDefault();
    //writeDebug("TOUCH MOVE")
    if (!touchX || !touchY) {
        return false;
    }

    var xUp = evt.touches[0].clientX;                                    
    var yUp = evt.touches[0].clientY;

    var xDiff = touchX - xUp;
    var yDiff = touchY - yUp;
    var axDiff = Math.abs(xDiff);
    var ayDiff = Math.abs(yDiff);
    
    writeDebug("TOUCH " + xDiff + " " + yDiff)
    
    var d = null
    if (axDiff > ayDiff) {
        if (axDiff > 10) {
            if (xDiff > 0) {
                d = Directions.Left;
            }
            else {
                d = Directions.Right;
            }
        }
    }
    else {
        if (ayDiff > 10) {
            if ( yDiff > 0 ) {
                d = Directions.Up;
            }
            else { 
                d = Directions.Down;
            }
        }
    }
    
    if (d !== null) {
        userInput.currentlyPressedDirs.push( { dir:d, skippedCount:0 } );
        touchX = null;
        touchX = null;
        game.setPaused(false);
    }
    return false
};

function handleTouchEnd(evt) {
    evt.preventDefault();
    //writeDebug("TOUCH END")
    touchX = null;
    touchX = null;
    return false
}


// set up input handlers for 3d game
function setupGameInput(canvas, canvas2d)
{
    canvas.onmousedown = handleMouseDown;
    canvas2d.onmousedown = handleMouseDown;
    document.onmouseup = handleMouseUp;
    document.onmousemove = handleMouseMove;
    
    // disable scrolling in the page using keyboard
    document.onkeydown = handleKeyDown;
    document.onkeyup = handleKeyUp;
    

    document.body.addEventListener("touchstart", handleTouchStart, false);
    document.body.addEventListener("touchmove", handleTouchMove, false);
    document.body.addEventListener("touchend", handleTouchEnd, false);
    document.body.addEventListener("touchcancel", handleTouchEnd, false);

    userInput.handlersSet = userInput.HANDLERS_3D;
}



