import * as THREE from './three.module.js';
import { GLTFLoader } from './GLTFLoader.js';
import { PointerLockControls } from './PointerLockControls.js';

// GLOBAL HTML-elements
var roomVideo = document.getElementById("roomVideo");
var summerInternsVideo = document.getElementById("summerInterns2020");
var shuttleAnimationVideo = document.getElementById("shuttleAnimation");

// GLOBAL CONSTANTS
const maxX = 100;
const maxZ = 100;
const wallHeight = 100;
const objectScale = 7;
const videoCount = 3; // The number of videos to show on the side of the screen, not including ours

// GLOBAL VARIABLES
var scene;
var camera;
var renderer;
var controls;
var tv; // The object which stores the screen sharing video

var requestID;
var listener;
var loader;
var time;

var objectSize = new THREE.Vector3(); // A Vector3 representing size of each 3D-object

var moveForward = false;
var moveBackward = false;
var moveLeft = false;
var moveRight = false;
var moveUp = false;
var moveDown = false;

var prevUpdateTime = performance.now();
var prevPosTime = performance.now();
var velocity = new THREE.Vector3();
var direction = new THREE.Vector3();
var videoWidth = 0; // The width that is used up by videos on the side
var speed = 400.0; // The speed at which we move

var ourID;
var videoListLength = 0; // The number of videos to show at a time, not including our own

// GLOBAL CONTAINERS
var UserMap = {}; // JS-object to store the users' 3D information
var connections; // JS-object to store the user network connections
var allObjects = []; // Stores all 3D objects so that they can be removed later
var videoList = []; // The list of remote videos to display
const resourceList = ["objects/Anglerfish/Anglerfish.glb", "objects/ArmoredCatfish/ArmoredCatfish.glb", "objects/Betta/Betta.glb",
"objects/BlackLionFish/BlackLionFish.glb", "objects/Blobfish/Blobfish.glb", "objects/BlueGoldfish/BlueGoldfish.glb", "objects/Clownfish/Clownfish.glb",
"objects/Flatfish/Flatfish.glb", "objects/FlowerHorn/FlowerHorn.glb", "objects/GoblinShark/GoblinShark.glb", "objects/Goldfish/Goldfish.glb",
"objects/Huphhead/HumphHead.glb", "objects/Koi/Koi.glb", "objects/Lionfish/Lionfish.glb", "objects/MandarinFish/MandarinFish.glb",
"objects/MoorishIdol/MoorishIdol.glb", "objects/ParrotFish/ParrotFish.glb", "objects/Piranha/Piranha.glb", "objects/Puffer/Puffer.glb",
"objects/RedSnapper/RedSnapper.glb", "objects/RoyalGramma/RoyalGramma.glb", "objects/Shark/Shark.glb", "objects/Sunfish/Sunfish.glb",
"objects/Swordfish/Swordfish.glb", "objects/Tang/Tang.glb", "objects/Tetra/Tetra.glb", "objects/Tuna/Tuna.glb", "objects/Turbot/Turbot.glb",
"objects/YellowTang/YellowTang.glb", "objects/ZebraClownFish/ZebraClownFish.glb"]; //List of 3D-object-files


async function init3D(id, connectionsObject, div) {
	ourID = id;
	connections = connectionsObject;

	scene = new THREE.Scene();

	// CAMERA
	camera = new THREE.PerspectiveCamera(75, (window.innerWidth / window.outerWidth), 0.1, 300000);
	camera.position.y = wallHeight / 3;

	// GLTF LOADER
	loader = new GLTFLoader();

	// ADD SCENERY
	addLighting()
	addSkyBox();
	addWalls();
	addDecoration();

	// RENDERER
	renderer = new THREE.WebGLRenderer({alpha: true, antiAliasing: true});
	renderer.setClearColor( 0x000000, 0 );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize(window.innerWidth, window.innerHeight - 30);
	renderer.domElement.id = "scene"; // Adds an ID to the canvas element
	div.appendChild(renderer.domElement);

	// CAMERA CONTROLS
	controls = new PointerLockControls( camera, div );
	scene.add(controls.getObject());
	allObjects.push(controls.getObject());
	
	listener = new THREE.AudioListener();
	controls.getObject().add(listener)
	
	addVideofile( roomVideo, 0, wallHeight / 2, maxZ - 1, Math.PI );
	addVideofile( summerInternsVideo, 3 * maxX, 20, - 2 * maxZ, - Math.PI / 8 );
	addVideofile( shuttleAnimationVideo, - 3 * maxX, 20, - 2 * maxZ, Math.PI / 8 );

	updateVideofilesPlayed();

	window.addEventListener( 'resize', onWindowResize, false );
	document.addEventListener( 'keydown', onDocumentKeyDown, false );
	document.addEventListener( 'keyup', onDocumentKeyUp, false );

	renderer.render(scene, camera);

	update();
}

