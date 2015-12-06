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

var targetModel = "./models/owl_35mm.stl";

var hologramMaterial = new THREE.MeshLambertMaterial({
  color: 0x73DCFF,
  transparent: true,
  opacity: .8,
  depthTest: true,
  depthWrite: true,
  emissive: 0x111111
});

var holoRenderer;

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
  var container = document.getElementById("container");
  holoRenderer = new HologramRenderer(container);
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
  createRenderers();
  createScenes();

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

        shaderTime +=.1;

        filmPass.uniforms[ "time" ].value = shaderTime;
        badTVPass.uniforms[ "time" ].value = shaderTime;

        render();
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

function createRenderers() {

  renderer3 = new THREE.WebGLRenderer({
    antialiasing: true,
    stencil: true
  });
  renderer3.setClearColor(0xFFFFFF);
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
  modelComposer = new THREE.EffectComposer(renderer3, new THREE.WebGLRenderTarget(canvas.width * 2, canvas.height * 2, rtParameters ));
  sceneComposer = new THREE.EffectComposer(renderer3, new THREE.WebGLRenderTarget(canvas.width * 2, canvas.height * 2, rtParameters ));

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

  scrollPass = new THREE.ShaderPass(THREE.BadTVShader);
  scrollPass.uniforms[ "tDiffuse" ].value = null;
  scrollPass.uniforms[ "time" ].value =  0.1;
  scrollPass.uniforms[ "distortion" ].value = 0;
  scrollPass.uniforms[ "distortion2" ].value = 0;
  scrollPass.uniforms[ "speed" ].value = 0;
  scrollPass.uniforms[ "rollSpeed" ].value = .2;

  renderScene = new THREE.TexturePass(bgComposer.renderTarget2);
  renderModel = new THREE.TexturePass(modelComposer.renderTarget2);

  //bgComposer.addPass(maskPass);
  //bgComposer.addPass(renderVideoPass);
  //bgComposer.addPass(copyPass);
  //bgComposer.addPass(copyPass);
  //bgComposer.addPass(filmPass);
  //bgComposer.addPass(renderModelPass);

  //bgComposer.addPass(copyPass);

  //modelComposer.addPass(renderModelPass);
 // modelComposer.addPass(copyPass);

  //sceneComposer.addPass(renderScene);
  //sceneComposer.addPass(renderModel);
  //sceneComposer.addPass(copyPass);

  //modelComposer.addPass(filmPass);
  //modelComposer.addPass(scrollPass);
  //modelComposer.addPass(renderModelPass);
  //modelComposer.addPass(copyPass);

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
  //bgComposer.render();
  //amodelComposer.render();
  //renderer3.render(scene4, camera4);
  bgComposer.render();
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
    //console.log(loadedGeometry.boundingBox);
    heightOffset = loadedGeometry.boundingBox.min.z * currentScale;
  }
  //console.log(heightOffset);
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
    updateObject(model, poseFilter.getLastRotation(), poseFilter.getLastPosition());
    updateMaterial();
  }
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