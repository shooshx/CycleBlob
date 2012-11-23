
var $MR = Math.round;

function Box(x, y, width, height) {
    this.x = $MR(x); this.y = $MR(y); this.height = $MR(height); this.width = $MR(width);
}
Box.prototype.inside = function(coord) {
    return (coord.x >= this.x && coord.y >= this.y && coord.x <= this.x+this.width && coord.y <= this.y+this.height);
}
Box.prototype.expand = function(px) {
    this.x -= px;
    this.y -= px;
    this.height += 2*px;
    this.width += 2*px;
    return this;
}
// returns a new copy
Box.prototype.expanded = function(px) {
    return new Box(this.x - px, this.y - px, this.width + 2*px, this.height + 2*px);
}
Box.prototype.down = function(px) {
    this.y += px;
    return this;
}
Box.prototype.xmid = function() {
    return this.x + $MR(this.width/2);
}
Box.prototype.widen = function(px) {
    this.x -= $MR(px);
    this.width += $MR(2*px);
    return this;
}


function callWidget(e, w, ename) {
    var c = c2d.getCanvasCoord(e);
    w.base.callback.call(w, (w.box?{ x:c.x-w.box.x, y:c.y-w.box.y, name:ename}:undefined) );
}

function menuMouseMove(e) {

    if (c2d.curPage.mouseCaptureWidget) {
        callWidget(e, c2d.curPage.mouseCaptureWidget, Widget.EVENT_MOVE);
        return;
    }
    var w = c2d.getWidget(e)
    if (w !== null && w.base.index !== c2d.curPage.sel) {
        
        //var snd = $("#turnSound")[0];
        //snd.currentTime = 0;
        //snd.play();
        
        c2d.curPage.sel = w.base.index;
        c2d.drawWidgets();
    }
}

function menuMouseDown(e) {
  //  var coord = getCanvasCoord(e);
  //  writeDebug(coord.x + " " + coord.y);
    var w = c2d.getWidget(e)
    if (w !== null) {
        callWidget(e, w, Widget.EVENT_PRESS);
    }
    else if (c2d.curPage.mouseHandler !== null)
        c2d.curPage.mouseHandler();
}

function menuMouseUp(e) {
    if (c2d.curPage.mouseCaptureWidget) {
        callWidget(e, c2d.curPage.mouseCaptureWidget, Widget.EVENT_RELEASE);
        c2d.curPage.mouseCaptureWidget = null;
    }
}


function menuKeyDown(e) {
    var ret;
    if (c2d.curPage.widgets.length > 0) {
        ret = false;
        if (e.keyCode === KeyEvent.DOM_VK_DOWN || e.keyCode === KeyEvent.DOM_VK_RIGHT)
            c2d.curPage.sel = (c2d.curPage.sel + 1) % c2d.curPage.widgets.length;
        else if (e.keyCode === KeyEvent.DOM_VK_UP || e.keyCode === KeyEvent.DOM_VK_LEFT)
            c2d.curPage.sel = (c2d.curPage.sel - 1 + c2d.curPage.widgets.length) % c2d.curPage.widgets.length;
        else if (e.keyCode === KeyEvent.DOM_VK_RETURN ||
                 e.keyCode === KeyEvent.DOM_VK_ENTER ||
                 e.keyCode === KeyEvent.DOM_VK_SPACE)
        {
            var w = c2d.curPage.widgets[c2d.curPage.sel];
            w.base.callback.call(w); // engage a button
        }
        else
            ret = true; // not processes
        
        if (ret === false) {        
            c2d.drawWidgets();
            return ret;
        }
    }
    if (c2d.curPage.keyHandler !== null) {
        // keyHandler return value has the same sematrics as this handler.
        // it returns false if the key is consumed
        return c2d.curPage.keyHandler(e.keyCode);
    }
    
    return true;
}

function menuKeyUp(e) {}


//////////////////////////////////////////////// screens and widgets /////////////////////////

// control 2d constructore
function C2d() {
    this.curPage = null;
    this.msgQueue = [];
    this.curMenuDraw = null;
    this.curMenuRemake = null;
    this.texth = 42; // changes with resize
    
    this.has3dContent = false;
    this.render3d = [];  // 3d renderables
    this.mainMenu = null; // points to the function which draw the menu from which we came. either the start menu or the custom level menu

    window.setInterval(function() { c2d.checkMessageQueue(); }, 200);
}

C2d.prototype.setup2dInputs = function()
{
        // disable scrolling in the page using keyboard
    document.onkeydown = menuKeyDown; 
    document.onkeyup = menuKeyUp;
    
    canvas2d.onmousedown = menuMouseDown; 
    canvas.onmousedown = menuMouseDown; 
    document.onmouseup = menuMouseUp;
    document.onmousemove = menuMouseMove;
    
    userInput.handlersSet = userInput.HANDLERS_MENU;
}


C2d.prototype.getCanvasCoord = function(e) {
    return { x:e.layerX, y:e.layerY }; // ignoring any borders and padding  
}


C2d.prototype.getWidget = function(e) {
    var coord = this.getCanvasCoord(e);
    for(var i = 0; i < this.curPage.widgets.length; ++i) {
        var widget = this.curPage.widgets[i];
        if (widget.box.inside(coord))
            return widget;
    }
    return null;
}


C2d.prototype.roundedBoxPath = function(x, y, w, h, r) {
    ctx2d.beginPath();
    ctx2d.moveTo(x+r, y);
    ctx2d.arcTo(x+w, y, x+w, y+r, r);
    ctx2d.arcTo(x+w, y+h, x+w-r, y+h, r);
    ctx2d.arcTo(x, y+h, x, y+h-r, r);
    ctx2d.arcTo(x, y, x+r, y, r)
}

C2d.prototype.backgroundRect = function(box) {
    // clear it anyway becuase the color has alpha
    // erase a bit more not to leave traces behind
    ctx2d.clearRect(box.x, box.y, box.width, box.height); 
    if (this.widgetsBackground !== undefined) {
        ctx2d.fillStyle = this.widgetsBackground;
        ctx2d.fillRect(box.x, box.y, box.width, box.height);
    }
}


