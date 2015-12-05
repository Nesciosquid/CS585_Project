/* Returns the the radian value of the specified degrees in the range of (-PI, PI] */
function degToRad(degrees) {
    var res = degrees / 180 * Math.PI;
    return res;
}

/* Returns the radian value of the specified radians in the range of [0,360), to a precision of four decimal places.*/
function radToDeg(radians) {
    var res = radians * 180 / Math.PI;
    return res;
}