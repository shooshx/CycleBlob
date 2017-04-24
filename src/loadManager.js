


// possible resources: world, bike, explode
var resources = {
    _ready: false // this is the only property that is not a resource. means that the essential resources are loaded
};

var workProgress = {
    items: {},        // items that are currently in processing (models)
    ondone: null,     // called after all items are done
    onprogress: null  // bool(float) called for progress report. receives [0-1] progress.
                      // should return true if next action should be async.
};

function updateProgress(name, status) {
    if (status === null) {
        delete workProgress.items[name];

        if (workProgress.ondone && Object.keys(workProgress.items).length === 0) {
            workProgress.onprogress = null;
            workProgress.ondone();
            workProgress.ondone = null;
        }
        return;
    }
    workProgress.items[name] = status;
}

function waitAsyncProgress(ondone) {
    if (Object.keys(workProgress.items).length === 0) {
        ondone();
        return;
    }
    c2d.loadingScreen(0);
    workProgress.ondone = ondone;
    
    var curPercent = -1;
    workProgress.onprogress = function(cp) {
        //if (cp >= curPercent + 0.05) {
            c2d.loadingScreen(cp);
         //   curPercent = cp;
        //}
        return false; // from here on, work will be sync (blocked) because we are in the loading screen.
    };
}

// do the actual processing of the mesh after it is loaded.
// if async is true, this only start the process
function processWorldModel(loadedName, async) {
    updateProgress(loadedName, "processing");
    var rec = resources[loadedName];
    var model = {};

    var _start = new Date().getTime();
    writeDebug("start " + loadedName);
        
    createMeshData(rec.input, model);
    createGridMeshBuffers(model, async,
        function() {  // done
            rec.model = model;
            writeDebug("done " + loadedName + " " + (new Date().getTime() - _start));
            updateProgress(loadedName, null); // may call workProgress.ondone which may lead to startLife
        }, 
        function(pc) { // progress
            if (workProgress.onprogress)
                return workProgress.onprogress(pc)
            return true; // working on the background, do async
        }
    );
}


function deleteModel(name) {
    if (!resources[name] || !resources[name].model)
        return;
    writeDebug("deleting " + name);
    delete resources[name].model;
}


function loadedWorld(loadedName, item, args) {

    var model = { input: item, name: loadedName }; // onload- the hook that starts the level when it is loaded. see startLife()
    resources[loadedName] = model; // clean up item
    
    if (args.gridProc) {
        processWorldModel(loadedName, args.async); // loading it now async
    }
    else {
        updateProgress(loadedName, null); // not loading it now
    }
            
}


//
function loadLevelWorld(lvl, gridProc, async) {
    if (!levels[lvl])
        return;
    
    var name = levels[lvl].worldModel;
    
    if (resources[name] === undefined || resources[name].input === undefined) { // not loaded and not processed
        loadModel(worldModels[name].file, "none", name, loadedWorld, { gridProc:gridProc, async:async });
        return;
    }
    if (resources[name].model === undefined && gridProc) { // loaded but not processed
        processWorldModel(name, async);            
    }
}

function ensureLevelLoaded(lvlNum, howMany, ondone) {
    var level = levels[lvlNum];
    if (level === undefined)
        throw new Error("level not found");
    if (resources[level.worldModel] !== undefined && resources[level.worldModel].model !== undefined) {
        if (ondone)
            ondone();
        return;
    }
    
    var async = true;
    
    // delete everything. we don't want to take too much memory. keep the input though
    for(var i = 0; i < lvlNum; ++i) 
        deleteModel(levels[i].worldModel);
    for(var i = lvlNum + howMany; i < levels.length; ++i) 
        deleteModel(levels[i].worldModel);
    
    // queue the loading, when the data arrive, do sync processing that is faster
    for(var i = 0; i < howMany; ++i) {
        loadLevelWorld(lvlNum + i, true, async);
    }
    
    if (ondone)
        waitAsyncProgress(ondone);
}


function loadedResource(loadedName, item) {
    resources[loadedName] = item;
    updateProgress(loadedName, null);
    // all resources needed to start game are ready.
    if (resources.life && resources.bike)
    {
        resources._ready = true;

        checkGLErrors("rcsinit");
    }
}

// world meshes enter the loaded items registry as raw data
// other models enter the registry with their buffers
function loadModel(filename, method, name, onload, args) {
    updateProgress(name, "loading");
    
    var doneFunc = function(data) {
            
        if (method === "indexed") {
            var model = {};
            createMeshBuffersIndexed(data, model);
            onload(name, model, args);
        }
        else if (method === "inlined") {
            var model = {};
            createMeshBuffersInlined(data, model);
            onload(name, model, args);
        }
        else if (method === "none") {
            onload(name, data, args);
        }
        else
            throw "unknown load method";
    }
    
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4) {
           if (this.status == 200) {
                doneFunc( JSON.parse(xhttp.responseText));
           }
           else {
                throw "failed loading file " + filename;
           }
        }
    };
    xhttp.open("GET", filename, true);
    xhttp.send();
    
    
}


/*
var procworker = null;


function doWork(runObj, ondone, onprogress)
{
    runObj.index = procworker.index;
    procworker.waiting[procworker.index] = { ondone:ondone, onprogress:onprogress };
    ++procworker.index;
    procworker.postMessage(runObj);
}

function startWorker()
{
    procworker = new Worker("worker.js");
    procworker.onmessage = function(e) {
        var data = e.data;
        if (data.progress) { // it's a progress message
            var waiter = procworker.waiting[data.index];
            if (waiter.onprogress)
                waiter.onprogress(data.progress);
            return;
        }
        writeDebug('Worker output');
        var waiter = procworker.waiting[data.index];
        delete procworker.waiting[data.index];
        if (waiter.ondone)
            waiter.ondone(data);
    };
    procworker.waiting = [];
    procworker.index = 1;
    
   // procworker.postMessage(); // start the worker
}
*/