C2d.prototype.drawSelect = function(box, isSelected) {
    if (isSelected) {
        var size = Math.max(box.width, box.height); // want 45 degrees
        var grad = ctx2d.createLinearGradient(box.x, box.y, box.x+size/2, box.y+size/2);
        grad.addColorStop(0, 'rgba(136,255,19,1.0)');
        grad.addColorStop(1, 'rgba(255,255,0,1.0)');
        ctx2d.fillStyle = grad;
        
        c2d.roundedBoxPath(box.x, box.y, box.width, box.height, 10);
        
        ctx2d.fillStyle = "black";
        ctx2d.fill(); // workround for chrome 9 transparency bug
        ctx2d.fillStyle = grad;
        ctx2d.fill();
    
    }
    else {
        this.backgroundRect(box);
    }
}


function Widget(callback, index) {
    this.callback = callback;
    this.index = index;
}

Widget.EVENT_PRESS = 100;
Widget.EVENT_MOVE = 101;
Widget.EVENT_RELEASE = 102;

/////////////////////////////////////// TextButton ///////////////////////////////////////////////

function TextButton(text, box, w, groupItem) {
    this.base = w; // base widget
    this.text = text;
    this.tx = box.x;
    this.ty = box.y + box.height;
    
    this.box = box.expanded($MR(c2d.em/4)).down($MR(c2d.em/7));
    
    this.group = groupItem;
    if (this.group) 
        this.group.setBox(box.expanded($MR(c2d.em/8)).down($MR(c2d.em/7)));
}

var MMENU_FILL = "#ff8464";
var MMENU_STROKE = "#c90034";

TextButton.prototype.draw = function(isSelected) {
    c2d.drawSelect(this.box, isSelected);
    if (this.group) 
        this.group.testndraw();
    ctx2d.fillStyle = MMENU_FILL; // orange "#ff3c00"
    var tx = (ctx2d.textAlign == "center")?(this.box.x + $MR(0.5*this.box.width)):this.tx;

    ctx2d.fillText(this.text, tx, this.ty);
    ctx2d.lineWidth = 2;
    ctx2d.strokeStyle = MMENU_STROKE;  //"#500000"
    ctx2d.strokeText(this.text, tx, this.ty);
    
}

/////////////////////////////////// ImgToggleButton - check box with two images /////////////////

function ImgToggleButton(imgOn, imgOff, text, initState, box, w) {
    this.base = w;
    this.imgOn = imgOn;
    this.imgOff = imgOff;
    this.text = text;
    this.boxImg = box;
    this.box = box.expanded($MR(c2d.em/4));
    this.isOn = initState;
    this.toggleCallback = this.base.callback;
    this.base.callback = function() {
        this.isOn = !this.isOn;
        this.toggleCallback(this.isOn);
        this.draw(true);
    }
}

ImgToggleButton.prototype.draw = function(isSelected) {
    c2d.drawSelect(this.box, isSelected);
    
    var img = (this.isOn)?this.imgOn:this.imgOff;
    ctx2d.drawImage(img, this.boxImg.x, this.boxImg.y, this.boxImg.width, this.boxImg.height);
}

///////////////////////////////////// ImgButton - button with a single image ////////////////////

function ImgButton(img, text, box, w, groupItem) {
    this.base = w;
    this.img = img;
    this.text = text;
    this.boxImg = box;
    this.box = box.expanded($MR(c2d.em/4));
    
    this.group = groupItem;
    if (this.group) 
        this.group.setBox(box.expanded($MR(c2d.em/8)));
}

ImgButton.prototype.draw = function(isSelected) {
    c2d.drawSelect(this.box, isSelected);
    if (this.group) 
        this.group.testndraw();
    if (this.img === null)
        return;
    ctx2d.drawImage(this.img, this.boxImg.x, this.boxImg.y, this.boxImg.width, this.boxImg.height);
}

//////////////////////////////////// Slider /////////////////////////////////////////////////

function Slider(vmin, vmax, step, value, box, w) {
    this.base = w; w.box = box;
    this.vmin = vmin; this.vmax = vmax; this.step = step;
    this.value = value;
    this.box = box;
    this.valueChanged = w.callback;
    this.base.callback = this.onevent;
    this.clearBox = box.expanded(2).widen(c2d.en*0.5);
    this.valueChanged(this.value);
}

Slider.prototype.draw = function(isSelected) {
    c2d.backgroundRect(this.clearBox);
        
    var wf = $MR(this.box.height*0.22);
    c2d.roundedBoxPath(this.box.x, this.box.y+$MR((this.box.height-wf)*0.5), this.box.width, wf, $MR(wf*0.5));
    ctx2d.fillStyle = MMENU_FILL;
    ctx2d.fill();
    ctx2d.strokeStyle = MMENU_STROKE;
    ctx2d.lineWidth = 2;
    ctx2d.stroke();
    
    // x center of the selector
    var selx = this.box.x + this.box.width / (this.vmax - this.vmin) * (this.value - this.vmin);
    var selhw = $MR(c2d.en*0.35);
    c2d.roundedBoxPath(selx-selhw, this.box.y, 2*selhw, this.box.height, $MR(selhw*0.4));
    ctx2d.fill();
    ctx2d.stroke();
    
}


Slider.prototype.onevent = function(e) {
    var newvalue = this.vmin + e.x/this.box.width*(this.vmax - this.vmin)
    newvalue = Math.min(this.vmax, Math.max(this.vmin, newvalue)); // clamp to min-max
    newvalue = $MR(newvalue/this.step)*this.step; // clamp to steps
    if (newvalue !== this.value) {
        this.value = newvalue;
        this.draw(true);
        this.valueChanged(newvalue);
    }
    
    if (e.name === Widget.EVENT_PRESS)
        c2d.curPage.mouseCaptureWidget = this;
}


//////////////////////////////////////////////////////////////////////////////////////////////////

