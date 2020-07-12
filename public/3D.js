var renderer;
var camera;
var scene;
var controls;
var geometry;
var material;
var object;
var requestID = undefined;
var userCount = 0;
var listener;
var allObjects = []; // Stores all 3D objects so that they can be removed later
var videoList = []; // The list of remote videos to display
var videoListLength = 0; // The number of videos to show at a time, not including our own
var ourUser;

let wallLeft;
let wallRight;
let wallFront;

const distance = 15;
const maxX = 100;
const maxY = 100; // This is probably not needed
const maxZ = 100;
const speed = 3;
const wallHeight = 100;
const videoCount = 3;

var listener;
var loader;

listAvatars = [];
UserMap = {};

function addWalls() {
	let texture = 0;

	if (wallLeft && wallRight && wallFront) { // If the walls already exist, remove them
		scene.remove(wallLeft);
		scene.remove(wallRight);
		scene.remove(wallFront);
	}

	if (screenShare.srcObject) { // If someone is sharing their screen, display it
			texture = new THREE.VideoTexture(screenShare);
			texture.minFilter = THREE.LinearFilter;
			texture.magFilter = THREE.LinearFilter;
			texture.format = THREE.RGBFormat;
	}

	wallLeft = new THREE.Mesh(
		new THREE.PlaneGeometry(maxY * 2, wallHeight, 1, 1),
		new THREE.MeshBasicMaterial( { color: "cadetblue", side: THREE.DoubleSide } )
	);

	wallLeft.rotation.y += Math.PI / 2;
	wallLeft.position.x = -maxX;
	wallLeft.position.y += wallHeight / 2;

	wallRight = new THREE.Mesh(
		new THREE.PlaneGeometry(maxY * 2, wallHeight, 1, 1),
		new THREE.MeshBasicMaterial( { color: "cadetblue", side: THREE.DoubleSide } )
	);

	wallRight.rotation.y += Math.PI / 2;
	wallRight.position.x = maxX;
	wallRight.position.y += wallHeight / 2;

	if (!texture) { // If there is no video assign a colour to the front wall
		wallFront = new THREE.Mesh(
			new THREE.PlaneBufferGeometry(maxX * 2, wallHeight, 1, 1),
			new THREE.MeshBasicMaterial( { color: "cadetblue", side: THREE.DoubleSide } )
		);
	} else { // If there is a video place the video texture on the wall
		wallFront = new THREE.Mesh(
			new THREE.PlaneBufferGeometry(maxX * 2, wallHeight, 1, 1),
			new THREE.MeshBasicMaterial( { side: THREE.DoubleSide, map: texture } )
		);
	}

	wallFront.position.z = -maxZ;
	wallFront.position.y += wallHeight / 2;

	scene.add( wallLeft );
	scene.add( wallRight );
	scene.add( wallFront );
	allObjects.push( wallLeft );
	allObjects.push( wallRight );
	allObjects.push( wallFront );

	renderer.render(scene, camera);
}

//load the .gltf file passed in argument, store the 3D object and in corresponding animation in listAvatars, add the object to the scene outside the field of view
function makeNewObjects(ressource){
	console.log("creating object: " + ressource + " ...");
	var avatar = {};
	avatar['model'] = new THREE.Object3D(); //spookey
	loader.load(ressource, function(gltf) { //this could probably be vastly improved
		avatar.model.add(gltf.scene);
		avatar.model.scale.x = 7;
		avatar.model.scale.y = 7;
		avatar.model.scale.z = 7;
		/*avatar.model.position.x = 0;
		avatar.model.position.y = 0; //deep under the scene
		avatar.model.position.z = 0;*/
		
		//avatar.model.position.x = 10;
		//avatar.model.position.y = 10;
		//avatar.model.position.z = (distance * userCount);

		//scene.add(avatar.model);
		var animation = gltf.animations[0];
		var mixer = new THREE.AnimationMixer(avatar.model);
		var action = mixer.clipAction(animation);
		//avatar['model'] = model;
		avatar['animation'] = animation;
		avatar['mixer'] = mixer;
		avatar['swim'] = action;
		//console.log(avatar);
	});
	console.log(avatar.model);
	listAvatars.push(avatar);
	console.log("listAvatar :");
	console.log(listAvatars);
	console.log("creating object: " + ressource + " finished");
	return avatar;
}

