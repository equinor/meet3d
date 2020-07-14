var renderer;
var camera;
var scene;
var camera;
var renderer;
var controls;
var geometry;
var material;
var object;
var requestID = undefined;
var userCount = 0;
var listener;
var loader;
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
	console.log("creating object: " + ressource);
	var avatar = {};
	avatar['model'] = new THREE.Object3D();
	loader.load(ressource, function(gltf) { //this could probably be vastly improved
		avatar.model.add(gltf.scene);
		avatar.model.scale.x = 7;
		avatar.model.scale.y = 7;
		avatar.model.scale.z = 7;
		avatar['clips'] = gltf.animations;
		avatar['mixer'] = new THREE.AnimationMixer(gltf.scene);
		avatar['swim'] = avatar.mixer.clipAction(gltf.animations[0]);
		avatar.swim.play();
	});
	listAvatars.push(avatar);
	console.log(listAvatars);
	return avatar;
}

function newUserJoined(id, name){
	console.log("Adding new user to the 3D environment: " + name);
	var user = {};
	user['id'] = id;
	user['name'] = name;
	user['avatar'] = listAvatars.shift();
	user.avatar.model.position.x = 10;
	user.avatar.model.position.y = 10;
	user.avatar.model.position.z = (distance * userCount);
	scene.add(user.avatar.model);
	addToUserMap(user);
	return user;
}

function addToUserMap(User) {
	UserMap[User.id] = User;
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
	if(UserMap[id]){
		return UserMap[id];
	}
	return false;
}

function changeUserPosition(id, x, y, z) {
	findUser(id).avatar.model.position.x = x;
	findUser(id).avatar.model.position.y = y;
	findUser(id).avatar.model.position.z = z;
}

function changeUserRotation(id, x, y, z) {
	findUser(id).avatar.model.rotation.x = x;
	findUser(id).avatar.model.rotation.y = y;
	findUser(id).avatar.model.rotation.z = z;
}

//put the object passed in argument outside of the field of view of the scene and add it to listAvatar
function removeAvatar(avatar){
	listAvatars.push(avatar);
	scene.remove(avatar.model);
}

function userLeft(id) {
	removeAvatar(findUser(id).avatar);
	if (removeFromUserMap(id)) {
		userCount--;
		return true;
	}
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

//return the coordinates of the user whose id is passed in argument but false is no user with this id could be found
function getUserPosition(id){
	var user = findUser(id);
	if(user == false){
		return false;
	}
	var result = {};
	result["x"] = user.avatar.model.position.x;
	result["y"] = user.avatar.model.position.y;
	result["z"] = user.avatar.model.position.z;
	return result;
}

var keysPressed = {};
function onDocumentKeyDown(event) {
	var key = event.key;
	keysPressed[event.key] = true;
	var currentPosition = getUserPosition(myID);
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

	// Users' models
	makeNewObjects('objects/Anglerfish/Anglerfish.glb');
	makeNewObjects('objects/ArmoredCatfish/ArmoredCatfish.glb');
	makeNewObjects('objects/Betta/Betta.glb');
	makeNewObjects('objects/BlackLionFish/BlackLionFish.glb');
	makeNewObjects('objects/Blobfish/Blobfish.glb');
	makeNewObjects('objects/BlueGoldfish/BlueGoldfish.glb');
	makeNewObjects('objects/BlueTang/BlueTang.glb');
	makeNewObjects('objects/ButterflyFish/ButterflyFish.glb');
	makeNewObjects('objects/CardinalFish/CardinalFish.glb');
	makeNewObjects('objects/Clownfish/Clownfish.glb');
	makeNewObjects('objects/CoralGrouper/CoralGrouper.glb');
	makeNewObjects('objects/Cowfish/Cowfish.glb');
	makeNewObjects('objects/Flatfish/Flatfish.glb');
	makeNewObjects('objects/FlowerHorn/FlowerHorn.glb');
	makeNewObjects('objects/GoblinShark/GoblinShark.glb');
	makeNewObjects('objects/Goldfish/Goldfish.glb');
	makeNewObjects('objects/Humphead/Humphead.glb');
	makeNewObjects('objects/Koi/Koi.glb');
	makeNewObjects('objects/Lionfish/Lionfish.glb');
	makeNewObjects('objects/MandarinFish/MandarinFish.glb');
	makeNewObjects('objects/MoorishIdol/MoorishIdol.glb');
	makeNewObjects('objects/ParrotFish/ParrotFish.glb');
	makeNewObjects('objects/Piranha/Piranha.glb');
	makeNewObjects('objects/Puffer/Puffer.glb');
	makeNewObjects('objects/RedSnapper/RedSnapper.glb');
	makeNewObjects('objects/RoyalGramma/RoyalGramma.glb');
	makeNewObjects('objects/Shark/Shark.glb');
	makeNewObjects('objects/Sunfish/Sunfish.glb');
	makeNewObjects('objects/Swordfish/Swordfish.glb');
	makeNewObjects('objects/Tang/Tang.glb');
	makeNewObjects('objects/Tetra/Tetra.glb');
	makeNewObjects('objects/Tuna/Tuna.glb');
	makeNewObjects('objects/Turbot/Turbot.glb');
	makeNewObjects('objects/YellowTang/YellowTang.glb');
	makeNewObjects('objects/ZebraClownFish/ZebraClownFish.glb');

	myID = newUserJoined(0, "test").id;
	ourUser = findUser(myID);

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
	scene = null;
	camera = null;
	renderer = null;
	controls = null;
	geometry = null;
	material = null;
	object = null;
	userCount = 0;
	window.cancelAnimationFrame(requestID); // Stops rendering the scene
	requestID = undefined;
}