C2d.prototype.blankScr = function(background) {
    if (!background)
        ctx2d.clearRect(0, 0, ctx2d.canvas.width, ctx2d.canvas.height);
    else {
        ctx2d.fillStyle = background;
        ctx2d.fillRect(0, 0, ctx2d.canvas.width, ctx2d.canvas.height);
    }
}

function GroupCommon(selected) {
    this.sel = selected;
}

// common: an instance of GroupCommon
function GroupItem(common, id) {
    this.id = id;
    this.com = common; 
}

GroupItem.prototype.setBox = function(box) {
    this.box = box
}

GroupItem.prototype.testndraw = function() {
    if (this.com.sel === this.id) { // it is selected
        c2d.roundedBoxPath(this.box.x, this.box.y, this.box.width, this.box.height, 10);
        ctx2d.lineWidth = 2;
        ctx2d.fillStyle = "rgba(0,0,255,0.2)";  
        ctx2d.fill();
        ctx2d.strokeStyle = "#0000FF";
        ctx2d.stroke();
    }
}



C2d.prototype.clearScr = function() {
    this.curPage = {};
    this.curPage.widgets = [];
    this.curPage.sel = 0; // selected widget
    this.curPage.background = undefined;
    this.curPage.keyHandler = null;   // keyboard actions specific to a page
    this.curPage.mouseHandler = null; // mouse actions specific to a page, for clicks outside the widgets
    this.curPage.selTextBox = null; // a box where the text of the current selection can appearl,
    this.curPage.mouseCaptureWidget = null; // if one widget captures the mouse, it gets exclusive messages from it
    
    this.blankScr();
    this.curMenuDraw = null;
    this.curMenuRemake = null; // the function to recreate the menu (after a resize);
}


C2d.prototype.setSelectionTextBox = function(box) {
    var th = box.height;
    this.curPage.selTextBox = box.expanded($MR(box.height/4)); // need to be bigger than the text due to the bottom of the 'g'
    this.curPage.selTextBox.th = th;
}

////////////////////////////// widgets creation shortcuts /////////////////////////////////////////////////////////

C2d.prototype.makeTextButton = function(text, x, y, height, width, callback, groupId) {
    var m = ctx2d.measureText(text);
    var r;
    this.curPage.widgets.push(
        r = new TextButton(text,
            new Box(x, y, width, height),
            new Widget(callback, this.curPage.widgets.length),
            groupId            
        )
    );
    return r;
}

C2d.prototype.makeImgToggleButton = function(imgOn, imgOff, text, initState, x, y, height, width, callback) {
    var r;
    this.curPage.widgets.push(
        r = new ImgToggleButton(imgOn, imgOff, text, initState,
            new Box(x, y, width, height),
            new Widget(callback, this.curPage.widgets.length)
        )
    );
    return r;
    
}

// groupId is an object with sel: index of currently selected item, id: this widget's id
C2d.prototype.makeImgButton = function(img, text, x, y, height, width, callback, groupId) {
    var r;
    this.curPage.widgets.push(
        r = new ImgButton(img, text, new Box(x, y, width, height),
                      new Widget(callback, this.curPage.widgets.length),
                      groupId)
        );
    return r;
}

C2d.prototype.makeSlider = function(vmin, vmax, step, value, x, y, width, height, callback) {
    var r;
    return this.curPage.widgets.push(
        r = new Slider(vmin, vmax, step, value, new Box(x, y, width, height),
                   new Widget(callback, this.curPage.widgets.length)));
    return r;
}



C2d.prototype.drawWidgets = function() {
    if (this.curPage.widgets.length === 0)
        return;
    
    for(var i = 0; i < this.curPage.widgets.length; ++i) {
        var w = this.curPage.widgets[i];
        w.draw(i === this.curPage.sel);
    }
    
    var text = this.curPage.widgets[this.curPage.sel].text;
    if (this.curPage.selTextBox && text) {
        this.backgroundRect(this.curPage.selTextBox);
        
        ctx2d.fillStyle = "#ff3c00";
        ctx2d.textAlign = "center"
        // $MR(this.texth / 2)
        this.setMenuFont(this.curPage.selTextBox.th);
        ctx2d.fillText(text, this.curPage.selTextBox.xmid(), this.curPage.selTextBox.y + this.curPage.selTextBox.th);
        ctx2d.textAlign = "start"
    }
}

//const MENU_TEXTH = 42;
//var INMENU_BACKGROUND = "rgba(0, 0, 128, 0.7)";
//var INMENU_STROKE = "rgba(0, 0, 255, 0.7)"

var INMENU_BACKGROUND = "rgba(0, 0, 0, 0.8)";
var INMENU_STROKE = "rgba(128, 128, 128, 0.7)"


// background - the color of unselected menu items
C2d.prototype.preMenu = function(background) {
    this.setup2dInputs();
    this.clearScr();
    this.widgetsBackground = background;
    
    var caller = arguments.callee.caller;
    var args = caller.arguments;
    this.curMenuRemake = function() { caller.apply(this, args) };
}

C2d.prototype.setMenuFont = function(th) {
    if (!th) th = this.texth;
    ctx2d.font = "bold " + $MR(th) + "px sans-serif"
}


C2d.prototype.resizeAdjust = function(w, h) {
    this.texth = $MR(42*(w/900));
    this.setMenuFont();
    this.em = ctx2d.measureText("m").width;
    this.en = ctx2d.measureText("n").width;
    writeDebug("text height: " + this.texth + " em: " + this.em + " " + this.en);
    
    this.drawGameState(true); // don't draw the menus again
    if (this.curMenuRemake)
        this.curMenuRemake();
}


//************************************************ actual screens **********************************************************


