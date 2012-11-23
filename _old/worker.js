

importScripts("glMatrix-0.9.4.min.js", "pUtils.js", "Player.js", "geomProcess.js");

if (!self.writeDebug) {// did not include debug.js
    self.writeDebug = function() {}
    self.enableDebug = function() {}
    self.clearDebug = function() {}
}

onmessage = function(e) {
    if (!e || !e.data)
        return;
    
    if (e.data.func) { // func is a string name of the function to call
        var output = self[e.data.func](e.data.input, function(pc) {
            postMessage( { progress: pc, index: e.data.index } );
        });
        output.index = e.data.index;
        postMessage(output);
        
    }
        
}