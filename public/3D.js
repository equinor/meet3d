var scene;
var camera;
var renderer;
var controls;

var geometry;
var material;
var myID;
var requestID = undefined;

var userCount = 0;
const distance = 15;

const maxX = 100;
const maxY = 100; // This is probably not needed
const maxZ = 100;
const speed = 3;

const objectWidth = 10;
const objectHeight = 20;

var listener;

function init3D() {
	scene = new THREE.Scene();
	scene.background = new THREE.Color(0xf0f0f0);

	// CAMERA
	camera = new THREE.PerspectiveCamera(100, (window.innerWidth / window.outerWidth), 0.1, 1000);
	camera.position.z = 70;

	var light = new THREE.PointLight(0xff0000, 1, 100);
	light.position.set(50, 50, 50);

	// RENDERER
	renderer = new THREE.WebGLRenderer();
	renderer.setSize(window.innerWidth - 5, window.innerHeight - 25);
	renderer.domElement.id = "scene"; // Adds an ID to the canvas element
	document.getElementById("3D").appendChild(renderer.domElement);

	scene.add(light);

	// FLOOR
	var floor = new THREE.Mesh(
		new THREE.PlaneGeometry(maxX * 2, maxZ * 2, maxX * 2, maxZ * 2),
		new THREE.MeshBasicMaterial({ color: 0x0000ff, side: THREE.DoubleSide })
	);
	floor.rotation.x += Math.PI / 2; //can rotate the floor/plane
	scene.add(floor);

	addWalls();

	document.getElementById("open").hidden = false;

	//choose which object to make when the makeobjectfunction is called
	geometry = new THREE.BoxGeometry(objectWidth, objectHeight, objectWidth);
	material = new THREE.MeshBasicMaterial({ color: 0x669966, wireframe: false });
	object = new THREE.Mesh(geometry, material);

	// ADD GLTFLOADER HERE

	// ORBITCONTROLS
	controls = new THREE.OrbitControls(camera, renderer.domElement);
	controls.enableKeys = false;
	controls.enablePan = false;
	controls.minDistance = 1;
	controls.maxDistance = 100;
	controls.maxPolarAngle = Math.PI * 0.5; // Does not let you clip through the floor
	controls.minAzimuthAngle = 0; // Prevents left-right rotation of camera
	controls.maxAzimuthAngle = 0; // Prevents left-right rotation of camera


	listener = new THREE.AudioListener();

	myID = 0; // FIXME Should probably have unique myID
	ourUser = new User(myID, username.value, 10, 10, 0);
	ourUser.object.add(listener);
	userCount++;

	addText(ourUser);

	controls.target.set(ourUser.getxPosition(), ourUser.getyPosition(), ourUser.getzPosition());
	controls.update();

	update();
}

//Create the texture to display video on wall
for (var x in remoteStreamList) {
	var video = remoteStreamList[x];
	var texture = new THREE.VideoTexture(video);
	texture.minFilter = THREE.LinearFilter;
	texture.magFilter = THREE.LinearFilter;
	texture.format = THREE.RGBFormat;
}

function addWalls() {
	if (remoteStreamList.length > 0) {
		for (var x in remoteStreamList) {
			var video = document.getElementById(remoteStreamList[x]);
			var texture = new THREE.VideoTexture(video);
			texture.minFilter = THREE.LinearFilter;
			texture.magFilter = THREE.LinearFilter;
			texture.format = THREE.RGBFormat;
		}
	}	else {
		var texture = 0;
	}

	let wallHeight = 100;

	var wallLeft = new THREE.Mesh(
		new THREE.PlaneGeometry(maxY * 2, wallHeight, 1, 1),
		new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide })
	);

	wallLeft.rotation.y += Math.PI / 2; //can rotate the floor/plane
	wallLeft.position.x = -maxX;
	wallLeft.position.y += wallHeight / 2;

	var wallRight = new THREE.Mesh(
		new THREE.PlaneGeometry(maxY * 2, wallHeight, 1, 1),
		new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide })
	);

	wallRight.rotation.y += Math.PI / 2; //can rotate the floor/plane
	wallRight.position.x = maxX;
	wallRight.position.y += wallHeight / 2;

	var wallFront = new THREE.Mesh(
		new THREE.PlaneBufferGeometry(maxX * 2, wallHeight, 1, 1),
		new THREE.MeshBasicMaterial({side: THREE.DoubleSide, map: texture}));

	wallFront.position.z = -maxZ;
	wallFront.position.y += wallHeight / 2;

	scene.add(wallLeft);
	scene.add(wallRight);
	scene.add(wallFront);

	renderer.render(scene, camera);
}

