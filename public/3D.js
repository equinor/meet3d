// GLOBAL CONSTANTS
const distance = 15; // This is currently not used
const maxX = 100;
const maxY = 100; // This is probably not needed
const maxZ = 100;
const speed = 3;
const wallHeight = 100;
const objectScale = 7;
const videoCount = 3;
const objectWidth = 10; // Probably not needed
const objectHeight = 20; // Probably not needed


// GLOBAL VARIABLES
var scene;
var camera;
var renderer;
var controls;

var requestID = undefined;
var userCount = 0; // FIXME Do we need this?
var listener;
var loader;

var objectSize = new THREE.Vector3(); // A Vector3 representing size of each 3D-object

let wallLeft;
let wallRight;
let wallFront;

var moveForward = false;
var moveBackward = false;
var moveLeft = false;
var moveRight = false;

var prevUpdateTime = performance.now();
var prevPosTime = performance.now();
var velocity = new THREE.Vector3();
var direction = new THREE.Vector3();


// GLOBAL CONTAINERS
var UserMap = {}; //json-object to store the Users

var allObjects = []; // Stores all 3D objects so that they can be removed later

var videoList = []; // The list of remote videos to display
var videoListLength = 0; // The number of videos to show at a time, not including our own

listAvatars = [];

const resourceList = ['objects/obj/pawn.glb']; //List of 3D-object-files
var resourceIndex = 0;



function init3D() {
	scene = new THREE.Scene();
	scene.background = new THREE.Color(0xf0f0f0);

	// CAMERA
	camera = new THREE.PerspectiveCamera(100, (window.innerWidth / window.outerWidth), 0.1, 1000);
	camera.position.y = 30;

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
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize(window.innerWidth, window.innerHeight - 30);
	renderer.domElement.id = "scene"; // Adds an ID to the canvas element
	document.getElementById("3D").appendChild(renderer.domElement);

	// FLOOR
	let floortext = new THREE.TextureLoader().load( "objects/obj/floor.jpg" );

	let floor = new THREE.Mesh(
		new THREE.PlaneGeometry(maxX * 2, maxZ * 2, maxX * 2, maxZ * 2),
		new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, map: floortext })
	);
	floor.rotation.x += Math.PI / 2; //can rotate the floor/plane
	scene.add(floor);
	allObjects.push(floor);

	//load models
	loader = new THREE.GLTFLoader();

	controls = new THREE.PointerLockControls( camera, document.body );
	scene.add(controls.getObject());

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

	window.addEventListener( 'resize', onWindowResize, false );
	document.addEventListener( 'keydown', onDocumentKeyDown, false );
	document.addEventListener( 'keyup', onDocumentKeyUp, false );

	addWalls()
	allObjects.push(table);
	allObjects.push(plant);

	changeModeButton.hidden = false; // Allows the user to open the 3D environment

	listener = new THREE.AudioListener();

	controls.getObject().add(listener)

	userCount++;

	update();
}

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

function getVideoList() {
	return videoList.slice(0, videoListLength);
}

// Add username as text on top of 3D-object
function addText(name, model) {
	var text = new THREE.Mesh();
	var loader = new THREE.FontLoader();
	loader.load('helvetiker_regular.typeface.json', function(font) {

		let color = 0x990000;

		let textMaterial = new THREE.MeshBasicMaterial({
			color: color,
			transparent: true,
			opacity: 1.0,
			side: THREE.DoubleSide
		});

		const letterSize = 2;

		// Creates an array of Shapes representing nameShowed
		let shapes = font.generateShapes(name, letterSize / objectScale);

		let textGeometry = new THREE.ShapeBufferGeometry(shapes);

		// Set center of text object equal to center of 3D-text-object
		textGeometry.computeBoundingBox();
		textGeometry.center();

		// Determine position of text object realtive to 3D-object
		textGeometry.translate(0, (objectSize.y + letterSize) / objectScale, 0);

		text = new THREE.Mesh(textGeometry, textMaterial);
		text.name = "text";
		model.add(text);
	});
} // end of function addText()


//return true if a User with the id passed in parameter was a part of the UserMap and removed, false otherwise
function removeUser(id) {
	delete UserMap[id];
}

// Returns the user object corresponding to the given user ID
function findUser(id) {
	return UserMap[id];
}

function newUserJoined(id, name) {
	console.log("Adding new user to the 3D environment: " + name);
	let newUser = {};

	newUser['name'] = name;
	newUser['avatar'] = loadNewObject(resourceList[resourceIndex]);
	resourceIndex++;
	resourceIndex %= resourceList.length; // Make sure the index never exceeds the size of the list
	
	//newUser['text'] = addText(name, newUser.avatar.model);
	addText(name, newUser.avatar.model);

	// Add new user to UserMap
	UserMap[id] = newUser;
	userCount++;

	//scene.add(newUser.avatar.model);

	updateVideoList(id);
}

function changeUserPosition(id, x, y, z) {
	findUser(id).avatar.model.position.x = x;
	findUser(id).avatar.model.position.y = y;
	findUser(id).avatar.model.position.z = z;
	if (connections[id].stream) {
		updateVideoList(id);
	}
}

