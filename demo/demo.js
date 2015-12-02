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

 var currentFlip = true;

 var rotationTime = 30; // seconds
 var heightDifference = .2; // of model height
 var opacityDifference = .05;
 var opacityCycle = .005; // lower == slower
 var oscillateOpacity = true;

 var reset = true;

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

 function computeOffsets() {

 }

 function snapshot() {
   context.drawImage(video, 0, 0, canvas.width, canvas.height);
   imageData = context.getImageData(0, 0, canvas.width, canvas.height);
 };

 function createRenderers() {

   renderer3 = new THREE.WebGLRenderer({
     antialiasing: true,
     stencil: true
   });
   console.log("does GL have stencil buffer?");
   console.log(renderer3.context.getContextAttributes());
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

 function updateOpacity() {
   if (oscillateOpacity) {
     var newVal = currentOpacity + (opacityDifference * Math.sin(new Date().getTime() * opacityCycle));
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
   console.log(currentScale);
   console.log(mesh.rotation);
   console.log(mesh.position);


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

     updateObject(model, pose.bestRotation, pose.bestTranslation);
     updatePose("pose1", pose.bestError, pose.bestRotation, pose.bestTranslation);
     updatePose("pose2", pose.alternativeError, pose.alternativeRotation, pose.alternativeTranslation);

     updateOpacity();
     //step += 0.005;

     //model.rotation.z -= step;
   }

   texture.children[0].material.map.needsUpdate = true;
 };

 function updateObject(object, rotation, translation) {
   var rotX = -Math.asin(-rotation[1][2]);
   var rotY = -Math.atan2(rotation[0][2], rotation[2][2]);
   var rotZ = Math.atan2(rotation[1][0], rotation[1][1]);

   if (reset) {
     object.rotation.x = rotX;
     object.rotation.y = rotY;
     object.rotation.z = rotZ;
     object.position.x = translation[0];
     object.position.y = translation[1];
     object.position.z = translation[2];
     reset = false;
   } else {
     if (rotX < 0 && object.rotation.x < 0 || rotX > 0 && object.rotation.x > 0) {
       object.rotation.x = (rotX + object.rotation.x) / 2;;
     } else {
       object.rotation.x = rotX;
     }

     if (rotY < 0 && object.rotation.y < 0 || rotY > 0 && object.rotation.y > 0) {
       object.rotation.y = (rotY + object.rotation.y) / 2;
     } else {
       object.rotation.y = rotY;
     }

     if (rotZ < 0 && object.rotation.z < 0 || rotZ > 0 && object.rotation.z > 0) {
       object.rotation.z = (rotZ + object.rotation.z) / 2;;
     } else {
       object.rotation.z = rotZ;
     }

     object.position.x = (translation[0] + object.position.x) / 2;
     object.position.y = (translation[1] + object.position.y) / 2;
     object.position.z = (-translation[2] + object.position.z) / 2;
   }
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