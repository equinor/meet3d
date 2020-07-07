var renderer
var camera
var scene
var controls

var geometry
var material
//var object
var myID
var requestID = undefined

var userCount = 0;
const distance = 15;

const maxX = 100;
const maxY = 100; // This is probably not needed
const maxZ = 100;
const speed = 3;

var listener;

function init3D() {
	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0xf0f0f0 );

	// CAMERA
	camera = new THREE.PerspectiveCamera(100, (window.innerWidth / window.outerWidth), 0.1, 1000);
	camera.position.x = 0;
	camera.position.y = 0;
	camera.position.z = 70;


	// RENDERER
	renderer = new THREE.WebGLRenderer();
	renderer.setSize(window.innerWidth - 5, window.innerHeight - 25);
	renderer.domElement.id = "scene"; // Adds an ID to the canvas element
	renderer.domElement.hidden = true; // Initially hides the scene
	renderer.domElement.style.display = "none"
	document.body.appendChild( renderer.domElement);


	// LIGHT
	var light = new THREE.PointLight( 0xff0000, 1, 100 );
	light.position.set( 50, 50, 50 );
	scene.add( light );

	// FLOOR
	var floor = new THREE.Mesh(
		new THREE.PlaneGeometry(maxX * 2, maxZ * 2, maxX * 2, maxZ * 2),
		new THREE.MeshBasicMaterial({color: 0x0000ff, side: THREE.DoubleSide})
	);
	floor.rotation.x += Math.PI / 2; //can rotate the floor/plane
	scene.add( floor );
	
	addWalls();

	document.getElementById("open").hidden = false;

	//choose which object to make when the makeobjectfunction is called
	geometry = new THREE.BoxGeometry(10, 20, 10);
	material = new THREE.MeshBasicMaterial( {color: 0x669966, wireframe: false});
	object = new THREE.Mesh(geometry, material);


	// ADD GLTFLOADER HERE

	// ORBITCONTROLS
	controls = new THREE.OrbitControls( camera, renderer.domElement );
	controls.enableKeys = false;
	controls.enablePan = false;
	controls.minDistance = 1;
	controls.maxDistance = 100;
	controls.maxPolarAngle = Math.PI * 0.5; // Does not let you clip through the floor
	controls.minAzimuthAngle = 0; // Prevents left-right rotation of camera
	controls.maxAzimuthAngle = 0; // Prevents left-right rotation of camera

	myID = new user(0, username.value, 10, 10, 0).getId();

	listener = new THREE.AudioListener();

	ourUser = findUser(myID)
	ourUser.object.add(listener);
	
	addText(ourUser);

	camera.position = ourUser.object.position
	controls.target.set(ourUser.object.position.x, ourUser.object.position.y, ourUser.object.position.z)

	update();
}

function addWalls() {

	let wallHeight = 60;

	var wallLeft = new THREE.Mesh(
		new THREE.PlaneGeometry(maxY * 2, wallHeight, 1, 1),
		new THREE.MeshBasicMaterial({color: 0xff0000, side: THREE.DoubleSide})
	);

	wallLeft.rotation.y += Math.PI / 2; //can rotate the floor/plane
	wallLeft.position.x = -maxX;
	wallLeft.position.y += wallHeight / 2;

	var wallRight = new THREE.Mesh(
		new THREE.PlaneGeometry(maxY * 2, wallHeight, 1, 1),
		new THREE.MeshBasicMaterial({color: 0xff0000, side: THREE.DoubleSide})
	);

	wallRight.rotation.y += Math.PI / 2; //can rotate the floor/plane
	wallRight.position.x = maxX;
	wallRight.position.y += wallHeight / 2;

	var wallFront = new THREE.Mesh(
		new THREE.PlaneGeometry(maxX * 2, wallHeight, 1, 1),
		new THREE.MeshBasicMaterial({color: 0xff0000, side: THREE.DoubleSide})
	);
	
	wallFront.position.z = -maxZ;
	wallFront.position.y += wallHeight / 2;

	scene.add( wallLeft );
	scene.add( wallRight );
	scene.add( wallFront );
}

