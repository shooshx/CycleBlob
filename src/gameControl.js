

function startLife(lvlsel) {
    var level, lvlNum;
    if (typeof(lvlsel) == "number") {
        level = levels[lvlsel];
        lvlNum = lvlsel;
    }
    else {
        level = lvlsel;
        lvlNum = -1;
    }
    
    writeDebug("** START" + lvlsel );
    if (level === undefined || resources[level.worldModel] === undefined || resources[level.worldModel].model === undefined)
        throw new Error("not implemented");

    world = { ready:false };
    world.model = resources[level.worldModel].model;

    playStartSound()
    
    if (!level.speed)
        level.speed = 1;

    game.currentLevelNum = lvlNum;
    game.currentLevel = level;
    
    // create the players
    players = [];
    for(var i = 0; i < level.numPlayers; ++i)
    {
       // var startPnt = (i+1)*28;
        var startPnt = randomInt(0, world.model.vtx.length - 1);
        var player = new Player(i, resources.bike, startPnt)
        if (i !== gameConf.userIndex)
            player.ai = new Ai(player, level.ai);  // artificial intelligence control
        players.push(player);
    }
    
    if (gameConf.userIndex >= 0) {// if negative, all are ai players
        userPlayer = players[gameConf.userIndex]
        userPlayer.turnCallback = playTurnSound;
    }
    else
        userPlayer = players[0];
        
    // initialize the trail buffers
    for(var pi in players)
        players[pi].init();

    // initialize the map
    world.map = new PieceMap();

    // initialize camera
    if (!level.view) {// 0 or undefined
        viewControl = new OutsideView(worldModels[level.worldModel].eyeDist);  
    }
    else if (level.view === ViewPoint.Inside) {
        viewControl = new InsideView();
    }
    else if (level.view === ViewPoint.FirstPerson) {
        viewControl = new FirstPersonView();
    }
    viewControl.moveUpdate(userPlayer);
    
    if (!game.isDemo) {
        game.setAbsPaused(true);
        game._startPause = true; // it's the pause of the start, no user indication is needed
    }
    else {
        game.setAbsPaused(false);
    }
    
    levelCompleted = { handler: null, called: false }
    c2d.clearMessages();
    if (lvlNum === 0)
        c2d.addMessage("Use the arrow keys to start the game", C2d.MSGID_START_ARROWS);
    
    // objects that are not supposed to rotate with the world
    world.staticDraw = {
        lives: new LifesRenderable(userPlayer)
    };
    world.bonuses = [];
    world.background = new Background(resources.background, world.model.bbox.size * 0.28);
    
    world.ready = true;
    enable3d(true)
    c2d.drawGameState(); // after enable 3d

    startGameControls();
}

// compressed models created using 7zip archive to gzip
worldModels={
   // cube:           { file: "models/cube3.json",       eyeDist:3.3   },
    "cube":           { file: "models/cube5quads.json",       eyeDist:3.3   },
    "triCorner":      { file: "models/triCorner4.json",       eyeDist: 7 },
    "plus":           { file: "models/plus4q.json",           eyeDist: 7 },
    "dblsofa":        { file: "models/dbl_sofa_soft_4q.json", eyeDist: 3.3 },
    "softsofa":       { file: "models/sofa4q_soft.json",      eyeDist: 3.54 }, // nice
    "dDiamond":       { file: "models/distortDiamond5q.json", eyeDist: 4    }, // nice
    "torus":          { file: "models/torus_100_50s.json",    eyeDist: 3.66 }, // fun
    "tetra":          { file: "models/tetra1_4q.json",        eyeDist: 3.4  },
    "mobius":         { file: "models/mobius_10r_3q.json",    eyeDist: 1.0  },
    "rotDounut":      { file: "models/rot_dounut2.json",        eyeDist: 4 }
//sofa:           { file: "modelsz/sofa4q.jsonz",           eyeDist: 4    },
//triCornerOut:   { file: "modelsz/triCornerOut4.jsonz",    eyeDist: 6.95 },
  //  squashSofa:     { file: "models/squashSofa5q.json",     eyeDist: 2.78 }, // confusing, sickening
  //  squarePita:     { file: "models/squrePita5q.json",      eyeDist: 3    }, // ugly
} // icons color FFFBE5

var ViewPoint = { Outside:0, Inside:1, FirstPerson:2 }
 