// Add username as text on top of 3D-object
function addText(user) {

	var loader = new THREE.FontLoader();
	loader.load('helvetiker_regular.typeface.json', function(font) {

		let color, nameShowed;

		if(user == ourUser) {
			color = 0x00ff00;
			nameShowed = 'Me (' + user.getName() + ')';
		}
		else {
			color = 0x000000;
			nameShowed = user.getName();
		}

		let textMaterial = new THREE.MeshBasicMaterial({
			color: color,
			transparent: true,
			opacity: 1.0,
			side: THREE.DoubleSide
		});

		const shapeSize = 2;

		// Creates an array of Shapes representing nameShowed
		let shapes = font.generateShapes(nameShowed, shapeSize);

		let textGeometry = new THREE.ShapeBufferGeometry(shapes);
		
		// Set center of text object equal to center of 3D-object
		textGeometry.computeBoundingBox();
		textGeometry.center();
		
		// Determine position of text object realtive to 3D-object
		textGeometry.translate(0, 0.5 * objectHeight + shapeSize, 0.25 * objectWidth);

		var text = new THREE.Mesh(textGeometry, textMaterial);
		
		user.object.add(text);
	});
} // end of addText() function

//function to add a User to the UserMap
function addToUserMap(User) {
	UserMap.set(User.getId(), User);
	return UserMap;
}

//return true if a User with the id passed in parameter was a part of the UserMap and removed, false otherwise
function removeUser(id) {
	return UserMap.delete(id);
}

function findUser(id) {
	return UserMap.get(id);
}

//map to store the Users
var UserMap = new Map();

function newUserJoined(id, name) {
	console.log("Adding new user to the environment: " + name);
	let newUser = new User(id, name, 10, 10, distance * userCount);
	addText(newUser);
	addToUserMap(newUser);
	userCount++;
	console.log("Usercount now: " + userCount);
}

function changeUserPosition(id, x, y, z) {
	findUser(id).setPosition(x, y, z);
}

function userGotMedia(id, mediaStream) {
	findUser(id).setMedia(mediaStream);
	var posAudio = new THREE.PositionalAudio(listener);
	posAudio.setRefDistance(20);
	posAudio.setRolloffFactor(2);
	const audio1 = posAudio.context.createMediaStreamSource(mediaStream);

	try {
		posAudio.setNodeSource(audio1);
		findUser(id).object.add(posAudio);
	} catch(err) {
		console.log(err);
	};
}

function userLeft(id) {
	scene.remove(findUser(id).object);
	if (removeUser(id)) {
		userCount--;
	}
}

//function that makes an object and position it at input coordinates
var makeNewObject = function(xPosition, yPosition, zPosition) {
	let object = new THREE.Mesh(geometry, material);
	object.position.x = xPosition;
	object.position.y = yPosition;
	object.position.z = zPosition;
	scene.add(object);
	return object;
};

//A User class. The constructor calls the makenewobject function.
//constructor adds a User to UserMap
class User {
	constructor(id, name, xPosition, yPosition, zPosition) {
		this.name = name,
		this.id = id,
		this.object = makeNewObject(xPosition, yPosition, zPosition);
		addToUserMap(this)
	};
	getName() { return this.name; }
	getId() { return this.id; }
	getxPosition() { return this.object.position.x; }
	getyPosition() { return this.object.position.y; }
	getzPosition() { return this.object.position.z; }
	getPosition() { return this.object.position; }

