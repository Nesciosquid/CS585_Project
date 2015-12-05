var video, canvas, context, imageData, detector, posit;
var renderer3;
var scene3, scene4, scene5;
var camera3, camera4;
var renderingContext;
var bgComposer, modelComposer, maskComposer;
var model, texture;
var step = 0.0;
var loadedGeometry;
var loadedBoundingBox;

var currentScale = 1.0;
var currentOpacity = .7;
var currentHeight = 50;
var currentRotation = [0,0,0];

var currentColor = 0x81D4FA;
var missingColor = 0xB39DDB;

var currentFlip = false;
var rotationTime = 30; // seconds
var heightDifference = .2; // of model height
var opacityMissing = .4;
var opacityLocked = .05;
var opacityDifference = opacityLocked;
var opacityMissingCycle = .015;
var opacityLockedCycle = .005;
var opacityCycle = opacityLockedCycle; // lower == slower
var oscillateOpacity = true;

var estimationCertainty = 1;

var rotationalVariance = degToRad(1); // radians
var translationalVariance = 2; // pixels

var systemRotationalVariance = 0; // radians
var systemTranslationalVariance = 0; // radians

var lastPosition = [0,0,0];
var lastRotation = [0,0,0];

var filmPass;
var filmPassStaticIntensity = .4;
var filmPassLineIntensity = .75;
var badTVPass;
var badTVPassSpeed = .025;
var badTVPassSpeedMax = .05;
var badTVPassMinDistortion = 1.5;
var badTVPassMaxDistortion = 10;
var shaderTime = 0;

var markSize = 33.0; //millimeters
/*
var markerPositions = {
                        0: [0, 0,0],
                        1: [-5.5/6,0,0],
                        2: [-5.5/6,-2.5/6,0],
                        3: [5.5/6, 00,],
                        4: [5.5/6, -2.5/6,0]
                        };
                        
var markerSizes = {0: 1, 1: 3/6, 2: 3/6, 3: 3/6, 4: 3/6};
*/

var markerPositions = {
                        0: [0,0,0],
                        1: [-30.25,13.75,0],
                        2: [-30.25, -13.75,0],
                        3: [30.25, 13.75,0],
                        4: [30.25, -13.75, 0]
                        };

var smallMarks = {
  1: true,
  2: true,
  3: true,
  4: true
}
                        
var markerSizes = {0: markSize, 1: markSize/2, 2: markSize/2, 3: markSize/2, 4: markSize/2};

var poseFilter;
var rotXFilter;
var rotYFilter;
var rotXFilter;
var transXFilter;
var transYFilter;
var transZFilter;

var reset = true;
var hasTarget = false;

var lastPose = null;

var targetModel = "./models/owl_35mm.stl";

var hologramMaterial = new THREE.MeshLambertMaterial({
  color: 0x73DCFF,
  transparent: true,
  opacity: .8,
  depthTest: true,
  depthWrite: true,
  emissive: 0x111111
});

function getRotationParams(rotation) {
  var rotX = -Math.asin(-rotation[1][2]);
  var rotY = -Math.atan2(rotation[0][2], rotation[2][2]);
  var rotZ = Math.atan2(rotation[1][0], rotation[1][1]);
  return [rotX, rotY, rotZ];
}

function setXRotation(angle){
  currentRotation[0] = degToRad(angle);
  updateRotation();
}

function setYRotation(angle){
  currentRotation[1] = degToRad(angle);
  updateRotation();
}

function setZRotation(angle){
  currentRotation[2] = degToRad(angle);
  updateRotation();
}

function setRotation(rotation){
  currentRotation = rotation;
  updateRotation();
}

function updateRotation(){
  setupModelMesh();
}

function onLoad() {
  video = document.getElementById("video");
  canvas = document.getElementById("canvas");
  context = canvas.getContext("2d");
  renderingContext = canvas.getContext("webgl", {
    stencil: true
  });
  Webcam.set({
        width: 1280,
        height: 720,
        image_format: 'jpeg',
        jpeg_quality: 90
      });
  Webcam.attach("#myCamera")
  video = document.getElementById("myCamera").childNodes[1];

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

function init() {

  detector = new AR.Detector();
  posit = new POS.Posit(markSize, canvas.width);
  positSmall = new POS.Posit(markSize/2, canvas.width);
  poseFilter = new PoseFilter();

  createRenderers();
  createScenes();

  requestAnimationFrame(tick);
};

function setFlip(flip) {
  currentFlip = flip;
  updateFlip();
}

function updateFlip() {
  setupModelMesh();
}

function tick() {
  requestAnimationFrame(tick);

  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    snapshot();

    if (imageData){
        var markers = detector.detect(imageData);
        updateScenes(markers);

        shaderTime +=.1;

        filmPass.uniforms[ "time" ].value = shaderTime;
        badTVPass.uniforms[ "time" ].value = shaderTime;

        render();
    }
  }
};

