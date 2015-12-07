var HologramModel = function(){
	//User-defined variables
	this.opacity = .5;
	this.scale = 1.0;
	this.opaicty = 1.0;
	this.height = 50;
	this.rotation = [0,0,0];
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
	this.object = null;
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

	this.setupModels = function() {
		this.object = this.createDefaultModel();
	}


}