var HologramModel = function() {
	//User-defined variables
	this.opacity = .5;
	this.scale = 1.0;
	this.opaicty = 1.0;
	this.height = 50;
	this.rotation = [0, 0, 0];
	this.color = 0x81D4FA;
	this.missingColor = 0xB39DDB;
	this.oscillateOpacity = true;

	//Designer-defined variables
	this.opacityMissing = .4;
	this.opacityLocked = .05;
	this.opacityMissingCycle = .015;
	this.opacityLockedCycle = .005;
	this.defaultModel = "./models/owl_35mm.stl";

	//State variables
	this.model = null;
	this.missing = false;
	this.opacityDifference = this.opacityLocked;
	this.opacityCycle = this.opacityLockedCycle;

	this.hologramMaterial = new THREE.MeshLambertMaterial({
		color: 0x73DCFF,
		transparent: true,
		opacity: .8,
		depthTest: true,
		depthWrite: true,
		emissive: 0x111111
	});

	this.setXRotation = function(angle) {
		this.rotation[0] = degToRad(angle);
		this.updateRotation();
	}

	this.setYRotation = function(angle) {
		this.rotation[1] = degToRad(angle);
		this.updateRotation();
	}

	this.setZRotation = function(angle) {
		this.rotation[2] = degToRad(angle);
		this.updateRotation();
	}

	this.setRotation = function(rotation) {
		this.rotation = rotation;
		this.updateRotation();
	}

	this.updateRotation = function() {
		this.setupModelMesh();
	}

	this.setupModels = function() {
		this.model = this.createDefaultModel();
	}

	this.setupHologramMesh = function(mesh) {
		mesh.scale.set(1, 1, 1);
		mesh.position.set(0, 0, 0);
		mesh.rotation.set(this.rotation[0], this.rotation[1], this.rotation[2]);
		mesh.scale.multiplyScalar(this.scale);

		var heightOffset = 0;
		if (this.loadedGeometry) {
			heightOffset = this.loadedGeometry.boundingBox.min.z * this.scale;
		}
		mesh.position.set(0, 0, 0);
		mesh.position.set(-1 / 7, 0, -heightOffset + this.height);
	}

	this.setupModelMesh = function() {
		if (this.model != null) {
			this.setupHologramMesh(this.model.children[0]);
		}
	}

	this.setHeight = function(height) {
		if (height > 0) {
			this.height = height;
			this.updateHeight();
		}
	}

	this.updateHeight = function() {
		this.setupModelMesh();
	}

	this.setScale = function(scale) {
		if (scale > 0) {
			this.scale = scale;
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
			this.hologramMaterial.color.setHex(this.color);
		} else {
			this.hologramMaterial.color.setHex(this.missingColor);
		}
	}

	this.setMissingState = function(hasTarget){
		if (hasTarget){
			this.opacityDifference = this.opacityLocked;
			this.opacityCycle = this.opacityLockedCycle;
		} else {
			this.opacityDifference = this.opacityMissing;
			this.opacityCycle = this.opacityMissingCycle;
		}
	}

	this.updateOpacity = function() {
		if (this.oscillateOpacity) {
			var newVal;
			var diff = this.opacityDifference * Math.sin(new Date().getTime() * this.opacityCycle);
			if (!hasTarget && diff > 0) {
				newVal = this.opacity - diff;
			} else {
				newVal = this.opacity + diff;
			}
			if (newVal < 0) {
				newVal = 0;
			} else if (newVal > 1) {
				newVal = 1;
			}
			this.hologramMaterial.opacity = newVal;
		} else {
			this.hologramMaterial.opacity = this.opacity;
		}
	}

	this.setOpacity = function(opacity) {
		if (opacity >= 0 && opacity <= 1) {
			this.opacity = opacity;
			this.updateOpacity();
		} else {
			console.log("Invalid opacity value: " + opacity);
		}
	}


	this.updateModelGeometry = function() {
		var newMesh = this.createModelFromGeometry(this.loadedGeometry);
		this.model.remove(this.model.children[0]);
		this.model.add(newMesh);
		this.model.matrixWorldNeedsUpdate = true;
		reset = true;
	}

	this.updateObject = function(rotation, translation) {
		this.model.rotation.x = rotation[0];
		this.model.rotation.y = rotation[1];
		this.model.rotation.z = rotation[2];

		this.model.position.x = translation[0];
		this.model.position.y = translation[1];
		this.model.position.z = -translation[2];
	};

	this.createModelFromGeometry = function() {
		var object = new THREE.Object3D();

		var mesh = new THREE.Mesh(this.loadedGeometry, this.hologramMaterial);
		this.setupHologramMesh(mesh);
		return mesh;
	}

	this.createDefaultModel = function() {
		var loader = new THREE.STLLoader();
		var object = new THREE.Object3D();
		var geo;
		var holo = this;
		loader.load(this.defaultModel, function(geometry) {
			console.log(geometry);
			var mesh = new THREE.Mesh(geometry, holo.hologramMaterial);
			holo.setupHologramMesh(mesh);
			object.add(mesh);
		});
		return object;
	}

	this.setupModels();
}