var levels = [
  //  { worldModel: "rotDounut", numPlayers: 2, ai:1, icon:null },
    { worldModel: "cube",      numPlayers: 2, ai:1, icon:"img/m_cube.png" },      // level 1
    { worldModel: "dblsofa",   numPlayers: 4, ai:1, icon:"img/m_dbl_sofa.png" },  // 2
    { worldModel: "tetra",     numPlayers: 3, ai:2, icon:"img/m_tetra.png" },     // 3
    { worldModel: "triCorner", numPlayers: 4, ai:2, icon:"img/m_triCorner.png" }, // 4
    { worldModel: "dDiamond",  numPlayers: 4, ai:3, icon:"img/m_diamond.png" },   // 5
    { worldModel: "cube",      numPlayers: 3, ai:3, view:ViewPoint.Inside, icon:"img/m_inside_cube.png" }, // level 6
    { worldModel: "plus",      numPlayers: 4, ai:4, icon:"img/m_plus.png" }, // 7
    { worldModel: "torus",     numPlayers: 3, ai:4, icon:"img/m_torus.png" }, // 8
    { worldModel: "softsofa",  numPlayers: 5, ai:5, icon:"img/m_softsofa.png" }, // 9
    { worldModel: "mobius",    numPlayers: 3, ai:5, icon:"img/m_mobius.png" } // 10
];



// constants that never change throughout the game
var gameConf = {
    userIndex: 0,     // which one of the players is the user. set to -1 to have all players AI
    disableDeath: false,   // no one dies on collision
    disableEndLevel: false,
    debug: false,     // enable debug features - manual movement
    printFps: false,
    
    preloadFirst: 1,    // how many worlds to load and process when the game starts
    preloadBatch: 3,    // how many worlds to load and process after each batch is over
    version: "0.4." + BUILD_NUMBER  // version of code base of the game. update every major release.
}


function Game() {
    this.currentLevelNum = 0;
    this.currentLevel = null; // a reference to the actual level from levels (or a custom generated one)
    this.userLivesCount = 3;
    this.isDemo = false; // demo is when the game plays itself.
    this._paused = 0;     // the number of pauses - if 0, not paused. not meant for outside consumption. use isPaused(), setPaused()
    this._startPause = false; // true in the first pause of the life, before the player starts to move
    
    var cookieSnd = null //$.cookie("enableSound");
    this.soundEnabled = (cookieSnd !== null)?(cookieSnd === 'true'):true; // if it existed
}

// global game variables having to do with the game mechanics 
var game = new Game();

// Terminology:
//   A game lasts from when the player starts with 3 lives till he runs out of lives
//   A life is one run of a world in a single level
//   'world' lives only for a single life
// the game instance is a singleton that gets initialized in startGame.
// before the game starts is hold parameters for the next game, like soundEnable


// from user input controls - have nested pauses for when you press Esc after pressing P
Game.prototype.setPaused = function(isPaused)
{
    if (isPaused) 
        ++this._paused;
    else {
        if (this._paused > 0)
            --this._paused;
    }
    
    if (this._startPause && this._paused === 0) { // first unpause
        this._startPause = false;
        c2d.removeMessage(C2d.MSGID_START_ARROWS);
    }
    if (!this._startPause) {
        if (this._paused > 0)
            c2d.addMessage("paused", C2d.MSGID_PAUSE);
        else
            c2d.removeMessage(C2d.MSGID_PAUSE);
    }
        
    lastAnimTime = new Date().getTime(); // animation time
    writeDebug("pause: " + this._paused);
}

// internal game usage needs non-relative control
Game.prototype.setAbsPaused = function(isPaused) {
    this._paused = isPaused?1:0;
    lastAnimTime = new Date().getTime(); // animation time
}

Game.prototype.isPaused = function() {
    return (this._paused > 0);
}

Game.prototype.enableSound = function(isEnabled)
{
    this.soundEnabled = isEnabled;
   //TBD $.cookie("enableSound", isEnabled, { expires: 14 }); // hold for 2 weeks
}


// start receiving input for play
function startGameControls()
{
    setupGameInput(canvas, canvas2d);
}

function startGame(at)
{
    game.currentLevelNum = 0;
    game.userLivesCount = 3;
    startLife(at?at:0);
}



// at the end of a life either userDead or userWinLevel are called.
// these handles mainly put on the screen after the end of the level
// there needs to be only one such call in a life
// the handler is called after the explosion
var levelCompleted = { handler: null, called: false }

// end one run of the game (a single life of the user)
function userDead() {
    levelCompleted.called = true;

    world.staticDraw.lives.startDeath();
    writeDebug("lives remaining: " + game.userLivesCount);
    
    // don't pause. let the game continue until there is only one left
    if (game.userLivesCount > 0)
        c2d.lifeEndScreen(game.currentLevel, game.currentLevelNum);
    else
        c2d.gameOverScreen(game.currentLevel, game.currentLevelNum);
}