function snapshot() {
   Webcam.snap( function(data_uri){
    console.log(data_uri);
    
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

function createRenderers() {

  renderer3 = new THREE.WebGLRenderer({
    antialiasing: true,
    stencil: true
  });
  renderer3.setClearColor(0xffffff, 1);
  renderer3.setSize(canvas.width, canvas.height);

  document.getElementById("container").appendChild(renderer3.domElement);

  scene3 = new THREE.Scene();
  camera3 = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5);
  scene3.add(camera3);

  scene4 = new THREE.Scene();
  camera4 = new THREE.PerspectiveCamera(40, canvas.width / canvas.height, 1, 1000);
  scene4.add(camera4);
  var lights = [];
  lights[0] = new THREE.PointLight(0x888888, 1, 0);
  lights[1] = new THREE.PointLight(0x888888, 1, 0);
  lights[2] = new THREE.PointLight(0x888888, 1, 0);

  lights[0].position.set(0, 200, 0);
  lights[1].position.set(100, 200, 100);
  lights[2].position.set(-100, -200, -100);

  scene4.add(lights[0]);
  scene4.add(lights[1]);
  scene4.add(lights[2]);

  // From: http://www.airtightinteractive.com/2013/02/intro-to-pixel-shaders-in-three-js/
  // postprocessing


  var rtParameters = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat, stencilBuffer: true };

  bgComposer = new THREE.EffectComposer(renderer3, new THREE.WebGLRenderTarget(canvas.width * 2, canvas.height * 2, rtParameters ));
  modelComposer = new THREE.EffectComposer(renderer3);
  maskComposer = new THREE.EffectComposer(renderer3);

  var renderVideoPass = new THREE.RenderPass(scene3, camera3);
  renderVideoPass.clear = true;

  var renderModelPass = new THREE.RenderPass(scene4, camera4);
  renderModelPass.clear = false;

  var maskPass = new THREE.MaskPass(scene4, camera4);
  var clearMaskPass = new THREE.ClearMaskPass();

  filmPass = new THREE.FilmPass();
  filmPass.uniforms[ "sCount" ].value = 600;
  filmPass.uniforms[ "sIntensity" ].value = filmPassLineIntensity;
  filmPass.uniforms[ "nIntensity" ].value = filmPassStaticIntensity;
  filmPass.uniforms[ "grayscale" ].value = false;

  var copyPass = new THREE.ShaderPass(THREE.CopyShader);
  copyPass.renderToScreen = true;

  badTVPass = new THREE.ShaderPass(THREE.BadTVShader);
  badTVPass.uniforms[ "tDiffuse" ].value = null;
  badTVPass.uniforms[ "time" ].value =  0.1;
  badTVPass.uniforms[ "distortion" ].value = 0.1;
  badTVPass.uniforms[ "distortion2" ].value = badTVPassMinDistortion;
  badTVPass.uniforms[ "speed" ].value = badTVPassSpeed;
  badTVPass.uniforms[ "rollSpeed" ].value = 0;

  //bgComposer.addPass(maskPass);
  bgComposer.addPass(renderVideoPass);
  bgComposer.addPass(renderModelPass);
  bgComposer.addPass(maskPass);
  bgComposer.addPass(filmPass);
  bgComposer.addPass(badTVPass);
  bgComposer.addPass(clearMaskPass);
  bgComposer.addPass(copyPass);

};

function render() {
  renderer3.autoClear = false;
  //renderer3.render(scene3, camera3);
  bgComposer.render();
  //renderer3.render(scene4, camera4);
};

function createScenes() {

  texture = createTexture();
  scene3.add(texture);

  model = createModel();
  debugObjects = {};

  scene4.add(model);
};

function createTexture() {
  var texture = new THREE.Texture(video);
  texture.minFilter = THREE.LinearFilter;
  var object = new THREE.Object3D();
  var geometry = new THREE.PlaneGeometry(1.0, 1.0, 0.0);
  var material = new THREE.MeshBasicMaterial({
    map: texture,
    depthTest: false,
    depthWrite: false
  });
  var mesh = new THREE.Mesh(geometry, material);

  object.position.z = -1;

  object.add(mesh);

  return object;
};

function setupModelMesh() {
  if (model != null) {
    setupHologramMesh(model.children[0]);
  }
}

function setHeight(height) {
  if (height > 0) {
    currentHeight = height;
    updateHeight();
  }
}

function updateHeight() {
  setupModelMesh();
}

function setScale(scale) {
  if (scale > 0) {
    currentScale = scale;
    updateScale();
  } else {
    console.log("Invalid scaling factor: " + scale);
  }
}

function updateScale() {
  setupModelMesh();
}

function updateMaterial(){
  updateOpacity();
  updateColor();
}

function updateColor(){
  if (hasTarget){
    hologramMaterial.color.setHex(currentColor);
  } else {
    hologramMaterial.color.setHex(missingColor);
  }
}

function updateOpacity() {
  if (hasTarget){
    badTVPass.uniforms[ "distortion2" ].value = badTVPassMinDistortion;
    badTVPass.uniforms[ "speed" ].value = badTVPassSpeed;

    opacityDifference = opacityLocked;
    opacityCycle = opacityLockedCycle;
  } else {
    badTVPass.uniforms[ "distortion2" ].value = badTVPassMaxDistortion;
    badTVPass.uniforms[ "speed" ].value = badTVPassSpeedMax;

    opacityDifference = opacityMissing;
    opacityCycle = opacityMissingCycle;
  }
  if (oscillateOpacity) {
    var newVal;
    var diff = opacityDifference * Math.sin(new Date().getTime() * opacityCycle);
    if (!hasTarget && diff > 0){
      newVal = currentOpacity - diff;
    } else {
      newVal = currentOpacity + diff;
    }
    if (newVal < 0) {
      newVal = 0;
    } else if (newVal > 1) {
      newVal = 1;
    }
    hologramMaterial.opacity = newVal;
  } else {
    hologramMaterial.opacity = currentOpacity;
  }
}

function setOpacity(opacity) {
  if (opacity >= 0 && opacity <= 1) {
    currentOpacity = opacity;
    updateOpacity();
  } else {
    console.log("Invalid opacity value: " + opacity);
  }
}

function setupHologramMesh(mesh) {
  mesh.scale.set(1, 1, 1);
  mesh.position.set(0, 0, 0);
  mesh.rotation.set(currentRotation[0], currentRotation[1], currentRotation[2]);
  mesh.scale.multiplyScalar(currentScale);

  var heightOffset = 0;
  if(loadedGeometry){
    console.log(loadedGeometry.boundingBox);
    heightOffset = loadedGeometry.boundingBox.min.z * currentScale;
  }
  console.log(heightOffset);
  mesh.position.set(0, 0, 0);
  mesh.position.set(-1 / 7, 0, -heightOffset + currentHeight);
}

function updateModelGeometry() {
  var newObject = createModelFromGeometry(loadedGeometry);
  scene4.remove(model);
  model = newObject;
  model.matrixWorldNeedsUpdate = true;
  scene4.add(model);
  reset = true;
  //model.scale.set(5,5,5);
}

function createDebugObject(){
  var object = new THREE.Object3D(),
      geometry = new THREE.PlaneGeometry(1.0, 1.0, 0.0),
      material = new THREE.MeshNormalMaterial(),
      mesh = new THREE.Mesh(geometry, material);
  
  object.add(mesh);
  
  return object;
}

function createModelFromGeometry() {
  var object = new THREE.Object3D();

  var mesh = new THREE.Mesh(loadedGeometry, hologramMaterial);
  setupHologramMesh(mesh);

  object.add(mesh);
  return object;
}

function createModel() {
  var loader = new THREE.STLLoader();
  var object = new THREE.Object3D();
  var geo;
  loader.load(targetModel, function(geometry) {

    var mesh = new THREE.Mesh(geometry, hologramMaterial);
    setupHologramMesh(mesh);
    object.add(mesh);
  });
  return object;
}

function clearDebugObjects(){
  for (var id in debugObjects){
    var object = debugObjects[id];
    scene4.remove(object);
  }
}

function calculatePosePosition(markPose, id){
  var params = getRotationParams(markPose.bestRotation);
  var trans = markPose.bestTranslation;
  var transVec = new THREE.Vector3(trans[0], trans[1], trans[2]);
  var pivot = new THREE.Object3D();
  var ori = new THREE.Object3D();
  var offset = [0,0,0];
  if (markerPositions.hasOwnProperty(id)){
    offset = markerPositions[id];
  }
  pivot.position.set(offset[0], offset[1], offset[2]);
  //console.log(pivot.position);
  ori.add(pivot);
  ori.rotation.set(params[0], params[1], params[2]);
  ori.updateMatrixWorld();
  var vec = new THREE.Vector3();
  vec.setFromMatrixPosition(pivot.matrixWorld);
  //console.log(vec);
  transVec.sub(vec);

  return transVec;
}

function createBestPose(poses){
  var translations = new THREE.Vector3(0,0,0);
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
    translations.add(pos);
  }
  translations.multiplyScalar(1/poses.length);
  translations.toArray(poses[0][1].bestTranslation);
  return poses[0][1];
}

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