//called to preserve avatar coherence among all users, can only be executed once
var reserveResource = (function() {
	var executed = false;
	var resource;
    return function() {
        if (!executed) {
            executed = true;
			resource = resourceList.shift();
			console.log("We have reserved our resource!");
		}
		return resource;
    };
})();

function getVideoRatio(height, width) {
	let ratio = width / height;

	// This block of code makes the video fit the screen whilst maintaining the original aspect ratio
	if (height > wallHeight) {
		let width2 = wallHeight * ratio;
		if (width2 > maxX * 2) {
			height = (maxX * 2) / ratio;
			width = maxX * 2
		} else {
			width = width2;
			height = wallHeight;
		}
	}	else if (width > maxX * 2) {
		let height2 = (maxX * 2) / ratio;
		if (height2 > wallHeight) {
			width = wallHeight / ratio;
			height = wallHeight;
		} else {
			width = maxX * 2;
			height = height2;
		}
	}
	return { height: height, width: width };
}

function addPositionalAudioToObject(stream, object) {
	let posAudio = new THREE.PositionalAudio(listener);
	posAudio.setRefDistance(20);
	posAudio.setRolloffFactor(2);

	let n = document.createElement("audio"); // Create HTML element to store audio stream
	n.srcObject = stream;
	n.muted = true; // We only want audio from the positional audio

	const audioObj = posAudio.context.createMediaStreamSource(n.srcObject);

	try {
		posAudio.setNodeSource(audioObj);
		object.model.add(posAudio);
	} catch(err) {
		console.error(err);
	}
	return n;
}

/**
 * Places the given video stream in the 3D environment. If it is null, then we
 * only remove the existing one.
 */
async function updateShareScreen3D(screenTrack, details, name) {
	scene.remove(tv);
	if (screenTrack) { // If someone is sharing their screen, display it
		let stream = new MediaStream([screenTrack]);
		let screenObject = document.createElement("video")
		screenObject.autoplay = true;
		screenObject.srcObject = stream;

		let texture = new THREE.VideoTexture(screenObject);
		texture.minFilter = THREE.LinearFilter;
		texture.magFilter = THREE.LinearFilter;
		texture.format = THREE.RGBFormat;

		let ratio = getVideoRatio(details.height, details.width);

		tv = new THREE.Mesh(
			new THREE.PlaneBufferGeometry(ratio.width, ratio.height, 1, 1),
			new THREE.MeshBasicMaterial( { side: THREE.DoubleSide, map: texture } )
		);
		tv.position.z = -(maxZ - 1);
		tv.position.y += wallHeight / 2;

		scene.add(tv);
		allObjects.push(tv);
	}
}

function addSkyBox() {
	let urls = [
		"objects/obj/sh_ft.png", "objects/obj/sh_bk.png",
		"objects/obj/sh_up.png", "objects/obj/sh_dn.png",
		"objects/obj/sh_rt.png", "objects/obj/sh_lf.png"
	];

	let loader = new THREE.CubeTextureLoader();
	scene.background = loader.load(urls);

	//Extra floor to make rooom look real.
	let textureLoader = new THREE.TextureLoader();
	let floortext = textureLoader.load( "objects/obj/sh_dn.png" );
	floortext.wrapS = THREE.RepeatWrapping;
	floortext.wrapT = THREE.RepeatWrapping;
	floortext.repeat.set( 100,100 );
	let floor = new THREE.Mesh(
		new THREE.PlaneGeometry(10000,10000),
		new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, map: floortext })
	);
	floor.rotation.x += Math.PI / 2;
	floor.position.y = 0;
	scene.add(floor);
}

