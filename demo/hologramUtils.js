var fixRotation = function(newRotation, oldRotation){
	  // TODO: should be using quaternions
	  var xFix = fixSingleAxisRotation(newRotation[0], oldRotation[0]);
	  var yFix = fixSingleAxisRotation(newRotation[1], oldRotation[1]);
	  var zFix = fixSingleAxisRotation(newRotation[2], oldRotation[2]);
	  return [xFix, yFix, zFix];
}

var fixSingleAxisRotation = function(newRotation, oldRotation){
  var min, max, diff, fixed;

  var diff = Math.abs(oldRotation - newRotation);
  if (diff >= Math.PI){
    if (newRotation > oldRotation){
      fixed = newRotation - (2*Math.PI);
    } else fixed = newRotation+ (2*Math.PI);
  } else fixed = newRotation;
  return fixed;
}

var getRotationParams = function(poseRotation) {
  var rotX = -Math.asin(-poseRotation[1][2]);
  var rotY = -Math.atan2(poseRotation[0][2], poseRotation[2][2]);
  var rotZ = Math.atan2(poseRotation[1][0], poseRotation[1][1]);
  return [rotX, rotY, rotZ];
}