function newUserJoined(id, name){
	console.log("Adding new user to the 3D environment: " + name + " ...");
	console.log("listAvatars : ");
	console.log(listAvatars);
	var user = {};
	user['id'] = id;
	user['name'] = name;
	user['avatar'] = listAvatars.shift();
	user.avatar.model.position.x = 10;
	user.avatar.model.position.y = 10;
	user.avatar.model.position.z = (distance * userCount);
	scene.add(user.avatar.model);
	console.log("user : ");
	console.log(user);
	addToUserMap(user);
	console.log("UserMap : ");
	console.log(UserMap);
	//changeUserPosition(user.id, 0, 0, 0);
	console.log(user);
	console.log(UserMap);
	return user;
}

function addToUserMap(User) {
	console.log("addToUserMap(");
	console.log(User);
	console.log(") ...");
	UserMap[User.id] = User;
	console.log(UserMap);
	return UserMap;
}

//return true if a User with the id passed in parameter was a part of the UserMap and removed, false otherwise
function removeFromUserMap(id) {
	if(UserMap[id]){
		delete UserMap[id];
		return true;
	}else{
		return false;
	}
}

// Returns the user object corresponding to the given user ID if found, false otherwise
function findUser(id) {
	console.log("findUser(" + id + ")...");
	if(UserMap[id]){
		console.log("findUser(" + id + ") : ");
		console.log(UserMap[id]);
		return UserMap[id];
	}
	console.log("findUser(" + id + ") : false");
	return false;
}

function changeUserPosition(id, x, y, z) {
	console.log("changeUserPosition(" + id + ", " + x + ", " + y + ", " + z + ") ...");
	findUser(id).avatar.model.position.x = x;
	findUser(id).avatar.model.position.y = y;
	findUser(id).avatar.model.position.z = z;
	console.log("changeUserPosition(" + id + ", " + x + ", " + y + ", " + z + ") done!");
}

function changeUserRotation(id, x, y, z) {
	console.log("changeUserRotation(" + id + ", " + x + ", " + y + ", " + z + ") ...");
	findUser(id).avatar.model.rotation.x = x;
	findUser(id).avatar.model.rotation.y = y;
	findUser(id).avatar.model.rotation.z = z;
	console.log("changeUserRotation(" + id + ", " + x + ", " + y + ", " + z + ") done!");
}

//put the object passed in argument outside of the field of view of the scene and add it to listAvatar
function removeAvatar(avatar){
	console.log("removeAvatar ...");
	console.log(avatar);
	/*avatar.model.position.x = 0;
	avatar.model.position.y = 0; //deep under the scene
	avatar.model.position.z = 0;*/
	listAvatars.push(avatar);
	scene.remove(avatar.model);
	console.log(listAvatars);
	console.log("removeAvatar finished!");
}

function userLeft(id) {
	console.log("userLeft(" + id + ") ...");
	removeAvatar(findUser(id).avatar);
	if (removeFromUserMap(id)) {
		userCount--;
		console.log("userLeft(" + id + "finished successfully!");
		return true;
	}
	console.log("userLeft(" + id + "finished unsuccessfully!");
	return false;
}

