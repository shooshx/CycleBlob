


function idget(id) {
    return document.getElementById(id);
}

/*
function strArr(a) {
    var s = sprintf("%.2f ", a[0]);
    for (var i = 1; i < a.length; ++i)
        s += sprintf("%.2f ", a[i]);
    return s;
}

function strVector(v) {
    return strArr(v.elements);
}*/

function randomInt(min, max) // inclusive both edges
{
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoise(percent)
{
    return (Math.random() < (percent/100.0))
}


function checkGLErrors(prefix)
{
    var err = gl.getError();
    if (err == gl.NO_ERROR)
        return;
    if (!checkGLErrors.codes)
    {
        checkGLErrors.codes = {};
        checkGLErrors.codes[gl.INVALID_ENUM] = "INVALID_ENUM";
        checkGLErrors.codes[gl.INVALID_VALUE] = "INVALID_VALUE";
        checkGLErrors.codes[gl.INVALID_OPERATION] = "INVALID_OPERATION";
        checkGLErrors.codes[gl.OUT_OF_MEMORY] = "OUT_OF_MEMORY";
    }
    
    alert( (prefix?(prefix+" "):"") + "WebGL error: " + err + " " + checkGLErrors.codes[err]);    
}


// return v1*frac + v2*(1-frac)
vec3.linearMix = function(v1, v2, frac, dest) {
    if (!dest) dest = vec3.create();
    var ofrac = 1-frac;
    dest[0] = v1[0]*frac + v2[0]*ofrac;
    dest[1] = v1[1]*frac + v2[1]*ofrac;
    dest[2] = v1[2]*frac + v2[2]*ofrac;
    return dest;
}

// scale and return a new copy
vec3.x = function(v, m) {
    var vt = vec3.create(v);
    return vec3.scale(vt, m);
}

// non destructive
vec3.ncross = function(v, v2) {
    var vt = vec3.create(v);
    return vec3.cross(vt, v2);
}

vec3.nsubtract = function(v1, v2) {
    var vt = vec3.create(v1);
    return vec3.subtract(vt, v2);
}

vec3.nadd = function(v1, v2) {
    var vt = vec3.create(v1);
    return vec3.add(vt, v2);
}


vec3.nadd3 = function(v1, v2) {
    var vt = vec3.create(v1);
    return vec3.add(vt, v2);
}

vec3.nnegate = function(v) {
    var vt = vec3.create(v);
    return vec3.negate(vt);
}

vec3.distance = function(a, b) {
    var x = a[0]-b[0], y = a[1]-b[1], z = a[2]-b[2];
    return Math.sqrt(x*x + y*y + z*z);
}

mat4.nidentity = function() {
    return mat4.identity(mat4.create());
}

function radFromDeg(da) {
    return da * Math.PI / 180;
}
function degFromRad(ra) {
    return ra * 180 / Math.PI;
}


/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 1].
 *
 * @param   Number  h       The hue
 * @param   Number  s       The saturation
 * @param   Number  l       The lightness
 * @return  Array           The RGB representation
 */
function hslToRgb(h, s, l){
    var r, g, b;

    if(s == 0){
        r = g = b = l; // achromatic
    }else{
        function hue2rgb(p, q, t){
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [r, g, b];
}