function addLighting() {
	let light = new THREE.PointLight( 0xff0000, 1, 100 );
	let ambientLight = new THREE.AmbientLight( 0xcccccc ); //keep the ambient light. The objects look a lot better
	let directionalLight = new THREE.DirectionalLight( 0xffffff );
	directionalLight.position.set( 50, 50, 50 ).normalize();

	scene.add( light );
	scene.add( ambientLight );
	scene.add( directionalLight );
	allObjects.push(light);
	allObjects.push(ambientLight);
	allObjects.push(directionalLight);
}

function addWalls() {
	let textureLoader = new THREE.TextureLoader();

	// FLOOR
	let floortext = textureLoader.load( "objects/obj/floor.jpg" );
	let floor = new THREE.Mesh(
		new THREE.PlaneGeometry(maxX * 2, maxZ * 2, maxX * 2, maxZ * 2),
		new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, map: floortext })
	);
	floor.rotation.x += Math.PI / 2; //can rotate the floor/plane
	floor.position.y = 1;
	scene.add(floor);
	allObjects.push(floor);

	// CEILING
	let ceilingtext = textureLoader.load( "objects/obj/ceiling2.jpg" );
	let ceiling = new THREE.Mesh(
		new THREE.PlaneGeometry(maxX * 2, maxZ * 2, maxX * 2, maxZ * 2),
		new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, map: ceilingtext })
	);
	ceiling.rotation.x += Math.PI / 2; //can rotate the floor/plane
	ceiling.position.y += wallHeight;
	scene.add(ceiling);
	allObjects.push(ceiling);

	// WALLS
	let walltext = textureLoader.load( "objects/obj/wall1.jpg" );

	let wallLeft = new THREE.Mesh(
		new THREE.PlaneGeometry(maxX * 2, wallHeight, 1, 1),
		new THREE.MeshBasicMaterial( { side: THREE.DoubleSide, map: walltext } )
	);
	wallLeft.rotation.y += Math.PI / 2;
	wallLeft.position.x = -maxX;
	wallLeft.position.y += wallHeight / 2;

	let wallRight = new THREE.Mesh(
		new THREE.PlaneGeometry(maxX * 2, wallHeight, 1, 1),
		new THREE.MeshBasicMaterial( { side: THREE.DoubleSide, map: walltext } )
	);
	wallRight.rotation.y += Math.PI / 2;
	wallRight.position.x = maxX;
	wallRight.position.y += wallHeight / 2;

	let wallBack = new THREE.Mesh(
		new THREE.PlaneGeometry(maxX * 2, wallHeight, 1, 1),
		new THREE.MeshBasicMaterial( { side: THREE.DoubleSide, map: walltext } )
	);
	wallBack.position.z = maxZ;
	wallBack.position.y += wallHeight / 2;

	let wallFront = new THREE.Mesh(
		new THREE.PlaneBufferGeometry(maxX * 2, wallHeight, 1, 1),
		new THREE.MeshBasicMaterial( { side: THREE.DoubleSide, map: walltext } )
	);
	wallFront.position.z = -maxZ;
	wallFront.position.y += wallHeight / 2;

	scene.add( wallLeft );
	scene.add( wallRight );
	scene.add( wallBack );
	scene.add( wallFront );
	allObjects.push( wallLeft );
	allObjects.push( wallRight );
	allObjects.push( wallBack );
	allObjects.push( wallFront );
}

function addVideofile(videofile, xPos, yPos, zPos, rotation = 0) {
videofile.play(); // FIXME This should be synchronized between users

	let Vtexture = new THREE.VideoTexture(videofile);
	let geometry = new THREE.PlaneGeometry(50,50,50);
	let Vmaterial = new THREE.MeshBasicMaterial ({side: THREE.DoubleSide, map: Vtexture}); //FIXME! WANT TO PLACE VIDEO HEREmap: video)
	let videoPlane = new THREE.Mesh(geometry, Vmaterial);
	
	videoPlane.position.x = xPos;
	videoPlane.position.y = yPos;
	videoPlane.position.z = zPos;
	videoPlane.rotation.y = rotation;
	
	let vPosAudio = new THREE.PositionalAudio(listener);
	vPosAudio.setRefDistance(100);
	vPosAudio.setRolloffFactor(3);
	vPosAudio.setDistanceModel("exponential");
	vPosAudio.setDirectionalCone(rotation - Math.PI/2, rotation + Math.PI/2, 0.1); // FIXME This currently does not work
	
	const audio2 = vPosAudio.context.createMediaStreamSource(videofile.mozCaptureStream());
	
	try {
		vPosAudio.setNodeSource(audio2);
		videoPlane.add(vPosAudio);
		scene.add(videoPlane);
	} catch(err) {
		console.error(err);
 };

}