C2d.prototype.showStartScreen = function()
{
    ensureLevelLoaded(0, gameConf.preloadFirst, null);
    
    enable3d(false);
    this.preMenu("black");
    var cw = ctx2d.canvas.width, ch = ctx2d.canvas.height;
    var cx = $MR(cw / 2), cy = $MR(ch / 2), th = this.texth, em = this.em;
   
    this.setMenuFont();
    
    var textWidth = 8*em;

    var newGameBot = this.makeTextButton("New game", 20, ch - 6*th, th, textWidth, function() {
        writeDebug("NewNew!")
        c2d.clearScr();
        c2d.mainMenu = C2d.prototype.showStartScreen; // and not the custom screen
        waitAsyncProgress(function() { // wait for the levels to load the process
            startGame(); // calls startLife
        }); 
    });
    this.makeTextButton("How to play", 20, ch - 4.3*th, th, textWidth, function() {
        c2d.instructionsScreen()
    });
    this.makeTextButton("Custom level", 20, ch - 2.6*th, th, textWidth, function() {
        c2d.customLevelScreen();
    });
    
    this.makeImgToggleButton($("#soundOnImg")[0], $("#soundOffImg")[0], "Sound", game.soundEnabled, cw-50-2*em, ch-50-2*em,
                             2.5*em, 2.5*em, function(isOn) {
       writeDebug("SetSnd " + isOn);
       game.enableSound(isOn);
    });
    
    this.blankScr("black");

    var img = $("#titleTextImg")[0];
    ctx2d.drawImage(img, 0, 0, cw, $MR(img.height / img.width * (cw)));
    
    this.drawVersionNum();    
    
    // when the debug flag is on, press the F1-F12 keys to jump directly to a level
    if (gameConf.debug) {
        this.curPage.keyHandler = function(keyCode) {
            if (keyCode >= KeyEvent.DOM_VK_F1 && keyCode <= KeyEvent.DOM_VK_F12) {
                var tolvl = keyCode - KeyEvent.DOM_VK_F1;
                ensureLevelLoaded(tolvl, gameConf.preloadFirst, null);
                writeDebug("NewNew! " + tolvl)
                c2d.clearScr();
                c2d.mainMenu = C2d.prototype.showStartScreen;
                waitAsyncProgress(function() { // wait for the levels to load the process
                    startGame(tolvl); // calls startLife
                });
                return false
            }
            return true;
        }
    }
    
    this.curPage.keyHandler = function(keyCode) {
        if (keyCode === KeyEvent.DOM_VK_D) {
            game.isDemo = true;
            gameConf.userIndex = -1;
            newGameBot.base.callback();
            return false;
        }
        return true;
    }
    
    
    this.drawWidgets();

    if (game.isDemo) {
        // start again.
        this.curPage.keyHandler(KeyEvent.DOM_VK_D);
    }
    
    //acolor.onchange2 = bcolor.onchange2 = function() { c2d.drawWidgets(); }
}


C2d.prototype.drawVersionNum = function() {
    ctx2d.textAlign = "right";
    ctx2d.fillStyle = "#333";
    ctx2d.font = "10px sans-serif";
    ctx2d.fillText(gameConf.version, ctx2d.canvas.width, 10);
    this.setMenuFont();
    ctx2d.textAlign = "start";

}


C2d.prototype.drawHoverBox = function(x, y, width, height)
{
    ctx2d.fillStyle = INMENU_BACKGROUND;
    ctx2d.strokeStyle = INMENU_STROKE;
    ctx2d.lineWidth = 5;
    this.roundedBoxPath($MR(x), $MR(y), $MR(width), $MR(height), 20);
    ctx2d.fill();
    ctx2d.stroke();
}


C2d.prototype.levelComplete = function(compLvlNum, compLvl)
{
    this.preMenu(INMENU_BACKGROUND);
    var cx = $MR(ctx2d.canvas.width / 2), cy = $MR(ctx2d.canvas.height / 2);
    var en = this.en, th = this.texth, hth = $MR(th/2);

    this.makeImgButton($("#againImg")[0], "This one again", cx-7*en, cy, 4*en, 4*en, function() {
        c2d.clearScr();
        startLife(compLvl); // level is loaded becaue we just played this level
    });
    
    this.makeImgButton($("#menuImg")[0], "Exit game", cx-2*en, cy, 4*en, 4*en, function() {
        c2d.showStartScreen();
    });

    var nextBot = this.makeImgButton($("#nextImg")[0], "Next level", cx+3*en, cy, 4*en, 4*en, function() {
        c2d.clearScr();
        if (compLvl === levels.length - 1) {// last level
            this.showStartScreen();
            return;
        }
        if (compLvlNum !== -1) { // not a custom level
            ensureLevelLoaded(compLvlNum + 1, gameConf.preloadBatch, function() {
                startLife(compLvlNum + 1);
            });
        }
        else {
            c2d.customLevelScreen();
        }
    });
    
    this.curPage.sel = 2; // next is selected
    
    this.setSelectionTextBox(new Box(cx-6*en, cy+5*en, 12*en, 0.7*th));

    this.curMenuDraw = function() {
        this.setMenuFont();
        this.drawHoverBox(cx - 9*this.en, cy-2.5*this.texth, 18*this.en, 7*th);
        ctx2d.fillStyle = "#ff3c00";
        ctx2d.textAlign = "center"

        ctx2d.fillText( ((compLvlNum !== -1)?("Level " + (compLvlNum+1)):"Level") + " Completed!", cx, cy-this.texth);
        ctx2d.textAlign = "start"
        this.drawWidgets();
    };
    
    this.drawGameState();
    
    if (game.isDemo) {
        nextBot.base.callback();
    }
}