function addText(user) {

	var loader = new THREE.FontLoader();
	loader.load('helvetiker_regular.typeface.json', function(font) {

		let color, nameShowed;
		
		if(user == ourUser) {
			color = 0x00ff00;
			nameShowed = 'Me (' + ourUser.getName() + ')';
		}
		else {
			color = 0x006699;
			nameShowed = user.getName();

		}

		let textMaterial = new THREE.MeshBasicMaterial( {
			color: color,
			transparent: true,
			opacity: 1.0,
			side: THREE.DoubleSide
		} );

		const shapeSize = 2;
		
		// Creates an array of Shapes representing nameShowed
		let shapes = font.generateShapes(nameShowed, shapeSize);

		let textGeometry = new THREE.ShapeBufferGeometry(shapes);
		
		//Determine position of text object
		textGeometry.translate(user.getxPosition() - 0.6 * shapeSize * shapes.length, user.getyPosition() + 3, user.getzPosition());
		
		var text = new THREE.Mesh(textGeometry, textMaterial);
		user.object.add(text);
	});
} // end of addText() function

//function to add a user to the UserMap
function addToUserMap(User) {
	UserMap.set(User.getId(), User);
	return UserMap;
}

//return true if a user with the id passed in parameter was a part of the UserMap and removed, false otherwise
function removeUser(id) {
	return UserMap.delete(id);
}

function findUser(id) {
	return UserMap.get(id);
}

//map to store the Users
var UserMap = new Map();

function newUserJoined(id, name) {
	console.log("Adding new user to the environment: " + name)
	let newUser = new user(id, name, 10, 10, distance * userCount); // This does not look great at the moment
	addText(newUser);
	addToUserMap(newUser);
	userCount++
}

function changeUserPosition(id, x, y, z) {
	findUser(id).setPosition(x, y, z);
}