function addDecoration() {
	// PLANT
	const plant = new THREE.Object3D();
	loader.load('objects/obj/planten.glb', function(gltf) {
		plant.add(gltf.scene);
		plant.scale.x = 20; plant.scale.y = 20; plant.scale.z = 20;
		plant.position.x= 0; plant.position.y = 7; plant.position.z = 10;
		scene.add(plant);
	});

	// TABLE
	let table = new THREE.Object3D();
	loader.load('objects/obj/table.glb', function(gltf) {
		table.add(gltf.scene);
		table.scale.x = 20; table.scale.y = 20; table.scale.z = 20;
		table.rotation.y += Math.PI / 2;
		scene.add(table);
	});

	allObjects.push(table);
	allObjects.push(plant);
}

// Add username as text on top of 3D-object
async function addText(name, model) {
	var fontLoader = new THREE.FontLoader();
	fontLoader.load('helvetiker_regular.typeface.json', function(font) {

		let color = 0x990000;

		let textMaterial = new THREE.MeshBasicMaterial({
			color: color,
			transparent: true,
			opacity: 1.0,
			side: THREE.DoubleSide
		});

		const letterSize = 2;

		// Creates an array of Shapes representing name
		let shapes = font.generateShapes(name, letterSize / objectScale);

		let textGeometry = new THREE.ShapeBufferGeometry(shapes);

		// Set center of text object equal to center of 3D-text-object
		textGeometry.computeBoundingBox();
		textGeometry.center();

		// Determine position of text object relative to 3D-object
		textGeometry.translate(0, (objectSize.y + letterSize) / objectScale, 0);

		let text = new THREE.Mesh(textGeometry, textMaterial);
		text.name = "text";
		model.add(text);
	});
} // end of function addText()

async function newUserJoined3D(id, name, resource) {
	if (name == null || name === '' || typeof name !== "string") {
		return false; // Name needs to be a non-empty string
	}

	var newUser = {};
	newUser.name = name;
	if (resourceList.find(element => element == resource)) {
		newUser.resource = resourceList.splice(resourceList.indexOf(resource), 1);
		console.log("Adding new user to the 3D environment: " + name + ", with resource: " + avatar.resource);
	} else {
		newUser.resource = resourceList.shift();
		console.log("Adding new user to the 3D environment: " + name + ", without resource");
	}
	newUser.avatar = loadNewObject(newUser.resource);

	addText(name, newUser.avatar.model);

	UserMap[id] = newUser; // Add new user to UserMap

	updateVideoList(id);
	return true;
}

// Load 3D-object from file "resource" and add it to scene
function loadNewObject(resource) {
	var avatar = {};
	avatar.resource = resource;
	avatar.model = new THREE.Object3D();
	loader.load(avatar.resource, function(gltf) { // this could probably be vastly improved
		avatar.model.add(gltf.scene);

		avatar.mixer = new THREE.AnimationMixer(gltf.scene);
		avatar.action = avatar.mixer.clipAction(gltf.animations[0]);
		avatar.action.play();

		let boundingBox = new THREE.Box3().setFromObject(avatar.model);
		objectSize = boundingBox.getSize(); // Returns Vector3
		
		scene.add(avatar.model);
		allObjects.push(avatar.model);
	}, function () {}, function (e) {
		console.error(e);
	});
	avatar.model.scale.x = objectScale;
	avatar.model.scale.y = objectScale;
	avatar.model.scale.z = objectScale;
	return avatar;
}