C2d.prototype.lifeEndScreen = function(inLvl, inLvlNum)
{
    this.preMenu(INMENU_BACKGROUND);
    var cx = $MR(ctx2d.canvas.width / 2), cy = $MR(ctx2d.canvas.height / 2);
    var th = this.texth, en = this.en;

    var againBot = this.makeImgButton($("#againImg")[0], "Try again", cx-5*en, cy, 4*en, 4*en, function() {
        c2d.clearScr();
        if (inLvlNum !== -1)
            inLvl = inLvlNum;
        startLife(inLvl); // level is loaded becaue we just played this level
    });
    this.makeImgButton($("#menuImg")[0], "Exit Game", cx+1*en, cy, 4*en, 4*en, function() {
        c2d.mainMenu();
    });
    
    this.setSelectionTextBox(new Box(cx-6*en, cy+5*en, 12*en, 0.7*th));

    this.curMenuDraw = function() {
        this.setMenuFont();
        this.drawHoverBox(cx - 7*en, cy-2.5*th, 14*en, 6.5*th);
        ctx2d.fillStyle = "#ff3c00";
        ctx2d.textAlign = "center";
        ctx2d.fillText("You crashed!", cx, cy-40);
        ctx2d.textAlign = "start";
        this.drawWidgets();
    };
    this.drawGameState();
    
    if (game.isDemo) {
        againBot.base.callback();
    }
}


C2d.prototype.gameOverScreen = function(inLvl, inLvlNum)
{
    this.preMenu(INMENU_BACKGROUND);
    var cx = $MR(ctx2d.canvas.width / 2), cy = $MR(ctx2d.canvas.height / 2);
    var th = this.texth, en = this.en;

    var menuBot = this.makeImgButton($("#menuImg")[0], "Back to menu", cx-2*en, cy, 4*en, 4*en, function() {
        c2d.mainMenu();
    });
    
    this.setSelectionTextBox(new Box(cx-6*en, cy+5*en, 12*en, 0.7*th));

    this.curMenuDraw = function() {
        this.setMenuFont();
        this.drawHoverBox(cx - 7*this.en, cy-2.5*th, 14*en, 6.5*th);
        ctx2d.fillStyle = "#ff3c00";
        ctx2d.textAlign = "center";
        ctx2d.fillText("Game Over!", cx, cy-this.texth);
        ctx2d.textAlign = "start";
        this.drawWidgets();
    }
    this.drawGameState();
    
    if (game.isDemo) {
        menuBot.base.callback();
    }
}

// silent pause is when the user presses P
// verbose pause is when the user presses ESC
C2d.prototype.verbosePauseScreen = function()
{
    this.preMenu(INMENU_BACKGROUND);
    var cx = $MR(ctx2d.canvas.width / 2), cy = $MR(ctx2d.canvas.height / 2);
    var en = this.en, em = this.em, th = this.texth;
    
    function resume() {
        c2d.clearScr();
        c2d.drawGameState();
        startGameControls(); // controls were removed in preMenu
        game.setPaused(false);
    }

    this.makeImgButton($("#resumeImg")[0], "Resume", cx-7*en, cy, 4*en, 4*en, function() {
        resume();
    });
    this.makeImgButton($("#menuImg")[0], "End game", cx-2*en, cy, 4*en, 4*en, function() {
        game.isDemo = false;
        c2d.mainMenu();
    });
    this.makeImgToggleButton($("#soundOnImg")[0], $("#soundOffImg")[0], "Sound", game.soundEnabled, cx+3*en, cy, 4*en, 4*en, function(isOn) {
       writeDebug("SetSnd " + isOn);
       game.enableSound(isOn);
    });
    this.setSelectionTextBox(new Box(cx-6*en, cy+5*en, 12*en, 0.7*th));

    this.curMenuDraw = function() {
        this.setMenuFont();
        this.drawHoverBox(cx - 8*en, cy-2.2*th, 16*en, 6.5*th);
        ctx2d.fillStyle = "#ff3c00";
        ctx2d.textAlign = "center";
        ctx2d.fillText("Paused", cx, cy-th);
        ctx2d.textAlign = "start";

        this.drawWidgets(INMENU_BACKGROUND);
    }
    this.curPage.keyHandler = function(keyCode) {
        if (keyCode === KeyEvent.DOM_VK_ESCAPE) {
            resume();
            return false;
        }
        return true;
    }
    
    this.drawGameState();
}

C2d.prototype.loadingScreen = function(pc)
{
    this.blankScr("black");
    this.setup2dInputs();
    enable3d(false);
    var cx = $MR(ctx2d.canvas.width / 2), cy = $MR(ctx2d.canvas.height / 2);
    this.setMenuFont();
    ctx2d.fillStyle = "#ff3c00";
    ctx2d.textAlign = "center";
    ctx2d.fillText("Loading... " , cx, cy);
    ctx2d.textAlign = "start";

/* we're doing the geometry processing syncroniusly so the screen doesn't have a chance
     to update with the progress bar. better just leave it off.*/
    ctx2d.fillStyle = "rgb(100,0,0)";
    var qcx = $MR(cx/2), qh = this.texth;
    
    ctx2d.fillRect(qcx, cy+this.texth, 2*qcx, qh);
    ctx2d.fillStyle = "rgb(200,0,0)";
    ctx2d.fillRect(qcx+5, cy+this.texth+5, pc*2*(qcx-10), qh-10);
  
}


C2d.prototype.instructionsScreen = function()
{
    this.preMenu();
    
    var cw = ctx2d.canvas.width, ch = ctx2d.canvas.height;
    var cx = $MR(cw / 2), cy = $MR(ch / 2), th = this.texth, em = this.em, en = this.en;

    // no drawWindow in chrome so we need to draw the embedded image manually.
    var img = $("#instructImg")[0];
    ctx2d.drawImage(img, 0, 0, cw, $MR(img.height / img.width * (cw)));
    var hdr = $("#instructHeader")[0];
    var hw = $MR(678 / img.width * cw); // 678 is the width of the image when embedded into the svg
    ctx2d.drawImage(hdr, cx-$MR(hw/2), 0, hw, $MR(hdr.height / hdr.width * (hw)));

    // any key or mouse click returns the user to the main screen
    this.curPage.keyHandler = this.curPage.mouseHandler = function() {
        c2d.end3dAbove();        
        c2d.showStartScreen();
        return false;
    };
    
    var bsize = $MR(th * 1.5);
    this.render3d = [                 
        new LifeInstructRenderable(new Box(1.2*en, ch*0.18, bsize, bsize)),
        new BikeInstructRenderable(new Box(cx-2.5*en, ch*0.19, 2*bsize, bsize)),
        new EnemyInstructRenderable(new Box(cx-2.5*en, ch*0.07, 2*bsize, bsize))
    ];
    
    this.start3dAbove();
}

 var customSelect = {
    worldSel:new GroupCommon(0),
    numPlayersSel:new GroupCommon(2),
    aiSel:new GroupCommon(1),
    speedSel:100
};

