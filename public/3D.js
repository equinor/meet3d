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
var dt;
var lastframe = Date.now()
//var mixer;
//var group;


var listAvatars = ["objects/Anglerfish/Anglerfish.glb","objects/ArmoredCatfish/ArmoredCatfish.glb","objects/Betta/Betta.glb", "objects/BlackLionFish/BlackLionFish.glb", "objects/Blobfish/Blobfish.glb", "objects/BlueGoldfish.glb", "objects/Clownfish.glb",
"objects/Flatfish/Flatfish.glb", "objects/FlowerHorn/FlowerHorn.glb", "objects/GoblinShark/GoblinShark.glb", "objects/Goldfish/Goldfish.glb",
"objects/Huphhead/HumphHead.glb", "objects/Koi/Koi.glb", "objects/Lionfish/Lionfish.glb", "objects/MandarinFish/MandarinFish.glb",
"objects/MoorishIdol/MoorishIdol.glb","objects/ParrotFish/ParrotFish.glb", "objects/Piranha/Piranha.glb", "objects/Puffer/Puffer.glb",
"objects/RedSnapper/RedSnapper.glb", "objects/RoyalGramma/RoyalGramma.glb", "objects/Shark/Shark.glb", "objects/Sunfish/Sunfish.glb",
"objects/Swordfish/Swordfish.glb", "objects/Tang/Tang.glb", "objects/Tetra/Tetra.glb", "objects/Tuna/Tuna.glb", "objects/Turbot/Turbot.glb",
"objects/YellowTang/YellowTang", "objects/ZebraClownFish/ZebraClownFish.glb"];
var UserMap = {};

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

function newUserJoined(id, name){
	console.log("Adding new user to the 3D environment: " + name);
	var user = {};
	user['id'] = id;
	user['name'] = name;
	var avatar = {};
	avatar['ressource'] = listAvatars.shift();
	avatar['model'] = new THREE.Object3D();
	loader.load(avatar.ressource, function(gltf) { //this could probably be vastly improved
		/*group.add(gltf.scene);
		mixer = new THREE.AnimationMixer(group);
		var action = mixer.clipAction(gltf.animations[0]);
		action.play();	
		avatar.model.add(gltf.scene);
		avatar.model.position.x = 10;
		avatar.model.position.y = 10;
		avatar.model.position.z = (distance * userCount);
		avatar.model.scale.x =7;
		avatar.model.scale.y =7;
		avatar.model.scale.z =7;
		scene.add(avatar.model);
		userCount++;*/
		avatar.model.add(gltf.scene);
		avatar.model.position.x = 10;
		avatar.model.position.y = 10;
		avatar.model.position.z = (distance * userCount);
		avatar.model.scale.x =7;
		avatar.model.scale.y =7;
		avatar.model.scale.z =7;
		scene.add(avatar.model);
		userCount++;
		avatar['mixer'] = new THREE.AnimationMixer(avatar.model);
		avatar['action'] = avatar.mixer.clipAction(gltf.animations[0]);
		avatar.action.play();
	});
	user['avatar'] = avatar;
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
	listAvatars.push(avatar.ressource);
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
	dt = (Date.now()-lastframe)/1000
	for(u in UserMap){
		if(findUser(u).avatar.mixer){
			findUser(u).avatar.mixer.update(dt);
		}
	}
	/*if(ourUser.avatar.mixer){
    	ourUser.avatar.mixer.update(dt)        
	}*/
	renderer.render( scene, camera );
	lastframe=Date.now()
	requestID = requestAnimationFrame(update);
}

//function to change name of user.
function nameChange(id, newname) {
	findUser(id).name = newname;
}

function getDistance(id) {
	let otherUserPosition = getUserPosition(findUser(id));
	let ourPosition = getUserPosition(ourUser);
	return Math.abs(otherUserPosition.x - ourPosition.x) +
		Math.abs(otherUserPosition.y - ourPosition.y) +
		Math.abs(otherUserPosition.z - ourPosition.z);
}

