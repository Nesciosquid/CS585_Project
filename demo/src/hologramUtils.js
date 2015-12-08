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

// From http://stackoverflow.com/questions/8869403/drag-drop-json-into-chrome
function DnDFileController(selector, onDropCallback) {
  var el_ = document.querySelector(selector);

  this.dragenter = function(e) {
    e.stopPropagation();
    e.preventDefault();
    el_.classList.add('dropping');
  };

  this.dragover = function(e) {
    e.stopPropagation();
    e.preventDefault();
  };

  this.dragleave = function(e) {
    e.stopPropagation();
    e.preventDefault();
    //el_.classList.remove('dropping');
  };

  this.drop = function(e) {
    e.stopPropagation();
    e.preventDefault();

    el_.classList.remove('dropping');

    onDropCallback(e.dataTransfer.files, e);
  };

  el_.addEventListener('dragenter', this.dragenter, false);
  el_.addEventListener('dragover', this.dragover, false);
  el_.addEventListener('dragleave', this.dragleave, false);
  el_.addEventListener('drop', this.drop, false);
};

function setupDragAndDropLoad(selector, callback) {
  var dnd = new DnDFileController(selector, function(files) {
    var f = files[0];

    var reader = new FileReader();
    reader.addEventListener("load", function(e) {
      var buffer = e.target.result;
      callback(buffer);
    });
    try {
      reader.readAsArrayBuffer(f);
    } catch (err) {
      console.log("unable to load JSON: " + f);
    }
  });
}