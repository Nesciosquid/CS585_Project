var Marker = function(id, size, position, rotation){
	this.id = id;
	this.size = size;
	this.position = position;
	this.rotation = rotation;

	this.getWorldPosition = function(pose){
		console.log(pose.bestTranslation);
		var rotation = getRotationParams(pose.bestRotation);
		var trans = pose.bestTranslation;
		var transVec = new THREE.Vector3();
		transVec.fromArray(trans);
		var pivot = new THREE.Object3D();
		var origin = new THREE.Object3D();
		pivot.position.fromArray(this.position);
		origin.add(pivot);
		origin.rotation.fromArray(rotation);
		origin.updateMatrixWorld();
		var vec = new THREE.Vector3();
		vec.setFromMatrixPosition(pivot.matrixWorld);
		transVec.sub(vec);
		return transVec.toArray();
	}

	this.getWorldRotation = function(pose){
		return getRotationParams(pose.bestRotation);
	}	
}

var getRotationParams = function(poseRotation) {
  var rotX = -Math.asin(-poseRotation[1][2]);
  var rotY = -Math.atan2(poseRotation[0][2], poseRotation[2][2]);
  var rotZ = Math.atan2(poseRotation[1][0], poseRotation[1][1]);
  return [rotX, rotY, rotZ];
}

var getMarkerAverage = function(allMarkerData){
	var averageRotation = new THREE.Vector3(0,0,0);
	var averagePosition = new THREE.Vector3(0,0,0);
	for (var i =0 ;i < allMarkerData.length; i++){
		//console.log(allMarkerData);
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


		//console.log(averagePosition);
		averagePosition.multiplyScalar(i);
		averagePosition.add(posVec);
		averagePosition.multiplyScalar(1 / (i + 1));
	}

	var averageMarkerData = {
		position: averagePosition,
		rotation: averageRotation
	} 
	return averageMarkerData;
}

var MarkerTracker = function(canvasWidth){
	this.canvasWidth = canvasWidth;
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
		var poseMaker = new POS.Posit(marker.size, this.canvasWidth);
		var corners = mark.corners;
		this.centerCornerLocations(corners);
		var pose = poseMaker.pose(corners, marker.size, marker.position);
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
			corner.x = corner.x - (this.canvasWidth)/2;
			corner.y = (this.canvasWidth)/2 - corner.y;
		}
		return corners;
	}
}
