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


function createSingleParameterFilter(value, velocity, systemVariance) {
  var x_0 = $V([value, velocity]);
  var P_0 = $M([
    [estimationCertainty, 0],
    [0, estimationCertainty]
  ]);
  var F_k = $M([
    [1, 1],
    [0, 1]
  ]);
  var Q_k = $M([
    [systemVariance, 0],
    [0, systemVariance]
  ]);
  var KM = new KalmanModel(x_0, P_0, F_k, Q_k);
  return KM;
}

function createSingleParameterObservation(value, velocity, measurementVariance) {
  var z_k = $V([value, velocity]);
  var H_k = $M([
    [1, 0],
    [0, 1]
  ]);
  var R_k = $M([
    [measurementVariance, 0],
    [0, measurementVariance]
  ]);
  var KO = new KalmanObservation(z_k, H_k, R_k);
  return KO;
}

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

//from: http://stackoverflow.com/questions/25744984/implement-a-kalman-filter-to-smooth-data-from-deviceorientation-api
//from: https://github.com/itamarwe/kalman
function createKalmanFilter(pose) {
  var rotation = pose.bestRotation;
  var translation = pose.bestTranslation;

  var rotX = -Math.asin(-rotation[1][2]);
  var rotY = -Math.atan2(rotation[0][2], rotation[2][2]);
  var rotZ = Math.atan2(rotation[1][0], rotation[1][1]);

  var transX = translation[0];
  var transY = translation[1];
  var transZ = translation[2];

  var x_0 = $V([rotX, rotY, rotZ, transX, transY, transZ]);
  var P_0 = $M([
    [estimationCertainty, 0, 0, 0, 0, 0],
    [0, estimationCertainty, 0, 0, 0, 0],
    [0, 0, estimationCertainty, 0, 0, 0],
    [0, 0, 0, estimationCertainty, 0, 0],
    [0, 0, 0, 0, estimationCertainty, 0],
    [0, 0, 0, 0, 0, estimationCertainty]
  ]);
  var F_k = $M([
    [1, 0, 0, 0, 0, 0],
    [0, 1, 0, 0, 0, 0],
    [0, 0, 1, 0, 0, 0],
    [0, 0, 0, 1, 0, 0],
    [0, 0, 0, 0, 1, 0],
    [0, 0, 0, 0, 0, 1]
  ]);
  var Q_k = $M([
    [systemRotationalVariance, 0, 0, 0, 0, 0],
    [0, systemRotationalVariance, 0, 0, 0, 0],
    [0, 0, systemRotationalVariance, 0, 0, 0],
    [0, 0, 0, systemTranslationalVariance, 0, 0],
    [0, 0, 0, 0, systemTranslationalVariance, 0],
    [0, 0, 0, 0, 0, systemTranslationalVariance]
  ]);

  var KM = new KalmanModel(x_0, P_0, F_k, Q_k);
  return KM;
}

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

function createKalmanObservation(pose) {
  var rotation = pose.bestRotation;
  var translation = pose.bestTranslation;

  var rotX = -Math.asin(-rotation[1][2]);
  var rotY = -Math.atan2(rotation[0][2], rotation[2][2]);
  var rotZ = Math.atan2(rotation[1][0], rotation[1][1]);

  var transX = translation[0];
  var transY = translation[1];
  var transZ = translation[2];

  var z_k = $V([rotX, rotY, rotZ, transX, transY, transZ]);
  var H_k = $M([
    [1, 0, 0, 0, 0, 0],
    [0, 1, 0, 0, 0, 0],
    [0, 0, 1, 0, 0, 0],
    [0, 0, 0, 1, 0, 0],
    [0, 0, 0, 0, 1, 0],
    [0, 0, 0, 0, 0, 1]
  ]);
  var R_k = $M([
    [rotationalVariance, 0, 0, 0, 0, 0],
    [0, rotationalVariance, 0, 0, 0, 0],
    [0, 0, rotationalVariance, 0, 0, 0],
    [0, 0, 0, translationalVariance, 0, 0],
    [0, 0, 0, 0, translationalVariance, 0],
    [0, 0, 0, 0, 0, translationalVariance]
  ]);
  var KO = new KalmanObservation(z_k, H_k, R_k);
  return KO;
}

function updateKalmanModel(observation) {
  poseFilter.update(observation);
  var elements = poseFilter.x_k.elements;
  return elements;
}

function updateSingleParameterKalmanModel(filter, observation){
  filter.update(observation);
  var elements = filter.x_k.elements;
  return elements;
}

function onLoad() {
  video = document.getElementById("video");
  canvas = document.getElementById("canvas");
  context = canvas.getContext("2d");
  renderingContext = canvas.getContext("webgl", {
    stencil: true
  });

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
  navigator.getUserMedia({
      video: true
    },
    function(stream) {
      if (window.webkitURL) {
        video.src = window.webkitURL.createObjectURL(stream);
      } else if (video.mozSrcObject !== undefined) {
        video.mozSrcObject = stream;
      } else {
        video.src = stream;
      }
    },
    function(error) {}
  );

  detector = new AR.Detector();
  posit = new POS.Posit(markSize, canvas.width);
  positSmall = new POS.Posit(markSize/2, canvas.width);

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

    var markers = detector.detect(imageData);
    updateScenes(markers);

    render();
  }
};

