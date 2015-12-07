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

var hologram; 
var holoRenderer;

function onLoad() {
 // video = document.getElementById("video");
  hologram = new HologramModel();
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
  holoRenderer = new HologramRenderer(hologram, container, video, container.offsetWidth, container.offsetHeight);

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

  context.drawImage(video, 0,0,canvas.width, canvas.height);
  imageData = context.getImageData(0,0,canvas.width,canvas.height);
  /*
   Webcam.snap( function(data_uri){
    //console.log(data_uri);
    
    pixelUtil.fetchImageData(data_uri).then(function(data){
      imageData = data;
    });
*/
/*
    pixelUtil.fetchImageData("../sample_photos/IMG_4115.JPG").then(function(data){
      imageData = data;
    });
    */

  //});
};

function setMissingState(missing){
  hologram.setMissingState(missing);
  holoRenderer.setMissingState(missing);
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

  setMissingState(hasTarget);

  if (showModel){
    hologram.updateObject(poseFilter.getLastRotation(), poseFilter.getLastPosition());
    hologram.updateMaterial();
  }
  //texture.children[0].material.map.needsUpdate = true;
  holoRenderer.updateVideo();
};

  this.loadSTLFromFile = function(buffer) {
    console.log(this);
    hologram.loadedGeometry = loadStl(buffer);
    hologram.loadedGeometry.computeBoundingBox();
    hologram.setScale(1);
    hologram.updateModelGeometry();
  }

window.onload = onLoad;