/**
 * Inserts an ID into the videoList, shifting the later elements along. If any
 * element gets shifted out of the array then their ID is returned, and 0 otherwise
 */
function shiftVideoList(id) {

	let thisDistance = getDistance(id);
	let shiftedID = 0;
	for (let i = 0; i < videoListLength; i++) {

		if (shiftedID) { // If an ID has been inserted, shift the later entries along
			let tempID = shiftedID
			shiftedID = videoList[i];
			videoList[i] = tempID;
		}	else if (getDistance(videoList[i]) >= thisDistance) {
			// If the user 'id' is closer than the current entry then replace the entry and shift it along
			shiftedID = videoList[i];
			videoList[i] = id;
		}
	}
	return shiftedID; // Return the shifted ID or 0 otherwise
}

/**
 * This function updates the list of videos to display on the screen. Only the
 * 'videoCount' number of videos closest to the user are displayed. This is
 * done using a basic insertion sort algorithm.
 */
function updateVideoList(id) {

	if (connections[id] && !connections[id].stream) {
		return; // Ignore users who do not share video
	}

	if (videoList.includes(id) || id == ourID) { // In this case we need to update the entire list using all positions
		for (let i = 0; i < videoListLength; i++) {
	    let id = videoList[i];
			if (id && connections[id] && connections[id].stream) {
				document.getElementById(connections[id].stream.id).hidden = true; // Hide currently shown videos
				document.getElementById(connections[id].stream.id).children[0].autoplay = false;
			}
	  }

		videoList = []; // Reset the list of videos to display
		videoListLength = 0;
		for (const testID in UserMap) {
			if (testID == ourID || !connections[testID].stream || videoList.includes(testID)) {
				continue; // Ignore our own user, those who do not have video and those already in the list
			}

			let shiftedID = shiftVideoList(testID); // Try to add 'testID' to the list

			if (shiftedID !== 0) { // Someone was shifted out of the list, which means 'testID' was added
				if (videoListLength < videoCount) { // If there is more room, add them in at the end
					videoList[videoListLength] = shiftedID;
					videoListLength++;
				}
			} else { // Noone was removed from the list, which means 'testID' was not added
				if (videoListLength < videoCount) {
					videoList[videoListLength] = testID;
					videoListLength++;
				}
			}
		}
	} else if (videoListLength < videoCount) { // The list is not full so just add the user
		let shifted = shiftVideoList(id);
		if (shifted) {
			videoList[videoListLength] = shifted; // Re-add the user that was shifted out
		} else {
			videoList[videoListLength] = id; // Add the current ID at the end
		}
		videoListLength++;
	} else { // Try to fit the user into the list, and if it succeeds then hide the user that was shifted out
		let shiftedID = shiftVideoList(id);
		if (shiftedID !== 0) { // Someone was shifted out of the list, so we hide them
			document.getElementById(connections[shiftedID].stream.id).hidden = true;
			document.getElementById(connections[shiftedID].stream.id).autoplay = false;
		}
	}
	updateVideoVisibility(); // Updates the HTML so that only the users in the list are shown
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

	//group = new THREE.AnimationObjectGroup();

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

	document.getElementById("changeMode").hidden = false;

	// ORBITCONTROLS
	controls = new THREE.OrbitControls( camera, renderer.domElement );
	controls.enableKeys = false;
	controls.enablePan = false;
	controls.minDistance = 1;
	controls.maxDistance = 100;
	controls.maxPolarAngle = Math.PI * 0.5; // Does not let you clip through the floor
	controls.minAzimuthAngle = 0; // Prevents left-right rotation of camera
	controls.maxAzimuthAngle = 0; // Prevents left-right rotation of camera

	myID = newUserJoined(0, "test").id;
	ourUser = findUser(myID);

	newUserJoined(1, "1");
	newUserJoined(2, "2");
	newUserJoined(3, "3");
	newUserJoined(4, "4");

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