function userGotMedia(id, mediaStream) {
	findUser(id).setMedia(mediaStream);
	var posAudio = new THREE.PositionalAudio(listener);
	posAudio.setRefDistance(20);
	//posAudio.setDirectionalCone(180,320,0.1);
	posAudio.setRolloffFactor(2);
	const audio1 = posAudio.context.createMediaStreamSource(mediaStream);

	try {
		posAudio.setNodeSource(audio1);
		findUser(id).object.add(posAudio)
	} catch(err){
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
var makeNewObject = function(xPosition, yPosition, zPosition){
	let object = new THREE.Mesh(geometry,material);
	object.position.x = xPosition;
	object.position.y = yPosition;
	object.position.z = zPosition;
	scene.add(object);
	return object;
};

//A user class. The constructor calls the makenewobject function.
//constructor adds a user to UserMap
class user {
	constructor(id, name, xPosition, yPosition, zPosition) {
		this.name = name,
		this.id = id,
		this.object = makeNewObject(xPosition, yPosition, zPosition);
		addToUserMap(this)
	};
	getName(){ return this.name };
	getId(){ return this.id };
	getxPosition(){ return this.object.position.x; }
	getyPosition(){ return this.object.position.y; }
	getzPosition(){ return this.object.position.z; }
	setxPosition(xPosition) {
		if (xPosition < maxX && xPosition > -maxX) {
			this.object.position.x = xPosition;
			return true
		} else {
			return false
		}
	}
	setyPosition(yPosition) {
		if (yPosition < maxY && yPosition > -maxY) {
			this.object.position.y = yPosition;
			return true
		} else {
			return false
		}
	}
	setzPosition(zPosition) {
		if (zPosition < maxZ && zPosition > -maxZ) {
			this.object.position.z = zPosition;
			return true
		} else {
			return false
		}
	}
	setPosition(xPosition, yPosition, zPosition) {
		if (xPosition < maxX && xPosition > -maxX) this.object.position.x = xPosition;
		if (yPosition < maxY && yPosition > -maxY) this.object.position.y = yPosition;
		if (zPosition < maxZ && zPosition > -maxZ) this.object.position.z = zPosition;
	}
	getMedia(){return this.media};
	setMedia(media) {
		this.media = media;
	}
};

var keysPressed = {};
function onDocumentKeyDown(event) {
	var key = event.key;
	let ourUser = findUser(myID)
	keysPressed[event.key] = true;
	switch (key) {
		case 'w':
		case 'arrow up':
			if ((keysPressed['d']) || (keysPressed['arrow right'])) {
				if (ourUser.setxPosition(ourUser.getxPosition() + speed)) camera.position.x += speed;
				if (ourUser.setzPosition(ourUser.getzPosition() - speed)) camera.position.z -= speed;
			} else if ((keysPressed['a']) || (keysPressed['arrow left'])) {
				if (ourUser.setxPosition(ourUser.getxPosition() - speed)) camera.position.x -= speed;
				if (ourUser.setzPosition(ourUser.getzPosition() - speed)) camera.position.z -= speed;
			} else {
				if (ourUser.setzPosition(ourUser.getzPosition() - speed)) camera.position.z -= speed;
			}
			break;
		case 's':
		case 'arrow down':
			if ((keysPressed['d']) || (keysPressed['arrow right'])) {
				if (ourUser.setxPosition(ourUser.getxPosition() + speed)) camera.position.x += speed;
				if (ourUser.setzPosition(ourUser.getzPosition() + speed)) camera.position.z += speed;
			} else if ((keysPressed['a']) || (keysPressed['arrow left'])) {
				if (ourUser.setxPosition(ourUser.getxPosition() - speed)) camera.position.x -= speed;
				if (ourUser.setzPosition(ourUser.getzPosition() + speed)) camera.position.z += speed;
			} else {
				if (ourUser.setzPosition(ourUser.getzPosition() + speed)) camera.position.z += speed;
			}
			break;
		case 'd':
		case 'arrow right':
			if ((keysPressed['w']) || (keysPressed['arrow up'])) {
				if (ourUser.setxPosition(ourUser.getxPosition() + speed)) camera.position.x += speed;
				if (ourUser.setzPosition(ourUser.getzPosition() - speed)) camera.position.z -= speed;
			} else if ((keysPressed['s']) || (keysPressed['arrow down'])) {
				if (ourUser.setxPosition(ourUser.getxPosition() + speed)) camera.position.x += speed;
				if (ourUser.setzPosition(ourUser.getzPosition() + speed)) camera.position.z += speed;
			} else {
				if (ourUser.setxPosition(ourUser.getxPosition() + speed)) camera.position.x += speed;
			}
			break;
		case 'a':
		case 'arrow left':
			if ((keysPressed['w']) || (keysPressed['arrow up'])) {
				if (ourUser.setxPosition(ourUser.getxPosition() - speed)) camera.position.x -= speed;
				if (ourUser.setzPosition(ourUser.getzPosition() - speed)) camera.position.z -= speed;
			} else if ((keysPressed['s']) || (keysPressed['arrow down'])) {
				if (ourUser.setxPosition(ourUser.getxPosition() - speed)) camera.position.x -= speed;
				if (ourUser.setzPosition(ourUser.getzPosition() + speed)) camera.position.z += speed;
			} else {
				if (ourUser.setxPosition(ourUser.getxPosition() - speed)) camera.position.x -= speed;
			}
			break;
		default:
			break;
	}

	camera.position = ourUser.object.position
	controls.target.set(ourUser.object.position.x, ourUser.object.position.y, ourUser.object.position.z)

	changePos(ourUser.getxPosition(), ourUser.getyPosition(), ourUser.getzPosition())
}

function onDocumentKeyUp(event) {
	delete keysPressed[event.key];
}

//function to update frame
function update() {
	renderer.render(scene, camera);
	//text.rotation.x = controls.getPolarAngle();
	requestID = requestAnimationFrame(update);
}

//function to change name of user.
function nameChange(userer, newname) {
	userer.name = newname;
}

function leave3D() {
	document.removeEventListener("keydown", onDocumentKeyDown);
	document.removeEventListener("keyup", onDocumentKeyUp);
	if (document.getElementById("scene")) {
		document.getElementById("scene").outerHTML = '' // Deletes the scene
	}
	controls = null;
	renderer = null;
	camera = null;
	scene = null;
	controls = null;
	geometry = null;
	material = null;
	object = null;
	myID = null;
	userCount = 0;
	window.cancelAnimationFrame(requestID); // Stops rendering the scene
	requestID = undefined;
}
