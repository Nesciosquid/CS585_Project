var HologramRenderer = function(container) {
	this.container = container;

	console.log(this.container);

	var videoScene, modelScene;
	var renderer;
	var videoCamera, modelCamera;
	var bgComposer;
	var model;
	var loadedGeometry;

	var lights;

	var currentScale = 1.0;
	var currentOpacity = .7;
	var currentHeight = 50;
	var currentRotation = [0, 0, 0];

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

	var renderVideoPass;
	var renderModelPass;

	var filmPass;
	var filmPassStaticIntensity = .4;
	var filmPassLineIntensity = .5;

	var badTVPass;
	var badTVPassSpeed = .025;
	var badTVPassSpeedMax = .05;
	var badTVPassMinDistortion = 1.5;
	var badTVPassMaxDistortion = 10;

	var scrollPass;
	var renderModelPass;
	var renderScenePass;

	this.composerParameters = {
		minFilter: THREE.LinearFilter,
		magFilter: THREE.LinearFilter,
		format: THREE.RGBFormat,
		stencilBuffer: true
	}

	var hologramMaterial = new THREE.MeshLambertMaterial({
		color: 0x73DCFF,
		transparent: true,
		opacity: .8,
		depthTest: true,
		depthWrite: true,
		emissive: 0x111111
	});

	var shaderTime = 0;

	function setXRotation(angle) {
		this.currentRotation[0] = degToRad(angle);
		this.updateRotation();
	}

	function setYRotation(angle) {
		this.currentRotation[1] = degToRad(angle);
		this.updateRotation();
	}

	function setZRotation(angle) {
		this.currentRotation[2] = degToRad(angle);
		this.updateRotation();
	}

	function setRotation(rotation) {
		this.currentRotation = rotation;
		this.updateRotation();
	}

	function setupScenes() {
		this.videoScene = new THREE.Scene();
		this.videoCamera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5);
		this.videoScene.add(videoCamera);

		this.modelScene = new THREE.Scene();
		this.modelCamera = new THREE.PerspectiveCamera(40, canvas.width / canvas.height, 1, 1000);
		this.modelScene.add(modelCamera);

		this.lights[0] = new THREE.PointLight(0x888888, 1, 0);
		this.lights[1] = new THREE.PointLight(0x888888, 1, 0);
		this.lights[2] = new THREE.PointLight(0x888888, 1, 0);

		this.lights[0].position.set(0, 200, 0);
		this.lights[1].position.set(100, 200, 100);
		this.lights[2].position.set(-100, -200, -100);

		this.modelScene.add(lights[0]);
		this.modelScene.add(lights[1]);
		this.modelScene.add(lights[2]);
	}

	function updateRotation() {
		this.setupModelMesh();
	}

	function setupEffects() {
		this.renderVideoPass = new THREE.RenderPass(scene3, camera3);
		this.renderVideoPass.clear = false;

		this.renderModelPass = new THREE.RenderPass(scene4, camera4);
		this.renderModelPass.clear = false;

		this.maskPass = new THREE.MaskPass(scene4, camera4);
		this.clearMaskPass = new THREE.ClearMaskPass();

		this.filmPass = new THREE.FilmPass();
		this.filmPass.uniforms["sCount"].value = 600;
		this.filmPass.uniforms["sIntensity"].value = filmPassLineIntensity;
		this.filmPass.uniforms["nIntensity"].value = filmPassStaticIntensity;
		this.filmPass.uniforms["grayscale"].value = false;

		this.copyPass = new THREE.ShaderPass(THREE.CopyShader);
		this.copyPass.renderToScreen = true;

		this.badTVPass = new THREE.ShaderPass(THREE.BadTVShader);
		this.badTVPass.uniforms["tDiffuse"].value = null;
		this.badTVPass.uniforms["time"].value = 0.1;
		this.badTVPass.uniforms["distortion"].value = 0.1;
		this.badTVPass.uniforms["distortion2"].value = badTVPassMinDistortion;
		this.badTVPass.uniforms["speed"].value = badTVPassSpeed;
		this.badTVPass.uniforms["rollSpeed"].value = 0;

		this.scrollPass = new THREE.ShaderPass(THREE.BadTVShader);
		this.scrollPass.uniforms["tDiffuse"].value = null;
		this.scrollPass.uniforms["time"].value = 0.1;
		this.scrollPass.uniforms["distortion"].value = 0;
		this.scrollPass.uniforms["distortion2"].value = 0;
		this.scrollPass.uniforms["speed"].value = 0;
		this.scrollPass.uniforms["rollSpeed"].value = .2;

		this.renderScene = new THREE.TexturePass(bgComposer.renderTarget2);
		this.renderModel = new THREE.TexturePass(modelComposer.renderTarget2);
	}

	function render() {
		this.renderer.clear();
		this.bgComposer.render();
	}

	function setupRenderer() {
		this.renderer = new THREE.WebGLRenderer();
		this.renderer.autoClear = false;
		this.renderer.setClearColor(0xFFFFFF);
		this.container.appendChild(this.renderer.domElement);
	}

	function setup() {
		this.setupComposers();
		this.setupEffects();
	}

	function createNewComposer(rendererTarget) {
		return new THREE.EffectComposer(rendererTarget, new THREE.WebGLRenderTarget(canvas.width * 2, canvas.height * 2, this.composerParameters));
	}

	function setupComposers() {
		this.bgComposer = createNewComposer(this.container);
		this.bgComposer.addPass(renderVideoPass);
		this.bgComposer.addPass(renderModelPass);
		this.bgComposer.addPass(maskPass);
		this.bgComposer.addPass(filmPass);
		this.bgComposer.addPass(badTVPass);
		this.bgComposer.addPass(clearMaskPass);
		this.bgComposer.addPass(copyPass);
	}

	function createVideoPlane() {
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
			this.setupHologramMesh(this.model.children[0]);
		}
	}

	function setHeight(height) {
		if (height > 0) {
			this.currentHeight = height;
			this.updateHeight();
		}
	}

	function updateHeight() {
		this.setupModelMesh();
	}

	function setScale(scale) {
		if (scale > 0) {
			this.currentScale = scale;
			this.updateScale();
		} else {
			console.log("Invalid scaling factor: " + scale);
		}
	}

	function updateScale() {
		this.setupModelMesh();
	}

	function updateMaterial() {
		this.updateOpacity();
		this.updateColor();
	}

	function updateColor() {
		if (hasTarget) {
			this.hologramMaterial.color.setHex(currentColor);
		} else {
			this.hologramMaterial.color.setHex(missingColor);
		}
	}

	function updateOpacity() {
		if (this.hasTarget) {
			this.badTVPass.uniforms["distortion2"].value = this.badTVPassMinDistortion;
			this.badTVPass.uniforms["speed"].value = this.badTVPassSpeed;

			this.opacityDifference = this.opacityLocked;
			this.opacityCycle = this.opacityLockedCycle;
		} else {
			this.badTVPass.uniforms["distortion2"].value = this.badTVPassMaxDistortion;
			this.badTVPass.uniforms["speed"].value = this.badTVPassSpeedMax;

			this.opacityDifference = this.opacityMissing;
			this.opacityCycle = this.opacityMissingCycle;
		}
		if (this.oscillateOpacity) {
			var newVal;
			var diff = this.opacityDifference * Math.sin(new Date().getTime() * this.opacityCycle);
			if (!hasTarget && diff > 0) {
				newVal = this.currentOpacity - diff;
			} else {
				newVal = this.currentOpacity + diff;
			}
			if (newVal < 0) {
				newVal = 0;
			} else if (newVal > 1) {
				newVal = 1;
			}
			this.hologramMaterial.opacity = newVal;
		} else {
			this.hologramMaterial.opacity = currentOpacity;
		}
	}

	function setOpacity(opacity) {
		if (opacity >= 0 && opacity <= 1) {
			this.currentOpacity = opacity;
			updateOpacity();
		} else {
			console.log("Invalid opacity value: " + opacity);
		}
	}

	function setupHologramMesh(mesh) {
		mesh.scale.set(1, 1, 1);
		mesh.position.set(0, 0, 0);
		mesh.rotation.set(this.currentRotation[0], this.currentRotation[1], this.currentRotation[2]);
		mesh.scale.multiplyScalar(this.currentScale);

		var heightOffset = 0;
		if (this.loadedGeometry) {
			//console.log(loadedGeometry.boundingBox);
			heightOffset = this.loadedGeometry.boundingBox.min.z * this.currentScale;
		}
		//console.log(heightOffset);
		mesh.position.set(0, 0, 0);
		mesh.position.set(-1 / 7, 0, -heightOffset + this.currentHeight);
	}

	function updateModelGeometry() {
		var newObject = createModelFromGeometry(this.loadedGeometry);
		this.modelScene.remove(model);
		this.model = newObject;
		this.model.matrixWorldNeedsUpdate = true;
		this.modelScene.add(model);
		reset = true;
	}

	function createDebugObject() {
		var object = new THREE.Object3D(),
			geometry = new THREE.PlaneGeometry(1.0, 1.0, 0.0),
			material = new THREE.MeshNormalMaterial(),
			mesh = new THREE.Mesh(geometry, material);

		object.add(mesh);

		return object;
	}

	function createModelFromGeometry() {
		var object = new THREE.Object3D();

		var mesh = new THREE.Mesh(this.loadedGeometry, this.hologramMaterial);
		setupHologramMesh(mesh);

		object.add(mesh);
		return object;
	}

	function createModel() {
		var loader = new THREE.STLLoader();
		var object = new THREE.Object3D();
		var geo;
		loader.load(targetModel, function(geometry) {

			var mesh = new THREE.Mesh(geometry, this.hologramMaterial);
			setupHologramMesh(mesh);
			object.add(mesh);
		});
		return object;
	}

	function clearDebugObjects() {
		for (var id in debugObjects) {
			var object = this.debugObjects[id];
			this.modelScene.remove(object);
		}
	}

	function createDebugObjects(poses) {
		clearDebugObjects();
		//TODO: Fix this
	}

	function updateObject(object, rotation, translation) {
		object.rotation.x = rotation[0];
		object.rotation.y = rotation[1];
		object.rotation.z = rotation[2];

		object.position.x = translation[0];
		object.position.y = translation[1];
		object.position.z = -translation[2];
	};

}