var Marker = function(id, size, position, rotation){
	this.id = id;
	this.size = size;
	this.position = position;
	this.rotation = rotation;

	this.getWorldPosition = function(pose){
		var params = getRotationParams(pose.bestRotation);
		var trans = pose.bestTranslation;
		var transVec = new THREE.Vector3(trans[0], trans[1], trans[2]);
		var pivot = new THREE.Object3D();
		var ori = new THREE.Object3D();
		var offset = [0,0,0];
		offset = this.position;
		pivot.position.set(offset[0], offset[1], offset[2]);
		ori.add(pivot);
		ori.rotation.set(params[0], params[1], params[2]);
		ori.updateMatrixWorld();
		var vec = new THREE.Vector3();
		vec.setFromMatrixPosition(pivot.matrixWorld);
		transVec.sub(vec);

  		return transVec.toArray();
	}

	this.getWorldRotation = function(pose){
		return getRotationParams(pose.bestRotation);
	}	
}

var getMarkerAverage = function(allMarkerData){
	var averageRotation = new THREE.Vector3(0,0,0);
	var averagePosition = new THREE.Vector3(0,0,0);
	for (var i =0 ;i < allMarkerData.length; i++){
		var markerData = allMarkerData[i];
		var pos = markerData.position;
		var rot = markerData.rotation;
		rot = fixRotation(rot, averageRotation.toArray());
		var posVec = new THREE.Vector3();
		var rotVec = new THREE.Vector3();
		posVec.fromArray(pos);
		rotVec.fromArray(rot);

		averageRotation.multiplyScalar(i)
		averageRotation.add(rotVec);
		averageRotation.multiplyScalar(1/(i+1));

		averagePosition.multiplyScalar(i);
		averagePosition.add(posVec);
		averagePosition.multiplyScalar(1 / (i + 1));
	}

	var averageMarkerData = {
		position: averagePosition.toArray(),
		rotation: averageRotation.toArray()
	} 

	return averageMarkerData;
}

var MarkerTracker = function(width, height){
	this.width = width;
	this.height = height;
	this.markers = {};
	this.detector = new AR.Detector();
	this.foundMarks = [];
	this.defaultMarkSize = 40; //mm
	this.defaultMarkPosition = [0,0,0];
	this.defaultMarkRotation = [0,0,0];

	this.addMarker = function(marker){
		this.markers[marker.id] = marker;
	}

	this.getMarker = function(id){
		return this.markers[id];
	}

	this.createMarker = function(id, size, position, rotation){
		var newMarker = new Marker(id, size, position, rotation);
		this.addMarker(newMarker);
	}

	this.findMarkers = function(imageData){
		this.foundMarks = this.detector.detect(imageData);
		if (this.foundMarks.length > 0){
			return true;
		} else return false;
	}

	this.getAllMarkerData = function(){
		var allMarkerData = [];
		for (var i in this.foundMarks){
			allMarkerData.push(this.getMarkerData(this.foundMarks[i]));
		}
		return allMarkerData;
	}

	this.getMarkerData = function(mark){
		var id = mark.id;
		var corners = mark.corners;
		if (!this.markers.hasOwnProperty(id)){
			this.createMarker(id, this.defaultMarkSize, this.defaultMarkPosition, this.defaultMarkRotation);
		}
		var marker = this.markers[id];
		var corners = mark.corners;
		this.centerCornerLocations(corners);
		var poseMaker = new POS.Posit(marker.size, this.width);
		var pose = poseMaker.pose(corners);
		var position = marker.getWorldPosition(pose);
		var rotation = marker.getWorldRotation(pose);
		var markerData = {
			id: marker.id,
			position: position,
			rotation: rotation
		}

		return markerData;
	}

	this.centerCornerLocations = function(corners){
		for (var i in corners){
			var corner = corners[i];
			corner.x = corner.x - (this.width)/2;
			corner.y = (this.height)/2 - corner.y;
		}
		return corners;
	}
}
