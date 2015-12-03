var video, canvas, context, imageData, detector, posit;
var renderer3;
var scene3, scene4, scene5;
var camera3, camera4;
var renderingContext;
var bgComposer, modelComposer, maskComposer;
var model, texture;
var step = 0.0;
var loadedGeometry;

var currentScale = 1.0;
var currentOpacity = .85;
var currentHeight = 30;
var currentRotation = 0.0;

var currentColor = 0x73DCFF;
var missingColor = 0xEF5350;

var currentFlip = false;
var rotationTime = 30; // seconds
var heightDifference = .2; // of model height
var opacityMissing = .3;
var opacityLocked = .05;
var opacityDifference = opacityLocked;
var opacityMissingCycle = .015;
var opacityLockedCycle = .005;
var opacityCycle = opacityLockedCycle; // lower == slower
var oscillateOpacity = true;

var estimationCertainty = 1;

var rotationalVariance = 2 * 0.0174533; // radians
var translationalVariance = 2; // pixels

var systemRotationalVariance = 0 * .0174533; // radians
var systemTranslationalVariance = 0; // radians


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

var markSize = 40.0; //millimeters

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


  bgComposer = new THREE.EffectComposer(renderer3);
  modelComposer = new THREE.EffectComposer(renderer3);
  maskComposer = new THREE.EffectComposer(renderer3);

  var renderVideoPass = new THREE.RenderPass(scene3, camera3);
  renderVideoPass.clear = true;

  var renderModelPass = new THREE.RenderPass(scene4, camera4);
  renderModelPass.clear = false;

  var renderMaskPass = new THREE.RenderPass(scene5, camera4);
  renderMaskPass.clear = false;

  var copyPass = new THREE.ShaderPass(THREE.CopyShader);
  copyPass.renderToScreen = true;

  bgComposer.addPass(renderVideoPass);
  bgComposer.addPass(renderModelPass);
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
    console.log(currentColor);
    console.log(hologramMaterial.color);
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
  mesh.rotation.set(0, 0, 0);

  mesh.scale.multiplyScalar(currentScale);

  var box = new THREE.Box3().setFromObject(mesh);
  if (currentFlip) {
    mesh.rotation.set(Math.PI, 0, 0);
    mesh.position.set(0, 0, box.size().z);
  }
  mesh.position.set(-1 / 7, 0, mesh.position.z + currentHeight);
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

function updateScenes(markers) {
  var corners, corner, pose, i;

  if (markers.length > 0) {
    corners = markers[0].corners;

    for (i = 0; i < corners.length; ++i) {
      corner = corners[i];

      corner.x = corner.x - (canvas.width / 2);
      corner.y = (canvas.height / 2) - corner.y;
    }

    pose = posit.pose(corners);

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
      var lastRotParams = getRotationParams(lastPose.bestRotation);
      rotXVel = rotParams[0] - lastRotParams[0];
      rotYVel = rotParams[1] - lastRotParams[1];
      rotZVel = rotParams[2] - lastRotParams[2];
      transXVel = pose.bestTranslation[0] - lastPose.bestTranslation[0];
      transYVel = pose.bestTranslation[1] - lastPose.bestTranslation[1];
      transZVel = pose.bestTranslation[2] - lastPose.bestTranslation[2];
    }

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