function snapshot() {
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  imageData = context.getImageData(0, 0, canvas.width, canvas.height);
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

  var filmPass = new THREE.FilmPass();
  filmPass.uniforms[ "sCount" ].value = 600;
  filmPass.uniforms[ "sIntensity" ].value = .9;
  filmPass.uniforms[ "nIntensity" ].value = .5;
  filmPass.uniforms[ "grayscale" ].value = false;

  var copyPass = new THREE.ShaderPass(THREE.CopyShader);
  copyPass.renderToScreen = true;

  //bgComposer.addPass(maskPass);
  bgComposer.addPass(renderVideoPass);
  bgComposer.addPass(renderModelPass);
  bgComposer.addPass(maskPass);
  bgComposer.addPass(filmPass);
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
  var geometry = new THREE.PlaneBufferGeometry(1.0, 1.0, 0.0);
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
    opacityDifference = opacityLocked;
    opacityCycle = opacityLockedCycle;
  } else {
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
    for (var i =0 ;i < markers.length; i ++){
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
      poseFilter = createKalmanFilter(pose);
      var rotParams = getRotationParams(pose.bestRotation);
      rotXFilter = createSingleParameterFilter(rotParams[0], 0, systemRotationalVariance);
      rotYFilter = createSingleParameterFilter(rotParams[1], 0, systemRotationalVariance);
      rotZFilter = createSingleParameterFilter(rotParams[2], 0, systemRotationalVariance);
      transXFilter = createSingleParameterFilter(pose.bestTranslation[0], 0, systemTranslationalVariance);
      transYFilter = createSingleParameterFilter(pose.bestTranslation[1], 0, systemTranslationalVariance);
      transZFilter = createSingleParameterFilter(pose.bestTranslation[2], 0, systemTranslationalVariance);
    }
  } else {
    if (hasTarget){
      hasTarget = false;
      pose = lastPose;
    } 
  }

  if (pose != null){
    var obs = createKalmanObservation(pose);
    var filtered = updateKalmanModel(obs);
    var rotParams = getRotationParams(pose.bestRotation);
    var rotXVel;
    var rotYVel;
    var rotZVel;
    var transXVel;
    var transYVel;
    var transZVel;

    if (lastPose == null){
      rotXVel = 0;
      rotYVel = 0;
      rotZVel = 0;
      transXVel = 0;
      transYVel = 0;
      transZVel = 0;
    } else {
      rotXVel = rotParams[0] - lastRotation[0];
      rotYVel = rotParams[1] - lastRotation[1];
      rotZVel = rotParams[2] - lastRotation[2];
      transXVel = pose.bestTranslation[0] - lastPosition[0];
      transYVel = pose.bestTranslation[1] - lastPosition[1];
      transZVel = pose.bestTranslation[2] - lastPosition[2];
    }

    var rotParams = fixRotation(rotParams, lastRotation);

    var rotXObs = createSingleParameterObservation(rotParams[0], rotXVel, rotationalVariance);
    var rotXFiltered = updateSingleParameterKalmanModel(rotXFilter, rotXObs);

    var rotYObs = createSingleParameterObservation(rotParams[1], rotYVel, rotationalVariance);
    var rotYFiltered = updateSingleParameterKalmanModel(rotYFilter, rotYObs);

    var rotZObs = createSingleParameterObservation(rotParams[2], rotZVel, rotationalVariance);
    var rotZFiltered = updateSingleParameterKalmanModel(rotZFilter, rotZObs);

    var transXObs = createSingleParameterObservation(pose.bestTranslation[0], transXVel, translationalVariance);
    var transXFiltered = updateSingleParameterKalmanModel(transXFilter, transXObs);

    var transYObs = createSingleParameterObservation(pose.bestTranslation[1], transYVel, translationalVariance);
    var transYFiltered = updateSingleParameterKalmanModel(transYFilter, transYObs);

    var transZObs = createSingleParameterObservation(pose.bestTranslation[2], transZVel, translationalVariance);
    var transZFiltered = updateSingleParameterKalmanModel(transZFilter, transZObs);

    var rot = [obs.z_k.elements[0], obs.z_k.elements[1], obs.z_k.elements[2]];
    //var filteredRot = [filtered[0], filtered[1], filtered[2]];
    var filteredRot = [rotXFiltered[0], rotYFiltered[0], rotZFiltered[0]];

    var rotDiff = [rot[0] - filteredRot[0], rot[1] - filteredRot[1], rot[2] - filteredRot[2]];
    //var filteredTrans = [filtered[3], filtered[4], filtered[5]];
    var filteredTrans = [transXFiltered[0], transYFiltered[0], transZFiltered[0]];

    lastPose = pose; 
    lastRotation = filteredRot;
    lastPosition = filteredTrans;
    //console.log(filteredTrans);

    updateObject(model, filteredRot, filteredTrans);
    updatePose("pose1", pose.bestError, pose.bestRotation, pose.bestTranslation);
    updatePose("pose2", pose.alternativeError, pose.alternativeRotation, pose.alternativeTranslation);
    var d = document.getElementById("filter");
    d.innerHTML = " filtered: " + Math.round(filteredRot[0] * 180.0 / Math.PI) + ", " + Math.round(filteredRot[1] * 180.0 / Math.PI) + ", " + Math.round(filteredRot[2] * 180.0 / Math.PI) + "<br/>" + " diff: " + Math.round(rotDiff[0] * 180.0 / Math.PI) + ", " + Math.round(rotDiff[1] * 180.0 / Math.PI) + ", " + Math.round(rotDiff[2] * 180.0 / Math.PI);
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