function setUserRotation(id, angleY) {
	findUser(id).avatar.model.rotation.y = angleY;
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
	// FIXME Might not need " || id == ourID"
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
			if (/*testID == ourID ||*/ !connections[testID].stream || videoList.includes(testID)) {
				continue; // Ignore our own user, those who do not have video and those already in the list
			}

			let shiftedID = shiftVideoList(testID); // Try to add 'testID' to the list

			if (shiftedID !== 0) { // Someone was shifted out of the list, which means 'testID' was added
				if (videoListLength < videoCount) { // If there is more room, add them in at the end
					videoList[videoListLength] = shiftedID;
					videoListLength++;
				}
			} else { // No one was removed from the list, which means 'testID' was not added
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

/**
 * Inserts an ID into the videoList, shifting the later elements along. If any
 * element gets shifted out of the array then their ID is returned, and 0 otherwise
 */
function shiftVideoList(id) {

	let thisDistance = getDistanceSquared(id);
	let shiftedID = 0;
	for (let i = 0; i < videoListLength; i++) {

		if (shiftedID) { // If an ID has been inserted, shift the later entries along
			let tempID = shiftedID
			shiftedID = videoList[i];
			videoList[i] = tempID;
		}	else if (getDistanceSquared(videoList[i]) >= thisDistance) {
			// If the user 'id' is closer than the current entry then replace the entry and shift it along
			shiftedID = videoList[i];
			videoList[i] = id;
		}
	}
	return shiftedID; // Return the shifted ID or 0 otherwise
}

/**
 * Gets a number representing the distance between the user with ID 'id' and our
 * user in the 3D space.
 */
function getDistance(id) {
	let otherUser = findUser(id);
	return Math.abs(otherUser.getxPosition() - camera.position.x) ** 2 +
		Math.abs(otherUser.getyPosition() - camera.position.y) ** 2 +
		Math.abs(otherUser.getzPosition() - camera.position.z) ** 2;
}

function userGotMedia(id, mediaStream) {
	findUser(id)["media"] = mediaStream;
	var posAudio = new THREE.PositionalAudio(listener);
	posAudio.setRefDistance(20);
	posAudio.setRolloffFactor(2);
	const audio1 = posAudio.context.createMediaStreamSource(mediaStream);

	try {
		posAudio.setNodeSource(audio1);
		findUser(id).avatar.model.add(posAudio);
	} catch(err) {
		console.log(err);
	};
}

function userLeft3D(id) {
	scene.remove(findUser(id).avatar.model);
	if(removeUser(id)) {
		userCount--;
	}
}


// Load 3D-object from file "resource" and add it to scene
function loadNewObject(ressource){
	console.log("loading object from: " + ressource);
	let avatar = {};
	avatar['model'] = new THREE.Object3D();
	loader.load(ressource, function(gltf) { // this could probably be vastly improved
		avatar.model.add(gltf.scene);
		avatar.model.scale.x = objectScale;
		avatar.model.scale.y = objectScale;
		avatar.model.scale.z = objectScale;

		//FIXME errors when these are uncommented
		//avatar['clips'] = gltf.animations;
		//avatar['mixer'] = new THREE.AnimationMixer(gltf.scene);
		//avatar['swim'] = avatar.mixer.clipAction(gltf.animations[0]);
		//avatar.swim.play(); // FIXME Currently not working

		let boundingBox = new THREE.Box3().setFromObject(avatar.model);
		objectSize = boundingBox.getSize(); // Returns Vector3
		
		scene.add(avatar.model);
		allObjects.push(avatar.model);
	});
	//listAvatars.push(avatar); // DELETE ME Probably not needed
	return avatar;
}

function onDocumentKeyDown(event) {
	switch (event.keyCode) {

		case 87: //w
			moveForward = true;
			break;

		case 65: // a
			moveLeft = true;
			break;

		case 83: // s
			moveBackward = true;
			break;

		case 68: // d
			moveRight = true;
			break;

		case 38://up
			console.log("locking mouse");
			controls.lock();
			document.removeEventListener("keyup", swapViewOnC);
			break;

		case 40: // down
			console.log("unlocking mouse");
			controls.unlock();
			break;
	}
}

function onDocumentKeyUp(event) {
	switch ( event.keyCode ) {

		case 87: // w
			moveForward = false;
			break;

		case 65: // a
			moveLeft = false;
			break;

		case 83: // s
			moveBackward = false;
			break;

		case 68: // d
			moveRight = false;
			break;
	}
}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight - 30 );
}


//function to update frame
function update() {
	requestID = requestAnimationFrame(update);
	if (controls.isLocked === true){
		document.removeEventListener("keyup", swapViewOnC); // this is not looking too great at the moment
		var time = performance.now();
		var delta = ( time - prevUpdateTime ) / 1000;

		// Only do this if position is changed?
		if ( time - prevPosTime > 100 ) {
			changePos(camera.position.x, 0, camera.position.z);
			prevPosTime = time;

			for(let keyId in UserMap) {
				UserMap[keyId].avatar.model.getObjectByName('text').lookAt(camera.position.x, 0, camera.position.z);
			}

			// Add functionality to update direction based on camera direction OR movement direction
		}

		velocity.x -= velocity.x * 10.0 * delta;
		velocity.z -= velocity.z * 10.0 * delta;

		direction.z = Number( moveForward ) - Number( moveBackward );
		direction.x = Number( moveRight ) - Number( moveLeft );
		direction.normalize(); // this ensures consistent movements in all directions

		if ( moveForward || moveBackward ) velocity.z -= direction.z * 400.0 * delta;
		if ( moveLeft || moveRight ) velocity.x -= direction.x * 400.0 * delta;

		controls.moveRight( - velocity.x * delta );
		controls.moveForward( - velocity.z * delta );

		prevUpdateTime = time;
	} else {
		document.addEventListener("keyup", swapViewOnC);
	}

	renderer.render(scene, camera);
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
	
	window.cancelAnimationFrame(requestID); // Stops rendering the scene
	scene = null;
	camera = null;
	renderer = null;
	controls = null;
	requestID = undefined;
	userCount = 0;
	listener = null;
	loader = null;
	UserMap = {};
	allObjects = [];
	videoList = [];
	listAvatars = [];
	resourceIndex = 0;
}
