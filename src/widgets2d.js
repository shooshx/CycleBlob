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
        
        //var snd = turnSound;
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

function menuMouseWheel(e) {
    var w = c2d.getWidget(e)
    if (w !== null && w.onWheelEvent !== undefined) {
        w.onWheelEvent(e)
        return false;
    }
    var wh = c2d.curPage.wheelHandlers;
    for (var i = 0; i < wh.length; ++i) {
        if (wh[i].box.inside(e)) {
            wh[i].handler(e)
            return false;
        }
    }
    return true;
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

function menuHandleTouchStart(evt) {
    evt.preventDefault();
    
    touchX = evt.touches[0].clientX - drawDiv.offsetLeft;                                      
    touchY = evt.touches[0].clientY - drawDiv.offsetTop;
    e = { layerX: touchX, layerY: touchY }
    menuMouseDown(e)    
}
function menuHandleTouchMove(evt) {
    evt.preventDefault();
}
function menuHandleTouchEnd(evt) {
    evt.preventDefault();
}

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
    this.menuAnim = null;
    
    // TBD - move this to the main anim func...
    window.setInterval(function () { c2d.checkMessageQueue(); }, 200);
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
    document.onmousewheel = menuMouseWheel;
    
    userInput.handlersSet = userInput.HANDLERS_MENU;
    
    document.body.addEventListener("touchstart", menuHandleTouchStart, false);
    document.body.addEventListener("touchmove", menuHandleTouchMove, false);
    document.body.addEventListener("touchend", menuHandleTouchEnd, false);
    document.body.addEventListener("touchcancel", menuHandleTouchEnd, false);    
}


C2d.prototype.getCanvasCoord = function(e) {
    return { x:e.layerX, y:e.layerY }; // ignoring any borders and padding  
}


C2d.prototype.getWidget = function(e) {
    var coord = this.getCanvasCoord(e);
    return this.wnd.coordWidget(coord)
    return null;
}

C2d.prototype.roundedBoxPathb = function(box, r) {
    this.roundedBoxPath(box.x, box.y, box.width, box.height, r)
}