	setName(newname) { this.name = newname; }
	setxPosition(xPosition) { this.object.position.x = xPosition; }
	setyPosition(yPosition) { this.object.position.y = yPosition; }
	setzPosition(zPosition) { this.object.position.z = zPosition; }
	setPosition(xPosition, yPosition, zPosition) {
		this.setxPosition(xPosition);
		this.setyPosition(yPosition);
		this.setzPosition(zPosition);
	}
	getValidPosition(xPosition, yPosition, zPosition) {
		let posVec = new THREE.Vector3(xPosition, yPosition, zPosition);

		posVec.x = Math.max( -(maxX - 0.5 * objectWidth), Math.min(xPosition, maxX - 0.5 * objectWidth) );
		posVec.y = Math.max( -(maxY - 0.5 * objectHeight), Math.min(yPosition, maxY - 0.5 * objectHeight) );
		posVec.z = Math.max( -(maxZ - 0.5 * objectWidth), Math.min(zPosition, maxZ - 0.5 * objectWidth) );


		return posVec;
	}
	// Return the Vector3 from current position to a valid new position
	getValidMoveVec(velX, velY, velZ) {
		let validPos = this.getValidPosition( this.getxPosition() + velX, this.getyPosition() + velY, this.getzPosition() + velZ );
		return validPos.sub(this.getPosition());
	}
	// Moves both the 3D-object and the camera
	move(moveVec) {
		this.setPosition(this.getxPosition() + moveVec.x, this.getyPosition() + moveVec.y, this.getzPosition() + moveVec.z);
		camera.position.add(moveVec);
	}
	getMedia() { return this.media; }
	setMedia(media) {
		this.media = media;
	}
};

var keysPressed = {};
function onDocumentKeyDown(event) {
	var key = event.key;
	let ourUser = findUser(myID);
	var moveVec = new THREE.Vector3(0,0,0);
	keysPressed[event.key] = true;
	switch (key) {
		case 'w':
			if (keysPressed['d']) {
				moveVec = ourUser.getValidMoveVec( speed, 0, -speed );
			}
			else if (keysPressed['a']) {
				moveVec = ourUser.getValidMoveVec( -speed, 0, -speed );
			}
			else {
				moveVec = ourUser.getValidMoveVec( 0, 0, -speed );
			}
			break;
		case 's':
			if (keysPressed['d']) {
				moveVec = ourUser.getValidMoveVec( speed, 0, speed );
			}
			else if (keysPressed['a']) {
				moveVec = ourUser.getValidMoveVec( -speed, 0, speed );
			}
			else {
				moveVec = ourUser.getValidMoveVec( 0, 0, speed );
			}
			break;
		case 'd':
			if (keysPressed['w']) {
				moveVec = ourUser.getValidMoveVec( speed, 0, -speed );
			}
			else if (keysPressed['s']) {
				moveVec = ourUser.getValidMoveVec( speed, 0, speed );
			}
			else {
				moveVec = ourUser.getValidMoveVec( speed, 0, 0 );
			}
			break;
		case 'a':
			if (keysPressed['w']) {
				moveVec = ourUser.getValidMoveVec( -speed, 0, -speed );
			}
			else if (keysPressed['s']) {
				moveVec = ourUser.getValidMoveVec( -speed, 0, speed );
			}
			else {
				moveVec = ourUser.getValidMoveVec( -speed, 0, 0 );
			}
			break;
		default:
			break;
	}

	ourUser.move(moveVec);

	// Makes the camera target object when using mouse to move the camera
	controls.target.set(ourUser.getxPosition(), ourUser.getyPosition(), ourUser.getzPosition());

	changePos(ourUser.getxPosition(), ourUser.getyPosition(), ourUser.getzPosition());
}

function onDocumentKeyUp(event) {
	delete keysPressed[event.key];
}


//function to update frame
function update() {
	renderer.render(scene, camera);
	requestID = requestAnimationFrame(update);
}

function leave3D() {
	document.removeEventListener("keydown", onDocumentKeyDown);
	document.removeEventListener("keyup", onDocumentKeyUp);
	if (document.getElementById("scene")) {
		document.getElementById("scene").outerHTML = ''; // Deletes the scene canvas
	}
	scene = null;
	camera = null;
	renderer = null;
	controls = null;
	geometry = null;
	material = null;
	myID = null;
	userCount = 0;
	window.cancelAnimationFrame(requestID); // Stops rendering the scene
	requestID = undefined;
}