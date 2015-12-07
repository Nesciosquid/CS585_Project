var video, canvas, context, imageData, detector, posit;

var currentScale = 1.0;
var currentOpacity = .7;
var currentHeight = 50;
var currentRotation = [0,0,0];

var currentColor = 0x81D4FA;
var missingColor = 0xB39DDB;

var rotationTime = 30; // seconds
var heightDifference = .2; // of model height
var opacityMissing = .4;
var opacityLocked = .05;
var opacityDifference = opacityLocked;
var opacityMissingCycle = .015;
var opacityLockedCycle = .005;
var opacityCycle = opacityLockedCycle; // lower == slower
var oscillateOpacity = true;

var filmPass;
var filmPassStaticIntensity = .4;
var filmPassLineIntensity = .5;
var badTVPass;
var badTVPassSpeed = .025;
var badTVPassSpeedMax = .05;
var badTVPassMinDistortion = 1.5;
var badTVPassMaxDistortion = 10;
var shaderTime = 0;

var tracker;                
var reset = false;

var hasTarget = false;
var showModel = false;


var holoRenderer;

function onLoad() {
 // video = document.getElementById("video");
  canvas = document.getElementById("canvas");
  context = canvas.getContext("2d");
  var container = document.getElementById("container");

  Webcam.set({
        width: 1280,
        height: 720,
        image_format: 'jpeg',
        jpeg_quality: 90
      });
  Webcam.attach("#myCamera")

  video = document.getElementById("myCamera").childNodes[1];
  holoRenderer = new HologramRenderer(container, video, 1280, 720);

  canvas.width = parseInt(canvas.style.width);
  canvas.height = parseInt(canvas.style.height);

  setupDragAndDropLoad("#canvas", loadSTLFromFile);
  setupDragAndDropLoad("#container", loadSTLFromFile);

  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
  if (navigator.getUserMedia) {
    init();
  }

  /*
  var opa = document.getElementById("opacitySlider");
  opa.oninput = function(){
    setOpacity(parseFloat(opa.value));
  };
  */
  currentHeight = 50;
};

function setupTracker(width, height){
  tracker = new MarkerTracker(width, height);

  // For five-marker pattern. */
  tracker.createMarker(0, 33, [0,0,0], [0,0,0]);
  tracker.createMarker(1, 33/2, [-30.25, 13.75, 0], [0,0,0]);
  tracker.createMarker(2, 33/2, [-30.25, -13.75, 0], [0,0,0]);
  tracker.createMarker(3, 33/2, [-30.25, -13.75, 0], [0,0,0]);
  tracker.createMarker(4, 33/2, [-30.25, -13.75, 0], [0,0,0]);

  // For two-marker pattern. */
  tracker.createMarker(5, 35.75, [23.375, 0, 0], [0,0,0]);
  tracker.createMarker(6, 44, [-19.25, 0, 0], [0,0,0]);
}

function init() {

  detector = new AR.Detector();
  poseFilter = new PoseFilter();
  setupTracker(canvas.width, canvas.height);

  requestAnimationFrame(tick);
};

function tick() {
  requestAnimationFrame(tick);

  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    snapshot();

    if (imageData){
        var found = tracker.findMarkers(imageData);
        //updateScenes(markers);
        updateScenes(found);

        //render();
        this.holoRenderer.render();
    }
  }
};

function snapshot() {
   Webcam.snap( function(data_uri){
    //console.log(data_uri);
    
    pixelUtil.fetchImageData(data_uri).then(function(data){
      imageData = data;
    });
/*
    pixelUtil.fetchImageData("../sample_photos/IMG_4115.JPG").then(function(data){
      imageData = data;
    });
    */
  });
};

function createDebugObjects(poses){
  clearDebugObjects();
  for (var i =0 ;i < poses.length; i++){
    var pose = poses[i][1];
    var id = poses[i][0];
    var rot = getRotationParams(pose.bestRotation);
    var size = markSize;
    var pos = new THREE.Vector3(pose.bestTranslation[0], pose.bestTranslation[1], pose.bestTranslation[2]);
    if (markerSizes.hasOwnProperty(id)){
      size = markerSizes[id];
      pos = calculatePosePosition(pose, id);
    }
    //console.log(size);
    var obj;

    if (!debugObjects.hasOwnProperty(id)){
      obj = createDebugObject();
      obj.scale.x = size;
      obj.scale.y = size;
      obj.scale.z = size;
    } else {
      obj = debugObjects[id];
    }
    debugObjects[id] = obj;
    updateObject(obj, rot, [pos.x, pos.y, pos.z]);
    scene4.add(obj);
    }
}

function updateScenes(found) {
  if (found) {
    showModel = true;
    var data = tracker.getAllMarkerData();
    var average = getMarkerAverage(data);
    if (!hasTarget) {
      hasTarget = true;
      poseFilter.initializePositionFilters(average.position);
      poseFilter.initializeRotationFilters(average.rotation);
    }
    poseFilter.updatePositions(average.position);
    poseFilter.updateRotations(average.rotation);
  } else {
    hasTarget = false;
  }

  if (showModel){
    holoRenderer.updateObject(poseFilter.getLastRotation(), poseFilter.getLastPosition());
    holoRenderer.updateMaterial();
  }
  //texture.children[0].material.map.needsUpdate = true;
  holoRenderer.hasTarget = hasTarget;
  holoRenderer.updateVideo();
};

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

function loadSTLFromFile(buffer) {
  loadedGeometry = loadStl(buffer);
  loadedGeometry.computeBoundingBox();
  setScale(1);
  updateModelGeometry(loadedGeometry);
}

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

window.onload = onLoad;