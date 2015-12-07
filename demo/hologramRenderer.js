var HologramRenderer = function(container, video, width, height) {
	this.container = container;
	this.video = video;
	this.width = width;
	this.height = height;
	this.model;

	this.currentScale = 1.0;
	this.currentOpacity = .7;
	this.currentHeight = 50;
	this.currentRotation = [0, 0, 0];

	this.currentColor = 0x81D4FA;
	this.missingColor = 0xB39DDB;

	this.rotationTime = 30; // seconds
	this.heightDifference = .2; // of model height
	this.opacityMissing = .4;
	this.opacityLocked = .05;
	this.opacityDifference = opacityLocked;
	this.opacityMissingCycle = .015;
	this.opacityLockedCycle = .005;
	this.opacityCycle = opacityLockedCycle; // lower == slower
	this.oscillateOpacity = true;

	this.renderVideoPass;
	this.renderModelPass;

	this.filmPassStaticIntensity = .4;
	this.filmPassLineIntensity = .5;

	this.badTVPassSpeed = .025;
	this.badTVPassSpeedMax = .05;
	this.badTVPassMinDistortion = 1.5;
	this.badTVPassMaxDistortion = 10;

	this.scrollPass;
	this.renderModelPass;
	this.renderScenePass;

	this.hasTarget = false;

	var targetModel = "./models/owl_35mm.stl";

	this.composerParameters = {
		minFilter: THREE.LinearFilter,
		magFilter: THREE.LinearFilter,
		format: THREE.RGBFormat,
		stencilBuffer: true
	}

	this.hologramMaterial = new THREE.MeshLambertMaterial({
		color: 0x73DCFF,
		transparent: true,
		opacity: .8,
		depthTest: true,
		depthWrite: true,
		emissive: 0x111111
	});

	this.shaderTime = 0;

	this.setXRotation = function(angle) {
		this.currentRotation[0] = degToRad(angle);
		this.updateRotation();
	}

	this.setYRotation = function(angle) {
		this.currentRotation[1] = degToRad(angle);
		this.updateRotation();
	}

	this.setZRotation = function(angle) {
		this.currentRotation[2] = degToRad(angle);
		this.updateRotation();
	}

	this.setRotation = function(rotation) {
		this.currentRotation = rotation;
		this.updateRotation();
	}

	this.setupModels = function() {
		this.model = this.createModel();
		this.videoPlane = this.createVideoPlane();
		this.modelScene.add(this.model);
		this.videoScene.add(this.videoPlane);
	}

	this.setupScenes = function() {
		this.videoScene = new THREE.Scene();
		this.videoCamera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5);
		this.videoScene.add(this.videoCamera);

		this.modelScene = new THREE.Scene();
		this.modelCamera = new THREE.PerspectiveCamera(40, this.width / this.height, 1, 1000);
		this.modelScene.add(this.modelCamera);

		this.lights = [];

		this.lights[0] = new THREE.PointLight(0x888888, 1, 0);
		this.lights[1] = new THREE.PointLight(0x888888, 1, 0);
		this.lights[2] = new THREE.PointLight(0x888888, 1, 0);

		this.lights[0].position.set(0, 200, 0);
		this.lights[1].position.set(100, 200, 100);
		this.lights[2].position.set(-100, -200, -100);

		this.modelScene.add(this.lights[0]);
		this.modelScene.add(this.lights[1]);
		this.modelScene.add(this.lights[2]);
	}

	this.updateRotation = function() {
		this.setupModelMesh();
	}

	this.setupEffects = function() {
		this.renderVideoPass = new THREE.RenderPass(this.videoScene, this.videoCamera);
		this.renderVideoPass.clear = true;

		this.renderModelPass = new THREE.RenderPass(this.modelScene, this.modelCamera);
		this.renderModelPass.clear = false;

		this.maskPass = new THREE.MaskPass(this.modelScene, this.modelCamera);
		this.clearMaskPass = new THREE.ClearMaskPass();

		this.filmPass = new THREE.FilmPass();
		this.filmPass.uniforms["sCount"].value = 600;
		this.filmPass.uniforms["sIntensity"].value = this.filmPassLineIntensity;
		this.filmPass.uniforms["nIntensity"].value = this.filmPassStaticIntensity;
		this.filmPass.uniforms["grayscale"].value = false;

		this.copyPass = new THREE.ShaderPass(THREE.CopyShader);
		this.copyPass.renderToScreen = true;

		this.badTVPass = new THREE.ShaderPass(THREE.BadTVShader);
		this.badTVPass.uniforms["tDiffuse"].value = null;
		this.badTVPass.uniforms["time"].value = 0.1;
		this.badTVPass.uniforms["distortion"].value = 0.1;
		this.badTVPass.uniforms["distortion2"].value = this.badTVPassMinDistortion;
		this.badTVPass.uniforms["speed"].value = this.badTVPassSpeed;
		this.badTVPass.uniforms["rollSpeed"].value = 0;

		this.scrollPass = new THREE.ShaderPass(THREE.BadTVShader);
		this.scrollPass.uniforms["tDiffuse"].value = null;
		this.scrollPass.uniforms["time"].value = 0.1;
		this.scrollPass.uniforms["distortion"].value = 0;
		this.scrollPass.uniforms["distortion2"].value = 0;
		this.scrollPass.uniforms["speed"].value = 0;
		this.scrollPass.uniforms["rollSpeed"].value = .2;
	}

	this.render = function() {
		this.renderer.autoClear = false;
		//this.renderer.render(this.videoScene, this.videoCamera);
		//this.renderer.render(this.modelScene, this.modelCamera);

		this.bgComposer.render();

		this.shaderTime += .1;

		this.filmPass.uniforms["time"].value = this.shaderTime;
		this.badTVPass.uniforms["time"].value = this.shaderTime;
	}

	this.setupRenderer = function() {
		this.renderer = new THREE.WebGLRenderer();
		this.renderer.autoClear = false;
		this.renderer.setClearColor(0xFFFFFF);
		this.container.appendChild(this.renderer.domElement);
		this.renderer.setSize(this.width, this.height);
	}

	this.updateVideo = function(){
		this.videoPlane.children[0].material.map.needsUpdate = true;
	}

	this.setup = function() {
		this.setupRenderer();
		this.setupScenes();
		this.setupEffects();
		this.setupModels();
		this.setupComposers();
	}

	this.createNewComposer = function() {
		return new THREE.EffectComposer(this.renderer, new THREE.WebGLRenderTarget(this.width * 2, this.height * 2, this.composerParameters));
	}

	this.setupComposers = function() {
		this.bgComposer = this.createNewComposer();
		this.bgComposer.addPass(this.renderVideoPass);
		this.bgComposer.addPass(this.renderModelPass);
		this.bgComposer.addPass(this.maskPass);
		this.bgComposer.addPass(this.filmPass);
		this.bgComposer.addPass(this.badTVPass);
		this.bgComposer.addPass(this.clearMaskPass);
		this.bgComposer.addPass(this.copyPass);
	}

	this.createVideoPlane = function() {
		var texture = new THREE.Texture(this.video);
		console.log(texture);
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

	this.setupHologramMesh = function(mesh) {
		mesh.scale.set(1, 1, 1);
		mesh.position.set(0, 0, 0);
		mesh.rotation.set(this.currentRotation[0], this.currentRotation[1], this.currentRotation[2]);
		mesh.scale.multiplyScalar(this.currentScale);

		var heightOffset = 0;
		if (this.loadedGeometry) {
			heightOffset = this.loadedGeometry.boundingBox.min.z * this.currentScale;
		}
		mesh.position.set(0, 0, 0);
		mesh.position.set(-1 / 7, 0, -heightOffset + this.currentHeight);
	}

	this.setupModelMesh = function() {
		if (this.model != null) {
			this.setupHologramMesh(this.model.children[0]);
		}
	}

	this.setHeight = function(height) {
		if (height > 0) {
			this.currentHeight = height;
			this.updateHeight();
		}
	}

	this.updateHeight = function() {
		this.setupModelMesh();
	}

	this.setScale = function(scale) {
		if (scale > 0) {
			this.currentScale = scale;
			this.updateScale();
		} else {
			console.log("Invalid scaling factor: " + scale);
		}
	}

	this.updateScale = function() {
		this.setupModelMesh();
	}

	this.updateMaterial = function() {
		this.updateOpacity();
		this.updateColor();
	}

	this.updateColor = function() {
		if (hasTarget) {
			this.hologramMaterial.color.setHex(currentColor);
		} else {
			this.hologramMaterial.color.setHex(missingColor);
		}
	}

	this.updateOpacity = function() {
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

	this.setOpacity = function(opacity) {
		if (opacity >= 0 && opacity <= 1) {
			this.currentOpacity = opacity;
			updateOpacity();
		} else {
			console.log("Invalid opacity value: " + opacity);
		}
	}


	this.updateModelGeometry = function() {
		var newObject = this.createModelFromGeometry(this.loadedGeometry);
		this.modelScene.remove(this.model);
		this.model = newObject;
		this.model.matrixWorldNeedsUpdate = true;
		this.modelScene.add(this.model);
		reset = true;
	}

	this.createDebugObject = function() {
		var object = new THREE.Object3D(),
			geometry = new THREE.PlaneGeometry(1.0, 1.0, 0.0),
			material = new THREE.MeshNormalMaterial(),
			mesh = new THREE.Mesh(geometry, material);

		object.add(mesh);

		return object;
	}

	this.createModelFromGeometry = function() {
		var object = new THREE.Object3D();

		var mesh = new THREE.Mesh(this.loadedGeometry, this.hologramMaterial);
		this.setupHologramMesh(mesh);

		object.add(mesh);
		return object;
	}

	this.createModel = function() {
		var loader = new THREE.STLLoader();
		var object = new THREE.Object3D();
		var geo;
		var holo = this;
		loader.load(targetModel, function(geometry) {
			console.log(geometry);
			var mesh = new THREE.Mesh(geometry, holo.hologramMaterial);
			holo.setupHologramMesh(mesh);
			object.add(mesh);
		});
		return object;
	}

	this.clearDebugObjects = function() {
		for (var id in debugObjects) {
			var object = this.debugObjects[id];
			this.modelScene.remove(object);
		}
	}

	this.createDebugObjects = function(poses) {
		this.clearDebugObjects();
		//TODO: Fix this
	}

	this.updateObject = function(rotation, translation) {
		this.model.rotation.x = rotation[0];
		this.model.rotation.y = rotation[1];
		this.model.rotation.z = rotation[2];

		this.model.position.x = translation[0];
		this.model.position.y = translation[1];
		this.model.position.z = -translation[2];
	};

	this.setup();
}