C2d.prototype.roundedBoxPath = function(x, y, w, h, r) {
    if (r === undefined)
        throw "r should be defined"
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



function mmenu_text_fill(box) {
    //acolor.onchange2 = bcolor.onchange2 = ccolor.onchange2 = function() { c2d.drawWidgets() }

    //return "#ff8464"
    var grad = ctx2d.createLinearGradient(box.x, box.y, box.x+box.width, box.y+box.height);
    grad.addColorStop(0, "#773cff"); //acolor.color().hex);
    grad.addColorStop(1, "#f4204a"); //bcolor.color().hex);
    return grad;
}
function mmenu_text_stroke(box) {
    return "#7c007e"; //ccolor.color().hex; //"#c90034";
}

//var MMENU_FILL = "#ff8464";
//var MMENU_STROKE = "#c90034";

TextButton.prototype.draw = function(isSelected) {
    c2d.drawSelect(this.box, isSelected);
    if (this.group) 
        this.group.testndraw();
    ctx2d.fillStyle = mmenu_text_fill(this.box); // orange "#ff3c00"
    var tx = (ctx2d.textAlign == "center")?(this.box.x + $MR(0.5*this.box.width)):this.tx;

    ctx2d.fillText(this.text, tx, this.ty);
    ctx2d.lineWidth = 2;
    ctx2d.strokeStyle = mmenu_text_stroke(this.box);  //"#500000"
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
    ctx2d.fillStyle = mmenu_text_fill(this.box);
    ctx2d.fill();
    ctx2d.strokeStyle = mmenu_text_stroke(this.box);
    ctx2d.lineWidth = 2;
    ctx2d.stroke();
    
    // x center of the selector
    var selx = this.box.x + this.box.width / (this.vmax - this.vmin) * (this.value - this.vmin);
    var selhw = $MR(c2d.en*0.35);
    c2d.roundedBoxPath(selx-selhw, this.box.y, 2*selhw, this.box.height, $MR(selhw*0.7));
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

////////////////////////// Scroll ///////////////////////////////////////////////////////////////
function Scroll(total, part, value, box, w) {
    this.base = w; w.box = box;
    this.box = box;
    this.total = total; this.part = part;
    this.valueChanged = w.callback;
    this.base.callback = this.onevent;
    this.value = value; // [0:total-part]
    this.clearBox = box.expanded(2);

    this.h = 0; // the height the bar is at
    this.pressY = null;
    this.pressH = null;

}

Scroll.prototype.draw = function(isSelected) {
    //writeDebug("SCROLL " + this.value);
    c2d.backgroundRect(this.clearBox);

    var x = this.box.x, y = this.box.y, w = this.box.width, h = this.box.height;
    c2d.roundedBoxPath(x, y, w, w, 4);
    ctx2d.stroke();

    c2d.roundedBoxPath(x, y+h-w, w, w, 4);
    ctx2d.stroke();
    var workh = h - w*2; // working height
    var d = this.part/this.total; // what percent of the work height the bar takes
    var workd = d*workh;       // height of bar in pixels
    var rangeh = workh-workd;  // possible xs where the bar can start

    c2d.roundedBoxPath(x, y + w + this.h, w, workd, 4);
    ctx2d.stroke();
    this.workd = workd; this.rangeh = rangeh;
}

Scroll.prototype.updateH = function(newh) {
    newh = Math.min(this.rangeh, Math.max(0, newh));
    if (newh !== this.h) {
        this.h = newh;
        newvalue = $MR((this.h/this.rangeh) * (this.total-this.part));

        this.draw(true);
        this.valueChanged(newvalue);
    }
}

Scroll.prototype.onWheelEvent = function(e) {
    //writeDebug("SCROLL " + e.wheelDelta);
    this.updateH(this.h - e.wheelDelta/3);
}

Scroll.prototype.onevent = function(e) {
    var newh = this.h;
    if (this.pressY !== null) { // pressed
        newh = this.pressH + (e.y - this.pressY);
    }

    if (e.name === Widget.EVENT_PRESS) {
        var barStart = this.box.width + this.h;
        if (e.y >= barStart && e.y <= barStart + this.workd) { // in the bar
            c2d.curPage.mouseCaptureWidget = this;
            this.pressY = e.y;
            this.pressH = this.h;
        }
        else if (e.y < this.box.width) 
            newh -= 10;
        else if (e.y > this.box.height - this.box.width) 
            newh += 10;
        else if (e.y < barStart) 
            newh -= 100;
        else 
            newh += 100;
    }
    else if (e.name === Widget.EVENT_RELEASE) {
        this.pressY = null;
        this.pressH = null;
    }

    this.updateH(newh);
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
    this.curPage.widgets = []; // all widgets in the page, flatly stored
    this.curPage.sel = 0; // selected widget
    this.curPage.background = undefined;
    this.curPage.keyHandler = null;   // keyboard actions specific to a page
    this.curPage.mouseHandler = null; // mouse actions specific to a page, for clicks outside the widgets
    this.curPage.selTextBox = null; // a box where the text of the current selection can appearl,
    this.curPage.mouseCaptureWidget = null; // if one widget captures the mouse, it gets exclusive messages from it
    this.curPage.wheelHandlers = [] // list of objects like {box:{...}, func:...} for external areas of wheel events handling
    
    this.blankScr();
    this.curMenuDraw = null;
    this.curMenuRemake = null; // the function to recreate the menu (after a resize);

    this.wnd = new Container(this.curPage.widgets, null);
}


C2d.prototype.setSelectionTextBox = function(box) {
    var th = box.height;
    this.curPage.selTextBox = box.expanded($MR(box.height/4)); // need to be bigger than the text due to the bottom of the 'g'
    this.curPage.selTextBox.th = th;
}


////////////////////////////// widgets creation shortcuts /////////////////////////////////////////////////////////

function Container(allwidgets, box) {
    this.box = box;
    this.allwidgets = allwidgets
    this.d = [];
    this.length = 0;
    this.translateY = 0;
    if (box)
        this.drawScroll = { x:box.x + box.width + 12, y:box.y-7, height: box.height + 7*2 }
}
Container.prototype.push = function(v, notAWidget) {
    if (notAWidget === undefined)
        this.allwidgets.push(v)
    this.d.push(v);
    ++this.length;
    return v;
}
Container.prototype.coordWidget = function(c) {
    var lc = { x:c.x, y:c.y };
    if (this.box) {
        lc.x -= this.box.x;
        lc.y -= this.box.y-this.translateY;
    }
    for(var i = 0; i < this.length; ++i) {
        var w = this.d[i];
        if (w.coordWidget !== undefined) {
            var r = w.coordWidget(lc);
            if (r)
                return r;
        }
        else if (w.box.inside(lc))
            return w;
    }
    return null;
}

Container.prototype.makeTextButton = function(text, x, y, height, width, callback, groupId) {
    var m = ctx2d.measureText(text);
    return this.push( new TextButton(text, new Box(x, y, width, height), new Widget(callback, this.allwidgets.length), groupId ) );
}

Container.prototype.makeImgToggleButton = function(imgOn, imgOff, text, initState, x, y, height, width, callback) {
    return this.push( new ImgToggleButton(imgOn, imgOff, text, initState, new Box(x, y, width, height), new Widget(callback, this.allwidgets.length)) );
}

// groupId is an object with sel: index of currently selected item, id: this widget's id
Container.prototype.makeImgButton = function(img, text, x, y, height, width, callback, groupId) {
    return this.push( new ImgButton(img, text, new Box(x, y, width, height), new Widget(callback, this.allwidgets.length), groupId) );
}

Container.prototype.makeSlider = function(vmin, vmax, step, value, x, y, width, height, callback) {
    return this.push( new Slider(vmin, vmax, step, value, new Box(x, y, width, height), new Widget(callback, this.allwidgets.length)));
}

Container.prototype.makeScroll = function(total, part, value, x, y, width, height, callback) {
    return this.push( new Scroll(total, part, value, new Box(x, y, width, height), new Widget(callback, this.allwidgets.length)));
}

Container.prototype.makeContainer = function(x, y, width, height) {
    return this.push( new Container(this.allwidgets, new Box(x, y, width, height)), true);
}

Container.prototype.draw = function(selectedIndex) {
    if (this.length===0)
        return;
    if (this.box) {
        c2d.backgroundRect(this.box);
        c2d.roundedBoxPathb(this.box.expanded(7), 14);
        ctx2d.strokeStyle = mmenu_text_stroke(this.box);
        ctx2d.lineWidth = 1;
        ctx2d.stroke();

        ctx2d.save();
        c2d.roundedBoxPathb(this.box, 14);
       // ctx2d.rect(this.box.x, this.box.y, this.box.width, this.box.height)
        ctx2d.clip();
        ctx2d.translate(this.box.x, this.box.y - this.translateY);
    }

    for(var i=0; i < this.length; ++i) {
        var w = this.d[i];
        if (w.base)
            w.draw(w.base.index === selectedIndex);
        else
            w.draw(selectedIndex); // it's a container
    }

    if (this.box) {
        ctx2d.restore();
    }
}


C2d.prototype.drawWidgets = function () {
    this.wnd.draw(this.curPage.sel)
    
    // if the selected widget has associated text, display the text win the text box
    if (this.curPage.widgets.length == 0)
        return // can happen if the dialog was cleared
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
