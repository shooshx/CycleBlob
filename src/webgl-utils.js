/*
 * Copyright 2010, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains functions every webgl program will need
 * a version of one way or another.
 *
 * Instead of setting up a context manually it is recommended to
 * use. This will check for success or failure. On failure it
 * will attempt to present an approriate message to the user.
 *
 *       gl = WebGLUtils.setupWebGL(canvas);
 *
 * For animated WebGL apps use of setTimeout or setInterval are
 * discouraged. It is recommended you structure your rendering
 * loop like this.
 *
 *       function render() {
 *         WebGLUtils.requestAnimationFrame(canvas, render);
 *
 *         // do rendering
 *         ...
 *       }
 *       render();
 *
 * This will call your rendering function up to the refresh rate
 * of your display but will stop rendering if your app is not
 * visible.
 *
 * To get an animationTime call
 *
 *       timeInMilliSeconds = WebGLUtils.animationFrame();
 */

WebGLUtils = function() {

var requestAnimationFrameImpl_;
var getAnimationTimeImpl_;



var makeFailHTML = function(title, msg) {
/*  return '' +
    '<table style="background-color: #000; width: 100%; height: 100%;"><tr>' +
    '<td align="center">' +
    '<div style="display: table-cell; vertical-align: middle;">' +
    '<div style="">' + msg + '</div>' +
    '</div>' +
    '</td></tr></table>';*/
    return '' + 
    '<div style="background-color: #EEE; width: 100%; height: 100%; text-align:center;" class="inframe">' +
    '<div style="width: 80%; height: 100%; margin: auto; display:table;">' +
        '<p style="font:bold 28px sans-serif; margin:10px 0 10px 0">' + title + '</p>' +
        '<div style="font-size: 18px; margin:0">' + msg + '</div>' +
    '</div></div>'

};


/*var GET_A_WEBGL_BROWSER = '' +
  'This page requires a browser that supports WebGL.<br/>' +
  '<a href="http://get.webgl.org">Click here to upgrade your browser.</a>';
*/

var TITLE_NO_SUPPORT = 'Your browser does not support WebGL';
             
//var GET_FF = "<a href='http://www.mozilla.com/?from=sfx&amp;uid=0&amp;t=572' target=_blank><img src='http://sfx-images.mozilla.org/firefox/3.6/468x60_blue.png' alt='Spread Firefox Affiliate Button' border='0' /></a>"             

var CHROME_LINK = 'http://www.google.com/chrome';
var FF_LINK = 'http://getfirefox.com';
var DIV_FF = "<div style='float:left; width:150px'><a href='"+FF_LINK+"' target=_blank><img src='img/firefox_icon128.png'><br/>Get firefox</a></div>";
var DIV_CHROME = "<div style='float:left; width:150px'><a href='"+CHROME_LINK+"' target=_blank><img src='img/chromelogo128.png'><br/>Get chrome</a></div>";
var GET_ANY = '<div style="margin:10px auto 0 auto; display:table;">' + DIV_FF + DIV_CHROME + '</div>';
var GET_CHROME = '<div style="margin:10px auto 0 auto; display:table;">' + DIV_CHROME + '</div>';
var GET_FF = '<div style="margin:10px auto 0 auto; display:table;">' + DIV_FF + '</div>';
var ALT_ANY = "To play CycleBlob please use <a href='"+CHROME_LINK+"' target=_blank>Google Chrome</a> or <a href='"+FF_LINK+"' target=_blank>Mozilla Firefox</a>"

var VIDEO_EMBED = '<iframe title="YouTube video player" width="640" height="390" src="http://www.youtube.com/embed/amFozFKhmxc?rel=0" frameborder="0" allowfullscreen></iframe>';

var GETWEBGL = "Check this website: <a href='http://get.webgl.org/'>http://get.webgl.org/</a> for more information.";
var GET_N_VID = "<br/>" + GETWEBGL + "<br/><br/>" + VIDEO_EMBED;

var MSg_FF_VER = 'Firefox ' + BrowserDetect.version + ' does not supprot WebGL<br/>' +
                 "To play CycleBlob please upgrade to the latest version of <a href='"+FF_LINK+"' target=_blank>Firefox</a> (4.0 and above) or get <a href='"+CHROME_LINK+"' target=_blank>Google Chrome</a><br/>" + GET_ANY + GET_N_VID;
                 
var MSg_CHROME_VER = 'Chrome ' + BrowserDetect.version + ' does not support WebGL<br/>' +                 
                 "To play CycleBlob please upgrade to the latest version of <a href='"+CHROME_LINK+"' target=_blank>Chrome</a> (9.0 and above) or get <a href='"+FF_LINK+"' target=_blank>Mozilla Firefox</a><br/>" + GET_ANY + GET_N_VID;
                 
var MSg_ALT_ANY = ALT_ANY + GET_N_VID;

var MSg_IE = 'Microsoft Internet Explorer (MSIE) does not support WebGL yet.<br/>' + ALT_ANY + "<br/>" + GET_ANY + GET_N_VID;

         
var MSg_FF_FAIL = "Your version of Firefox (" + BrowserDetect.version + ") is supposed to support WebGL but an error occured while trying to use it</br>" +
                  "Things you might try to do to fix this:</br><ul style='text-align:left; margin-bottom:0'>" + 
                  "<li>Write in the address 'about:config' in the address bar and press Enter. Filter for 'WebGL' in the config page and make sure it is not disabled.</li>" +
                  "<li>In the same page (about:config), set 'webgl.force-enabled' to 'true'</li>" +
                  "<li>Check for messages or errors at the very bottom of the 'about:support' page</li>" +
                  "<li>Update the display drivers of your computer. Some older drivers are known not to work properly.</li>" +
                  "<li>" + GETWEBGL + "</li>" +
                  "<li>Try <a href='"+CHROME_LINK+"' target=_blank>Google Chrome</a>.</li></ul>" + GET_CHROME + "<br/>" + VIDEO_EMBED;

var MSg_CHROME_FAIL = "Your version of Chrome (" + BrowserDetect.version + ") is supposed to support WebGL but an error occured while trying to use it</br>" +
                  "Things you might try to do to fix this:</br><ul style='text-align:left; margin-bottom:0'>" + 
                  "<li>Update the display drivers of your computer. Some older drivers are known not to work properly.</li>" +
                  "<li>Write in the address 'about:gpu' in the address bar, press Enter and see if you detect some sort of error which prevents using hardware acceleration</li>" +
                  "<li>" + GETWEBGL + "</li>" +
                  "<li>Try <a href='"+FF_LINK+"' target=_blank>Mozilla Firefox</a>.</li></ul>" + GET_FF + "<br/>" + VIDEO_EMBED;


var TITLE_UNKNOWN_ERR = 'An Unknown error occured while initializing WebGL';
var MSg_HAS_WEBGL = 'Your browser appears to support WebGL but there was an error using it' + "<br/>" + GETWEBGL + "<br/>" + VIDEO_EMBED;

/**
 * Creates a webgl context. If creation fails it will
 * change the contents of the container of the <canvas>
 * tag to an error message with the correct links for WebGL.
 * @param {Element} canvas. The canvas element to create a
 *     context from.
 * @param {WebGLContextCreationAttirbutes} opt_attribs Any
 *     creation attributes you want to pass in.
 * @param {function:(msg)} opt_onError An function to call
 *     if there is an error during creation.
 * @return {WebGLRenderingContext} The created context.
 */
var setupWebGL = function(canvas, opt_attribs, opt_onError) {
    function handleCreationError() {
        var container = canvas.parentNode;
        if (!container)
            return;
        var htmlm;

        if (BrowserDetect.browser == "Explorer") {
            htmlm = makeFailHTML(TITLE_NO_SUPPORT, MSg_IE);
        }
        else if (BrowserDetect.browser == "Firefox") {
            if (BrowserDetect.version < 4.0)
                htmlm = makeFailHTML(TITLE_NO_SUPPORT, MSg_FF_VER);
            else
                htmlm = makeFailHTML(TITLE_UNKNOWN_ERR, MSg_FF_FAIL);
        }
        else if (BrowserDetect.browser == "Chrome") {
            if (BrowserDetect.version < 9.0)
                htmlm = makeFailHTML(TITLE_NO_SUPPORT, MSg_CHROME_VER);
            else
                htmlm = makeFailHTML(TITLE_UNKNOWN_ERR, MSg_CHROME_FAIL);
        }
        else if (window.WebGLRenderingContext) {
            htmlm = makeFailHTML(TITLE_UNKNOWN_ERR, MSg_HAS_WEBGL);
        }
        else {
            htmlm = makeFailHTML(TITLE_NO_SUPPORT, MSg_ALT_ANY);
        }
        
        container.innerHTML = htmlm;
        container.style.height = null;

    };
    
    opt_onError = opt_onError || handleCreationError;
    
    if (canvas.addEventListener) {
        canvas.addEventListener("webglcontextcreationerror", function(event) {
              opt_onError(event.statusMessage);
        }, false);
    }
    var context = create3DContext(canvas, opt_attribs);
    if (!context) {
        opt_onError();
    }
    return context;
};

/**
 * Creates a webgl context.
 * @param {!Canvas} canvas The canvas tag to get context
 *     from. If one is not passed in one will be created.
 * @return {!WebGLContext} The created context.
 */
var create3DContext = function(canvas, opt_attribs) {
  var names = ["webgl", "experimental-webgl", "webkit-3d", "moz-webgl"];
  var context = null;
  for (var ii = 0; ii < names.length; ++ii) {
    try {
      context = canvas.getContext(names[ii], opt_attribs);
    } catch(e) {}
    if (context) {
      break;
    }
  }
  return context;
}

/**
 * Returns the animationTime in a cross browser way.
 * @return {number} The current animationTime
 */
var animationTime = function() {
  if (!getAnimationTimeImpl_) {
    getAnimationTimeImpl_ = function() {
      var attribNames = [
        "animationTime",
        "webkitAnimationTime",
        "mozAnimationTime",
        "oAnimationTime",
        "msAnimationTime"
      ];
      for (var ii = 0; ii < attribNames.length; ++ii) {
        var name = attribNames[ii];
        if (window[name]) {
          return function() {
            return window[name];
          };
        }
      }
      return function() {
        return (new Date()).getTime();
      }
    }();
  }
  return getAnimationTimeImpl_();
};

/**
 * Provides requestAnimationFrame in a cross browser
 * way.
 *
 * @param {!Element} element Element to request an animation frame for.
 * @param {function(number): void} callback. Callback that
 *     will be called when a frame is ready.
 */
var requestAnimationFrame = function(element, callback) {
  if (!requestAnimationFrameImpl_) {
    requestAnimationFrameImpl_ = function() {
      var functionNames = [
        "requestAnimationFrame",
        "webkitRequestAnimationFrame",
        "mozRequestAnimationFrame",
        "oRequestAnimationFrame",
        "msRequestAnimationFrame"
      ];
      for (var jj = 0; jj < functionNames.length; ++jj) {
        var functionName = functionNames[jj];
        if (window[functionName]) {
          return function (name) {
            return function(element, callback) {
              window[name].call(window, callback, element);
            };
          }(functionName);
        }
      }
      return function(element, callback) {
           window.setTimeout(callback, 1000 / 70);
        };
    }();
  }

  requestAnimationFrameImpl_(element, callback)
};

return {
  animationTime: animationTime,
  create3DContext: create3DContext,
  requestAnimationFrame: requestAnimationFrame,
  setupWebGL: setupWebGL
};
}();