C2d.prototype.customLevelScreen = function()
{
    this.preMenu("black");
    enable3d(false);

    var cw = ctx2d.canvas.width, ch = ctx2d.canvas.height;
    var cx = $MR(cw / 2), cy = $MR(ch / 2), th = this.texth, em = this.em, en = this.en;

    var iis = $MR(ch/4.2);
    var iiw = $MR(iis*0.8);
    
    var scrSel = customSelect;
    
    for(var i = 0 ; i < levels.length; ++i) {
        var img = null;
        if (levels[i].icon !== null) {
            img = new Image();
            img.src = levels[i].icon;
            img.onload = function() { c2d.drawWidgets(); }
        }
        this.makeImgButton(img, "", em+iis*(i%5), th*1.2+iis*Math.floor(i/5), iiw, iiw, function(value) { return function() {
        //    scrSel = { iconSel:index, numEnemySel: levels[index].numPlayers, aiSel: levels[index].ai };
            scrSel.worldSel.sel = value;
            c2d.drawWidgets();
            //writeDebug("sel: " +value);
        }}(i), new GroupItem(scrSel.worldSel, i) );
    }
    
    this.blankScr("black");
    ctx2d.fillStyle = "#ff3c00"
    c2d.setMenuFont(th*0.7);
    ctx2d.fillText("Select World:", en, $MR(th*0.7));
    var y2 = $MR(0.56*ch);
    ctx2d.fillText("Number of Players:", en, y2);
    var y3 = $MR(0.74*ch);
    ctx2d.fillText("Difficulty:", en, y3);
    var y4 = $MR(0.89*ch);
    ctx2d.fillText("Speed:", en, y4);

    c2d.setMenuFont(th);
    ctx2d.textAlign = "center";
    
    for(var i = 1; i <= 6; ++i) {
        this.makeTextButton(i, i*em*2, y2+0.3*th, th, en, function(value) { return function() {
            scrSel.numPlayersSel.sel = value;
            c2d.drawWidgets();
        }}(i), new GroupItem(scrSel.numPlayersSel, i));
    }

    var aidiff = [ {txt:"easy", d:1}, {txt:"medium", d:3}, {txt:"hard", d:5}];
    var sx = 2*em;
    for(var i = 0; i < aidiff.length; ++i) {
        var df = aidiff[i];
        var ln = en*(df.txt.length+1);
        this.makeTextButton(df.txt, sx, y3+0.3*th, th, ln, function(value) { return function() {
            scrSel.aiSel.sel = value;
            c2d.drawWidgets();
        }}(i), new GroupItem(scrSel.aiSel, i) );
        sx += ln+en;
    }
    
    var percentBox = new Box(cw*0.64, 0.9*ch, 4.5*en, th);
    var slider = this.makeSlider(50, 300, 5, customSelect.speedSel, 2*em, 0.9*ch, cw*0.5, th*1.3, function(v) {
        //writeDebug(v);
        c2d.backgroundRect(percentBox);
        ctx2d.fillStyle = "#ff3c00"
        ctx2d.textAlign = "right"
        ctx2d.fillText(v + "%", percentBox.x+percentBox.width, percentBox.y + th-1);
        ctx2d.textAlign = "center"
        customSelect.speedSel = v;
    });
  
    
    this.makeImgButton($("#menuImg")[0], "Exit game", cw-5*en, ch-10*en, 4*en, 4*en, function() {
        c2d.showStartScreen();
    });

    this.makeImgButton($("#nextImg")[0], "Next level", cw-5*en, ch-5*en, 4*en, 4*en, function() {
        c2d.clearScr();
    
        worldLvl = scrSel.worldSel.sel;
        ensureLevelLoaded(worldLvl, gameConf.preloadBatch, function() {
            game.currentLevelNum = -1; // not really a level
            game.userLivesCount = 3;
            c2d.mainMenu = C2d.prototype.customLevelScreen;
            ctx2d.textAlign = "start";
            startLife({ worldModel:levels[worldLvl].worldModel,
                        view: levels[worldLvl].view,
                        numPlayers:scrSel.numPlayersSel.sel,
                        ai:aidiff[scrSel.aiSel.sel].d,
                        speed: customSelect.speedSel/100
                      } );
        });
    });
    
    this.curPage.keyHandler = function(keyCode) {
        if (keyCode === KeyEvent.DOM_VK_ESCAPE) {
            c2d.showStartScreen();
            return false;
        }
        return true;
    }
    
    
    c2d.setMenuFont(th);
    ctx2d.textAlign = "center";
    this.drawWidgets();
}


///////////////////////////////////////////////// 3d render on 2d screens /////////////////////////////////////////////

function LifeInstructRenderable(box) {
    this.anglex = 0;
    this.angley = 0;
    this.box = box;
}

LifeInstructRenderable.prototype.draw = function() {

    // draw life bonus
    gl.viewport(this.box.x, this.box.y, this.box.width, this.box.height);
    
    pr.load(mat4.ortho(-1, 1, 1, -1, 0.1, 100.0));

    mv.pushMatrix();
    mv.translate([0,0,-10]);
    mv.scale(0.3);

    mv.rotateX(this.anglex);
    mv.rotateZ(this.angley);
        
    shaderProg.setColorv(LifeBonus.prototype.getColor(this.anglex));

    renderModel(resources.life);
    mv.popMatrix();
}

LifeInstructRenderable.prototype.advance = function(elapsed) {
    LifesRenderable.prototype.rotate.call(this, elapsed);
}