function fixRotation(newRotation, oldRotation){
  // TODO: should be using quaternions
  var xFix = fixSingleAxisRotation(newRotation[0], oldRotation[0]);
  var yFix = fixSingleAxisRotation(newRotation[1], oldRotation[1]);
  var zFix = fixSingleAxisRotation(newRotation[2], oldRotation[2]);
  return [xFix, yFix, zFix];
}

function fixSingleAxisRotation(newRotation, oldRotation){
  var min, max, diff, fixed;

  var diff = Math.abs(oldRotation - newRotation);
  if (diff >= Math.PI){
    if (newRotation > oldRotation){
      fixed = newRotation - (2*Math.PI);
    } else fixed = newRotation+ (2*Math.PI);
  } else fixed = newRotation;
  return fixed;
}

function updateScenes(markers) {
  var corners, corner, pose, i;
  var poses = [];

  if (markers.length > 0) {
    for (var i =0 ;i < 1; i ++){
      corners = markers[i].corners;

      for (j = 0; j < corners.length; j++) {
        corner = corners[j];
        corner.x = corner.x - (canvas.width / 2);
        corner.y = (canvas.height / 2) - corner.y;
      }
      var id = markers[i].id;
      var size = markSize;
      var pos = [0,0,0];
      if (markerSizes.hasOwnProperty(id)){
        var size = markerSizes[id];
        //console.log(size);
        //console.log(id);
        var pos = markerPositions[id];
      }

      var poseMaker;
      if (smallMarks.hasOwnProperty(id)){
        poseMaker = positSmall;
      }  else poseMaker = posit;
      var markPose = poseMaker.pose(corners, size, [pos[0], pos[1], pos[2]]);
      poses.push([markers[i].id, markPose]);
    }
    
    //createDebugObjects(poses);
    //pose = posit.pose(corners, markSize, [0,0,0]);
    pose = createBestPose(poses);

    if (!hasTarget) {
      hasTarget = true;
      var rotParams = getRotationParams(pose.bestRotation);
      poseFilter.initializePositionFilters(pose.bestTranslation);
      poseFilter.initializeRotationFilters(rotParams);
      
    }
  } else {
    hasTarget = false;
  }
  
  if (pose != null){
    var rotParams = getRotationParams(pose.bestRotation);

    poseFilter.updatePositions(pose.bestTranslation);
    poseFilter.updateRotations(rotParams);
   
    updateObject(model, poseFilter.getLastRotation(), poseFilter.getLastPosition());
    updatePose("pose1", pose.bestError, pose.bestRotation, pose.bestTranslation);
    updatePose("pose2", pose.alternativeError, pose.alternativeRotation, pose.alternativeTranslation);
    //var d = document.getElementById("filter");
    //d.innerHTML = " filtered: " + Math.round(filteredRot[0] * 180.0 / Math.PI) + ", " + Math.round(filteredRot[1] * 180.0 / Math.PI) + ", " + Math.round(filteredRot[2] * 180.0 / Math.PI) + "<br/>" + " diff: " + Math.round(rotDiff[0] * 180.0 / Math.PI) + ", " + Math.round(rotDiff[1] * 180.0 / Math.PI) + ", " + Math.round(rotDiff[2] * 180.0 / Math.PI);
  }
    updateMaterial();
  //step += 0.005;

  //model.rotation.z -= step;

  texture.children[0].material.map.needsUpdate = true;
};

function updateObject(object, rotation, translation) {

  object.rotation.x = rotation[0];
  object.rotation.y = rotation[1];
  object.rotation.z = rotation[2];

  object.position.x = translation[0];
  object.position.y = translation[1];
  object.position.z = -translation[2];
};

function updatePose(id, error, rotation, translation) {
  var yaw = -Math.atan2(rotation[0][2], rotation[2][2]);
  var pitch = -Math.asin(-rotation[1][2]);
  var roll = Math.atan2(rotation[1][0], rotation[1][1]);

  var d = document.getElementById(id);
  d.innerHTML = " error: " + error + "<br/>" + " x: " + (translation[0] | 0) + " y: " + (translation[1] | 0) + " z: " + (translation[2] | 0) + "<br/>" + " yaw: " + Math.round(-yaw * 180.0 / Math.PI) + " pitch: " + Math.round(-pitch * 180.0 / Math.PI) + " roll: " + Math.round(roll * 180.0 / Math.PI);
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