function userWinLevel() {
    levelCompleted.called = true;
    if (gameConf.disableEndLevel)
        return;
    
    // don't allow the user to continue and explode
    game.setAbsPaused(true); 
    c2d.levelComplete(game.currentLevelNum, game.currentLevel);
}


function removePlayer(player, collide)
{
    // every kill generates an explosion
    startExplosion(player, collide);
    playCrashSound(player);
    showDeathLog(player, collide);

    if (gameConf.disableDeath)
        return;
    
    player.curStepFrac = 1; // complete the last step for the explosion to apper in the right place
    player.wall.deathEnd(player);
    player.alive = false;
        
    queueWallDecent(player); // to happen after due delay
    
    // check win loose situation
    if (player === userPlayer) {
        --game.userLivesCount;
        if (levelCompleted.called === false)
            levelCompleted = { handler: userDead, called: false };
    }
    else { // somebody else died
        var alive = 0;
        for(var i = 0; i < players.length; ++i) {
            if (players[i].alive)
                ++alive;
        }
        if (alive === 1 && levelCompleted.called === false)
            levelCompleted = { handler: userWinLevel, called: false };
    }
    
}


function showDeathLog(player, collide) {
    var msg;

    if (collide >= 100) { // bike to wall collision
        var collideId = collide-100;
        if (collideId === player.id) // collide with self
            msg = player.prettyName() + " collided with its own wall";
        else
            msg = player.prettyName() + " collided with wall of " + players[collideId].prettyName();
    }
    else {
        var collideId = collide;
        msg = player.prettyName() + " collided with " + players[collideId].prettyName();
    }
    // no bike to bike collision. the other bike may still move away
    // b2b generates 2 explosions which is ok for now.

    c2d.addMessage(msg);
    writeDebug(msg + " on " + player.point);

}


// select a random point, check that its neighborhood is free
// return an array with the selected point as the first element and all the neighbors
// if not found return an array with just null
function randomFreePoint() {
    var pnt, free, iter = 0, nl;
    do {
        if (iter++ > 10)
            return [ null ];
        pnt = randomInt(0, world.model.vtx.length - 1);
        if (world.map.get(pnt) !== undefined)
            continue;
        nl = world.model.nei[pnt].t;
        free = true;
        for(var ni in nl) {
            free |= (world.map.get(nl[ni]) === undefined) // can be 0 if its player 0
        }
    } while(!free);
    
    var ret = [pnt];
    for(var ni in nl)
        ret.push(nl[ni]);
    
    return ret;
}


/////////////////////////////////////////////////// sound /////////////////////////////////////////////////////////////////

// create all Audio instances in advace to not generate GETs for the src for every time it plays
// even though it is cached it still takes time
function SoundMixer(elem, numChan) {
    this.numChannels = numChan;
    this.curChannel = 0;
    this.players = [];
    this.players[0] = elem
    for(var i = 0; i < this.numChannels; ++i) {
        var pl = new Audio();
        pl.onerror = function(e) { 
           writeDebug("  SND ERROR" + e.currentTarget.error.code) 
        }       
        pl.src = elem.currentSrc;
        pl.load();
 
        this.players[i] = pl;
    }
    
}

// play a sound from the <audio> element with type 'id'
SoundMixer.prototype.play = function(volume) {
    var curPlayer = this.players[this.curChannel];
    this.curChannel = (this.curChannel + 1) % this.numChannels;
    if (volume !== curPlayer.volume)
        curPlayer.volume = volume

   // curPlayer.currentTime = 0;
    curPlayer.play();
}

var soundMix = null;


function initSounds() {
    soundMix = {}
    soundMix.turn = new SoundMixer(turnSound1, 5);
    soundMix.start = new SoundMixer(powerupSound, 1);
    soundMix.crash = new SoundMixer(crashSound, 2);
    soundMix.bonus = new SoundMixer(coinUp, 1);
}

// 'left' - true if turning left, false if turning right
function playTurnSound(left) {
    if (!game.soundEnabled)
        return;

   // var sc = left?1:2; 
    soundMix.turn.play(1);
};

function playStartSound() {
    if (!game.soundEnabled)
        return;
    soundMix.start.play(0.4);
}


function playCrashSound(player) {
    if (!game.soundEnabled)
        return;
    var volume = (player === userPlayer)?1:0.2;
    soundMix.crash.play(volume);
}

function playBonusSound(player) {
    if (!game.soundEnabled)
        return;
    var volume = (player === userPlayer)?1:0.2;
    soundMix.bonus.play(volume);
}


    //writeDebug("turn");
/*    var snd = $("#turnSound" + pooledPlayer)[0];
    snd.currentTime = 0;
    snd.play();
    
    pooledPlayer = (pooledPlayer + 1)%4;*/