function BikeInstructRenderable(box) {
    this.box = box;
}
BikeInstructRenderable.prototype.draw = function() {
    gl.viewport(this.box.x, this.box.y, this.box.width, this.box.height);

    var iaspect = this.box.height / this.box.width
    pr.load(mat4.ortho(-1, 1, iaspect, -iaspect, 0.1, 100.0));
            
    mv.pushMatrix();
    mv.translate([0,0,-10]);
    mv.scale(0.3);
    mv.rotateX(90 - 33);
    mv.rotateZ(90 + 16);

    renderModel(resources.bike, PlayerColors[gameConf.userIndex].model);

    mv.popMatrix();
}

function EnemyInstructRenderable(box) {
    this.box = box;
    this.move = 0
    this.colors = []            
    for(var i = 0; i < PlayerColors.length; ++i) {
        if (i === gameConf.userIndex)
            continue;
        this.colors.push(PlayerColors[i].model);
    }
}
EnemyInstructRenderable.prototype.draw = function() {

    gl.viewport(this.box.x, this.box.y, this.box.width, this.box.height);

    var iaspect = this.box.height / this.box.width
    pr.load(mat4.ortho(-1, 1, iaspect, -iaspect, 0.1, 100.0));

    for(var i = 0; i < this.colors.length + 1; ++i) {

        mv.pushMatrix();
        mv.translate([0 , 0, -10]); //
        mv.rotateX(90 - 33);
        mv.rotateZ(90 + 16);
        mv.translate([0, -this.move * this.colors.length * 2 + (i * 2), 0]);

        mv.scale(0.3);

        renderModel(resources.bike, this.colors[i%this.colors.length]);
        mv.popMatrix();
    }

}
EnemyInstructRenderable.prototype.advance = function(elapsed) {
    this.move += elapsed * 0.0001;
    while (this.move > 1)
        this.move -= 1;
}


// called by the global tick()
C2d.prototype.draw3d = function(elapsed)
{
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    mv.loadIdentity();
    setupLighting();
    shaderProg.setTwoSided(true);
    
    for(var ri in this.render3d) {
        var render = this.render3d[ri];
        if (render.advance)
            render.advance(elapsed);
        render.draw();
    }
}

// enter the mode required for for instruction
// where 3d content is displayed above the 2d canvas
C2d.prototype.start3dAbove = function() {
    this.has3dContent = true;
    // set the 3d canvas above the 2d canvas temporarily
    canvas.style.zIndex = 2; 
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    viewControl = new OutsideView();
}
// restore the to normal situation
C2d.prototype.end3dAbove = function() {
    c2d.render3d = [];
    c2d.has3dContent = false;
    canvas.style.zIndex = 0; 
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    viewControl = null;
}





//////////////////////////////////////////////// online state display ////////////////////////////////////////////////////


// x,y is the right-top corner of the text
// example "hello<11>wor</>ld<22>ther</>e"
// get style gets you the style for the number in the tag
C2d.prototype.drawColorText = function(txt, x, y, getStyle)
{
    var tags = [];

    var mt = txt.match(/<([0-9]*|\/)>/g);
    if (mt === null) mt = [];
    var pos = 0;
    for(var i = 0; i < mt.length; ++i) {
        var match = mt[i]
        pos = txt.indexOf(match, pos);
        txt = txt.slice(0,pos) + txt.slice(pos+match.length);
        tags.push( { s:pos, n:parseInt(match.slice(1,-1)) });
    }
    
    var len = ctx2d.measureText(txt).width;
    var xpos = x-len; // on screen
    var pos = 0; // in the string
    var normalStyle = ctx2d.fillStyle;
    for(var i = 0; i < tags.length; i += 2) {
        // draw the normal text before the tag
        var start = tags[i].s, end = tags[i+1].s;
        if (end !== start) {
            var t = txt.slice(pos, start);
            ctx2d.fillStyle = normalStyle;
            ctx2d.fillText(t, xpos, y);
            pos += t.length;
            xpos += ctx2d.measureText(t).width;
        }
        
        t = txt.slice(start, end);
        ctx2d.fillStyle = getStyle(tags[i].n);
        ctx2d.fillText(t, xpos, y);
        pos += t.length;
        xpos += ctx2d.measureText(t).width;
    }
    
    var t = txt.slice(pos);
    ctx2d.fillStyle = normalStyle;
    ctx2d.fillText(t, xpos, y);
    
}


// noMenu - don't draw the menus, in case we're drawing them somewhere else already
C2d.prototype.drawGameState = function(noMenu)
{
    if (enabled3d) {
        this.blankScr();
        ctx2d.font = "bold " + $MR(this.texth*0.667) + "px sans-serif";
        ctx2d.fillStyle = "#dda7ff";
       // ctx2d.fillStyle = acolor.color().hex;
        ctx2d.fillText("Lives:", 5, this.texth);
        
        if (this.msgQueue.length > 0) {
            ctx2d.font = "bold 18px sans-serif";
            var cw = ctx2d.canvas.width, ch = ctx2d.canvas.height;
            //acolor.onchange2 = function() { c2d.drawGameState(); };
            for(var i = 0; i < this.msgQueue.length; ++i) {
                var txt = this.msgQueue[i].text;
               // var len = ctx2d.measureText(txt).width;
               // ctx2d.fillText(txt, cw-len-5, 25+22*i)
               
                this.drawColorText(txt, cw-5, 25+22*i, function(i) {
                    return players[i].textColor;
                });
            }
        }
    }
        
    if (this.curMenuDraw && !noMenu)
        this.curMenuDraw.call(this);
}

// some messages can have a message id, if we want to explicitly remove them after
C2d.MSGID_START_ARROWS = 1001;
C2d.MSGID_PAUSE = 1002;


C2d.prototype.addMessage = function(text, id) {
    this.msgQueue.push({text:text, outTime:new Date().getTime() + 8000, id:id });
    this.drawGameState()
}