function changeUserPosition(id, x, y, z) {
	let user = UserMap[id];
	
	// Look at where we are heading
	user.avatar.model.lookAt(x, y, x);

	user.avatar.model.position.x = x;
	user.avatar.model.position.y = y;
	user.avatar.model.position.z = z;

	if (connections[id].stream)
		updateVideoList(id);
	if (user.avatar.model.getObjectByName('text'))
		user.avatar.model.getObjectByName('text').lookAt(camera.position.x, camera.position.y, camera.position.z);
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
			if (testID == ourID || !connections[testID] || !connections[testID].stream || videoList.includes(testID)) {
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
 * Gets a number representing the distance between the user with ID 'id' and our
 * user in the 3D space.
 */
function getDistance(id) {
	let otherPos = UserMap[id].avatar.model.position;
	return (otherPos.x - camera.position.x) ** 2 +
		(otherPos.z - camera.position.z) ** 2;
}

/**
 * This function updates which videos are visible on the screen. The list of
 * videos to display is 'videoList' in 3D.js.
 */
function updateVideoVisibility() {
	for (let i = 0; i < videoListLength; i++) {
    let id = videoList[i];
    if (id == 0 || !connections[id].stream.id) continue;

    document.getElementById(connections[id].stream.id).hidden = false;
    document.getElementById(connections[id].stream.id).children[0].autoplay = true;
  }
}

/**
 * Pause videofiles outside when in the room and visa-versa.
 */
function updateVideofilesPlayed() {
	let isInsideRoom = Math.abs(camera.position.x) < maxX &&
		Math.abs(camera.position.z) < maxZ;

	if (isInsideRoom) {
		summerInternsVideo.pause();
		shuttleAnimationVideo.pause();
	}
	else {
		roomVideo.pause();
		summerInternsVideo.play();
		shuttleAnimationVideo.play();
	}
}


function userGotMedia(id, mediaStream) {
	UserMap[id]["media"] = mediaStream;
	var posAudio = new THREE.PositionalAudio(listener);
	posAudio.setRefDistance(20);
	posAudio.setRolloffFactor(2);

	let n = document.createElement("audio"); // Create HTML element to store audio stream
	n.srcObject = mediaStream;
	n.muted = true; // We only want audio from the positional audio
	UserMap[id].audioElement = n;

	const audio1 = posAudio.context.createMediaStreamSource(n.srcObject);

	try {
		posAudio.setNodeSource(audio1);
		UserMap[id].avatar.model.add(posAudio);
	} catch(err) {
		console.error(err);
	};
}

function userLeft3D(id) {
	resourceList.push(UserMap[id].resource);
	scene.remove(UserMap[id].avatar.model);
	if (UserMap[id].audioElement) { // Needed for testing
		if (UserMap[id].audioElement.srcObject) {
			UserMap[id].audioElement.srcObject.getTracks().forEach(track => track.stop());
		}
		UserMap[id].audioElement.srcObject = null;
		UserMap[id].audioElement = null;
	}
	delete UserMap[id];
	updateVideoList(ourID);
}

function onDocumentKeyDown(event) {
	switch (event.keyCode) {
		case 87: // w
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

		case 38:// up
			time = performance.now();
			prevUpdateTime = time;
			controls.lock();
			break;

		case 40: // down
			controls.unlock();
			break;

		case 69: // e
			moveUp = true;
			break;

		case 81: // q
			moveDown = true;
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

		case 69: // e
			moveUp = false;
			break;

		case 81: // q
			moveDown = false;
			break;
	}
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	resizeCanvas(-1);
}

/**
 * Resizes the 3D scene, whilst making sure to include the video streams if there
 * are any. The parameter specifies how much space to leave on the right side.
 * If it is -1 then the previously used value of videoWidth will be used.
 */
function resizeCanvas(newWidth) {
	if (newWidth >= 0)
		videoWidth = newWidth;
	renderer.setSize( window.innerWidth - videoWidth, window.innerHeight - 30 );
}

// Function to update frame
function update() {
	requestID = requestAnimationFrame(update);
	time = performance.now();
	var delta = ( time - prevUpdateTime ) / 1000;

	// Updating animation
	for (let u in UserMap) {
		if (UserMap[u].avatar.mixer) {
			UserMap[u].avatar.mixer.update(delta);
		}
	}

	if (controls.isLocked === true) {
		velocity.x -= velocity.x * 10.0 * delta;
		velocity.z -= velocity.z * 10.0 * delta;
		velocity.y -= velocity.y * 10.0 * delta;

		direction.z = Number( moveForward ) - Number( moveBackward );
		direction.x = Number( moveRight ) - Number( moveLeft );
		direction.y = Number( moveDown ) - Number( moveUp );
		direction.normalize(); // this ensures consistent movements in all directions (usefulness in question)

		if ( moveForward || moveBackward ) velocity.z -= direction.z * speed * delta;
		if ( moveLeft || moveRight ) velocity.x -= direction.x * speed * delta;
		if ( moveUp || moveDown ) velocity.y -= direction.y * speed * delta;

		controls.moveRight( - velocity.x * delta );
		controls.moveForward( - velocity.z * delta );
		controls.getObject().position.y += ( velocity.y * delta );

		// Only call costly functions if we have moved and some time has passed since the last time we called them
		if ( direction.lengthSq() && time - prevPosTime > 50 ) {
			changePos(camera.position.x, camera.position.y, camera.position.z); // Update our position for others
			updateVideoList(ourID); // Update which videos to show

			for (let keyId in UserMap) { // Makes the usernames point towards the user
				UserMap[keyId].avatar.model.getObjectByName('text').lookAt(camera.position.x, camera.position.y, camera.position.z);
			}

			updateVideofilesPlayed();
			
			prevPosTime = time;
		}	
	}
	prevUpdateTime = time;
	renderer.render(scene, camera);
}

/**
 * This is a wrapper function which can be used to update our current position
 * for other users without needing to access 3D.js variables.
 */
function updatePos() {
	changePos(camera.position.x, camera.position.y, camera.position.z);
}

/**
 * Function which tells other users our new 3D position.
 */
function changePos(x, y, z) {
  let jsonPos = JSON.stringify({type: "pos", x: x, y: y, z: z});
  for (let id in connections) { // Send it to everyone
		if (connections[id].dataChannel)
    	connections[id].dataChannel.send(jsonPos);
  }
}

function leave3D() {
	if (tv) scene.remove(tv);

	for (let id in UserMap) {
		if (UserMap[id].audioElement) {
			UserMap[id].audioElement.srcObject.getTracks().forEach(track => track.stop());
			UserMap[id].audioElement.srcObject = null;
			UserMap[id].audioElement = null;
		}
		delete UserMap[id];
	}

	for (let i in allObjects) {
		if (allObjects[i]) scene.remove(allObjects[i]);
	}

	document.removeEventListener("keydown", onDocumentKeyDown);
	document.removeEventListener("keyup", onDocumentKeyUp);
	if (document.getElementById("scene")) {
		document.getElementById("scene").outerHTML = ''; // Deletes the scene canvas
	}

	window.cancelAnimationFrame(requestID); // Stops rendering the scene
	scene.dispose();
	scene = null;
	camera = null;
	renderer.dispose();
	renderer = null;
	controls = null;
	requestID = undefined;
	listener = null;
	loader = null;
	UserMap = {};
	allObjects = [];
	videoList = [];
	videoListLength = 0;
	roomVideo.srcObject = null;
	summerInternsVideo.srcObject = null;
	shuttleAnimationVideo.srcObject = null;
}

// These are for testing
export function setUserRotation(id, angleY) { UserMap[id].avatar.model.rotation.y = angleY };
export function setVideoList(list) { videoList = list };
export function setVideoListLength(n) { videoListLength = n };

export {
	UserMap,
	ourID,
	objectScale,
	newUserJoined3D,
	reserveResource,
	userGotMedia,
	updatePos,
	userLeft3D,
	init3D,
	updateShareScreen3D,
	updateVideoList,
	resizeCanvas,
	leave3D,
	onDocumentKeyDown,
	onDocumentKeyUp,
	changeUserPosition,
	controls,

	// For tests
	getVideoRatio,
	moveForward,
	moveLeft,
	moveRight,
	moveBackward,
	getDistance,
	videoList,
	videoListLength,
	shiftVideoList
};
