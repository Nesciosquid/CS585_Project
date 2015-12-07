var HologramRenderer = function(hologram, container, video, width, height) {
	this.container = container;
	this.hologram = hologram;
	this.video = video;
	this.width = width;
	this.height = height;

	this.filmPassStaticIntensity = .4;
	this.filmPassLineIntensity = .5;

	this.badTVPassSpeed = .0125;
	this.badTVPassSpeedMax = .025;
	this.badTVPassMinDistortion = 1;
	this.badTVPassMaxDistortion = 5;

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

	this.shaderTime = 0;

	this.setupModels = function() {
		this.videoPlane = this.createVideoPlane();
		this.modelScene.add(this.hologram.model);
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

	this.createDebugObject = function() {
		var object = new THREE.Object3D(),
			geometry = new THREE.PlaneGeometry(1.0, 1.0, 0.0),
			material = new THREE.MeshNormalMaterial(),
			mesh = new THREE.Mesh(geometry, material);

		object.add(mesh);

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

	this.setMissingState = function(hasTarget){
		if (!hasTarget){
			this.badTVPass.uniforms["speed"].value = this.badTVPassSpeedMax;
			this.badTVPass.uniforms["distortion2"].value = this.badTVPassMaxDistortion;
		} else {
			this.badTVPass.uniforms["speed"].value = this.badTVPassSpeed;
			this.badTVPass.uniforms["distortion2"].value = this.badTVPassMinDistortion;		
		}
	}

	this.setup();
}