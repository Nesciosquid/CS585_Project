fixRotation = function(newRotation, oldRotation){
	  // TODO: should be using quaternions
	  var xFix = fixSingleAxisRotation(newRotation[0], oldRotation[0]);
	  var yFix = fixSingleAxisRotation(newRotation[1], oldRotation[1]);
	  var zFix = fixSingleAxisRotation(newRotation[2], oldRotation[2]);
	  return [xFix, yFix, zFix];
}