C2d.prototype.removeMessage = function(id) {
    // the queue depends on being a list with consecutive indexes. if we remove something
    // need to rebuild the list
    var removed = false;
    var newQ = [];
    for(var i in this.msgQueue) {
        if (this.msgQueue[i].id === id) {
            removed = true;
        }
        else {
            newQ.push(this.msgQueue[i]);
        }
    }
    if (removed) {
        this.msgQueue = newQ;
        this.drawGameState();
    }
}


C2d.prototype.checkMessageQueue = function() {
    // if the game is paused or if we're in a menu, don't remove messages
    // if players die when the user sees the you crashed screen, I don't want them to disapper
    if (this.msgQueue.length === 0 || game.isPaused() || userInput.handlersSet === userInput.HANDLERS_MENU)
        return;
    var nowTime = new Date().getTime();
    var removed = 0;
    while (this.msgQueue.length && this.msgQueue[0].outTime < nowTime) {
        this.msgQueue.shift();
        ++removed;
    }
    
    if (enabled3d && removed > 0) // draw to screen only if we're in 3d mode
        this.drawGameState();
}

C2d.prototype.clearMessages = function() {
    this.msgQueue = [];
}


//////////////////////////////////////////// online game screen display ////////////////////////////////

// renders the count of lives at the corner of the screen
function LifesRenderable(player) {
    this.anglex = 0;
    this.angley = 0;
    this.color = vec3.x(player.modelColor, 1.5);
    this.count = game.userLivesCount; // normal lives count, maintained separately from game.userLivesCount for display
    
    this.activeDeath = undefined; // measuring elapsed msec from death
    this.activeOneUp = undefined; // measuring elapsed msec from the one-up event
    this.lightFactor = 1; // [0-3,undefined]
    // in case there is a death during activeOneUp, this lights up instead of activeDeath
    // this may happen if we just took a one-up before crashing. it cannot happen the other way around
    // (one-up after death)
    this.pendingDeath = false;
    
    // cache stuff so it would not be calculated every frame
  //  var aspect = gl.viewportHeight/gl.viewportWidth
    var aspect = gl.viewportWidth/gl.viewportHeight
    this.prMatrix = mat4.ortho(0, aspect, 1, 0, 0.1, 100.0);

}


LifesRenderable.prototype.render = function() {
    that = this;
    var renderLife = function(i, multScale) {
        mv.pushMatrix();
        
       // mv.translate([-0.75 + i * 0.1, aspect-0.07, -1]);
        mv.translate([0.172 + i*0.068, 0.048 , -1]);
        mv.scale(0.011 * multScale);
        mv.rotateX(that.anglex + 20 * i);
        mv.rotateZ(that.angley + 20 * i);
        
        renderModel(resources.life);
        mv.popMatrix();
    }

    pr.pushMatrix();
    pr.load(this.prMatrix);

    shaderProg.setColorv(this.color);

    var i = 0;
    for(; i < this.count; ++i) {
        renderLife(i, 1);
    }
    if (this.activeDeath !== undefined || this.activeOneUp !== undefined) {
        shaderProg.setColorv( vec3.x(this.color, this.lightFactor) );
        var sf = (this.lightFactor - 1) * 0.2 + 1;
        renderLife(i, sf);
    }
    
    pr.popMatrix();
}

// PI radians in 1000 msec
LifesRenderable.ROTX_SPEED = 90 / 1000;
LifesRenderable.ROTY_SPEED = 180 / 1000;
// a pass is either a death or a new life
LifesRenderable.PASS_PEAK_LIGHT = 3;
LifesRenderable.PASS_PEAK_TIME = 1000;
LifesRenderable.PASS_TOTAL_TIME = 2000; // starting from the beginning

// static function.
// climb from 1 to 3 and then back to 0 again
// if its time for the end of the animation, call onstop.
// this is better than using a return value because I don't need to checn the return value when this function returns.
LifesRenderable.getLightFactor = function(msec, onstop) {
    
    if (msec >= 0) {
        if (msec <= LifesRenderable.PASS_PEAK_TIME)
            return 1 + (LifesRenderable.PASS_PEAK_LIGHT / LifesRenderable.PASS_PEAK_TIME) * msec;
        else if (msec <= LifesRenderable.PASS_TOTAL_TIME)
            return LifesRenderable.PASS_PEAK_LIGHT - (LifesRenderable.PASS_PEAK_LIGHT /
                            (LifesRenderable.PASS_TOTAL_TIME - LifesRenderable.PASS_PEAK_TIME)) * (msec - LifesRenderable.PASS_PEAK_TIME);
    }
       
    onstop();  // msec < 0 || msec > PASS_TOTAL_TIME
    return 1; 
}


LifesRenderable.prototype.rotate = function(elapsed) {
    this.anglex += LifesRenderable.ROTX_SPEED * elapsed;
    while (this.anglex > 360)
        this.anglex -= 360;
    this.angley += LifesRenderable.ROTY_SPEED * elapsed;
    while (this.angley > 360)
        this.angley -= 360;
}


LifesRenderable.prototype.advance = function(elapsed) {
    this.rotate(elapsed);
    
    if (this.activeOneUp !== undefined) {
        var that = this;
        this.activeOneUp += elapsed; // same as death but goes backwards
        this.lightFactor = LifesRenderable.getLightFactor(LifesRenderable.PASS_TOTAL_TIME - this.activeOneUp, function() {
            ++that.count;
            that.activeOneUp = undefined;
            if (that.pendingDeath) {
                that.pendingDeath = false;
                that.startDeath();
            }
        } ); 
    }
    else if (this.activeDeath !== undefined) {
        var that = this;
        this.activeDeath += elapsed;
        this.lightFactor = LifesRenderable.getLightFactor(this.activeDeath,
                                                          function() { that.activeDeath = undefined; } ); 
    }


}

LifesRenderable.prototype.startDeath = function() {
    if (this.activeOneUp !== undefined) {
        this.pendingDeath = true;
        return;
    }
    --this.count;
    this.activeDeath = 0;
}
LifesRenderable.prototype.startOneUp = function() {
    
    this.activeOneUp = 0;
}