function userGotMedia(id, mediaStream) {
	findUser(id)["media"] = mediaStream;
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

//try to move ourUser to the position passed in argument, return true if the move is valid, false otherwise
//function move(x, y, z){
	/*var result = false;
	if (ourUser.avatar.model.position.x < maxX && ourUser.avatar.model.position.x > -maxX) {
		ourUser.avatar.model.position.x = x;
		result = true;
	}
	if (ourUser.avatar.model.position.y < maxY && ourUser.avatar.model.position.y > -maxY) {
		ourUser.avatar.model.position.y = y;
		result = true;
	}
	if (ourUser.avatar.model.position.z < maxZ && ourUser.avatar.model.position.z > -maxZ) {
		ourUser.avatar.model.position.z = z;
		result = true;
	}
	return result;*/
	//ourUser.avatar.model.position.x = x;
	//ourUser.avatar.model.position.y = y;
	//ourUser.avatar.model.position.z = z;
//}

//return the coordinates of the user whose id is passed in argument but false is no user with this id could be found
function getUserPosition(id){ //spookey
	var user = findUser(id);
	console.log("getUserPosition(" + id + ") ...");
	console.log(user);
	if(user == false){
		return false;
	}
	var result = {};
	result["x"] = user.avatar.model.position.x;
	result["y"] = user.avatar.model.position.y;
	result["z"] = user.avatar.model.position.z;
	console.log(result);
	return result;
}

var keysPressed = {};
function onDocumentKeyDown(event) {
	var key = event.key;
	keysPressed[event.key] = true;
	var currentPosition = getUserPosition(myID);
	console.log("Position BEFORE moving : " + currentPosition);
	switch (key) {
		case 'w':
		case 'arrow up':
			if ((keysPressed['d']) || (keysPressed['arrow right'])) {
				changeUserPosition(myID, currentPosition.x + speed, currentPosition.y, currentPosition.z - speed);
				camera.position.x += speed;
				camera.position.z -= speed;
				changeUserRotation(myID,0,135 * Math.PI / 180,0);
			} else if ((keysPressed['a']) || (keysPressed['arrow left'])) {
				changeUserPosition(myID, currentPosition.x - speed, currentPosition.y, currentPosition.z - speed);
				camera.position.x -= speed;
				camera.position.z -= speed;
				changeUserRotation(myID,0,-135 * Math.PI / 180,0);
			} else {
				changeUserPosition(myID, currentPosition.x, currentPosition.y, currentPosition.z - speed);
				camera.position.z -= speed;
				changeUserRotation(myID,0,180 * Math.PI / 180,0);
			}
			break;
		case 's':
		case 'arrow down':
			if ((keysPressed['d']) || (keysPressed['arrow right'])) {
				changeUserPosition(myID, currentPosition.x + speed, currentPosition.y, currentPosition.z + speed);
				camera.position.x += speed;
				camera.position.z += speed;
				changeUserRotation(myID,0,45 * Math.PI / 180,0);
			} else if ((keysPressed['a']) || (keysPressed['arrow left'])) {
				changeUserPosition(myID, currentPosition.x - speed, currentPosition.y, currentPosition.z + speed);
				camera.position.x -= speed;
				camera.position.z += speed;
				changeUserRotation(myID,0,-45 * Math.PI / 180,0);
			} else {
				changeUserPosition(myID, currentPosition.x, currentPosition.y, currentPosition.z + speed);
				camera.position.z += speed;
				changeUserRotation(myID,0,0,0);
			}
			break;
		case 'd':
		case 'arrow right':
			if ((keysPressed['w']) || (keysPressed['arrow up'])) {
				changeUserPosition(myID, currentPosition.x + speed, currentPosition.y, currentPosition.z - speed);
				camera.position.x += speed;
				camera.position.z -= speed;
				changeUserRotation(myID,0,135 * Math.PI / 180,0);
			} else if ((keysPressed['s']) || (keysPressed['arrow down'])) {
				changeUserPosition(myID, currentPosition.x + speed, currentPosition.y, currentPosition.z + speed); 
				camera.position.x += speed;
				camera.position.z += speed;
				changeUserRotation(myID,0,45 * Math.PI / 180,0);
			} else {
				changeUserPosition(myID, currentPosition.x + speed, currentPosition.y, currentPosition.z)
				camera.position.x += speed;
				changeUserRotation(myID,0,90 * Math.PI / 180,0);
			}
			break;
		case 'a':
		case 'arrow left':
			if ((keysPressed['w']) || (keysPressed['arrow up'])) {
				changeUserPosition(myID, currentPosition.x - speed, currentPosition.y, currentPosition.z - speed);
				camera.position.x -= speed;
				camera.position.z -= speed;
				changeUserRotation(myID,0,-135 * Math.PI / 180,0);
			} else if ((keysPressed['s']) || (keysPressed['arrow down'])) {
				changeUserPosition(myID, currentPosition.x - speed, currentPosition.y, currentPosition.z + speed);
				camera.position.x -= speed;
				camera.position.z += speed;
				changeUserRotation(myID,0,-45 * Math.PI / 180,0);
			} else {
				changeUserPosition(myID, currentPosition.x - speed, currentPosition.y, currentPosition.z); 
				camera.position.x -= speed;
				changeUserRotation(myID,0,-90 * Math.PI / 180,0);
			}
			break;
		default:
			break;
	}
	currentPosition = getUserPosition(myID);
	console.log("Position AFTER moving : " + currentPosition);

	camera.position = currentPosition;
	controls.target.set(currentPosition.x, currentPosition.y, currentPosition.z);

	changePos(currentPosition.x, currentPosition.y, currentPosition.z);
}

function onDocumentKeyUp(event) {
	delete keysPressed[event.key];
}

//function to update frame
function update() {
	renderer.render(scene, camera);
	requestID = requestAnimationFrame(update);
}

//function to change name of user.
function nameChange(user, newname) {
	findUser(id).name = newname;
}

function init3D() {
	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0xf0f0f0 );

	// CAMERA
	camera = new THREE.PerspectiveCamera(100, (window.innerWidth / window.outerWidth), 0.1, 1000);
	camera.position.x = 0; camera.position.y = 0; camera.position.z = 70; //camera positions

	//light
	let light = new THREE.PointLight( 0xff0000, 1, 100 );
	let ambientLight = new THREE.AmbientLight( 0xcccccc ); //keep the ambient light. The objects look a lot better
	let directionalLight = new THREE.DirectionalLight( 0xffffff );
	directionalLight.position.set( 50, 50, 50 ).normalize();

	scene.add( light );
	scene.add( ambientLight );
	scene.add( directionalLight );

	// RENDERER
	renderer = new THREE.WebGLRenderer();
	renderer.setSize(window.innerWidth, window.innerHeight - 30);
	renderer.domElement.id = "scene"; // Adds an ID to the canvas element
	document.getElementById("3D").appendChild( renderer.domElement);

	// FLOOR
	let floortext = new THREE.TextureLoader().load( "objects/obj/floor.jpg" );

	let floor = new THREE.Mesh(
		new THREE.PlaneGeometry(maxX * 2, maxZ * 2, maxX * 2, maxZ * 2),
		new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, map: floortext})
	);
	floor.rotation.x += Math.PI / 2; //can rotate the floor/plane
	scene.add( floor );
	allObjects.push(floor);

	//load models
	loader = new THREE.GLTFLoader();

	//addPlant
	const plant = new THREE.Object3D();
	loader.load('objects/obj/planten.glb', function(gltf) {				
		plant.add(gltf.scene);
		plant.scale.x = 20; plant.scale.y = 20; plant.scale.z = 20;
		plant.position.x= 0; plant.position.y = 7; plant.position.z = 10;
		scene.add(plant);
	});

	//add table
	const table = new THREE.Object3D();
	loader.load('objects/obj/table.glb', function(gltf) {				
		table.add(gltf.scene);
		table.scale.x = 20; table.scale.y = 20; table.scale.z = 20;
		table.rotation.y += Math.PI / 2;  
		scene.add(table);
	});
	
	addWalls()
	allObjects.push(table);
	allObjects.push(plant);
	
	document.getElementById("open").hidden = false;

	// ORBITCONTROLS
	controls = new THREE.OrbitControls( camera, renderer.domElement );
	controls.enableKeys = false;
	controls.enablePan = false;
	controls.minDistance = 1;
	controls.maxDistance = 100;
	controls.maxPolarAngle = Math.PI * 0.5; // Does not let you clip through the floor
	controls.minAzimuthAngle = 0; // Prevents left-right rotation of camera
	controls.maxAzimuthAngle = 0; // Prevents left-right rotation of camera

	// FISHTOWN
	makeNewObjects('objects/obj/BlueGoldfish.glb');
	makeNewObjects('objects/obj/BlueGoldfish.glb');
	makeNewObjects('objects/obj/BlueGoldfish.glb');
	makeNewObjects('objects/obj/BlueGoldfish.glb');
	makeNewObjects('objects/obj/BlueGoldfish.glb');

	myID = newUserJoined(0, "test").id;
	ourUser = findUser(myID);

	//for test purposes
	user2 = newUserJoined(1, "test2");
	user3 = newUserJoined(2, "test3");
	user4 = newUserJoined(3, "test4");
	user5 = newUserJoined(4, "test5");
	userLeft(3);
	userLeft(4);
	user4 = newUserJoined(3, "test4");


	listener = new THREE.AudioListener();

	ourUser.avatar.model.add(listener);

	camera.position = ourUser.avatar.model.position;
	controls.target.set(ourUser.avatar.model.position.x, ourUser.avatar.model.position.y, ourUser.avatar.model.position.z);

	update();
}

function leave3D() {

	for (let i in allObjects) {
		if (allObjects[i]) scene.remove(allObjects[i]);
	}

	document.removeEventListener("keydown", onDocumentKeyDown);
	document.removeEventListener("keyup", onDocumentKeyUp);
	if (document.getElementById("scene")) {
		document.getElementById("scene").outerHTML = ''; // Deletes the scene canvas
	}
	controls = null;
	renderer = null;
	camera = null;
	scene = null;
	controls = null;
	geometry = null;
	material = null;
	object = null;
	userCount = 0;
	window.cancelAnimationFrame(requestID); // Stops rendering the scene
	requestID = undefined;
}