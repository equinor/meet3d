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
var floor;

var requestID;
var listener;
var loader;
var time;

var objectSize = new THREE.Vector3(0, 20, 0); // A Vector3 representing size of each 3D-object

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
var userMap = {}; // JS-object to store the users' 3D information
var connections; // JS-object to store the user network connections
var allObjects = []; // Stores all 3D objects so that they can be removed later
var videoList = []; // The list of remote videos to display
const resourceList = ["objects/Fishes/Anglerfish.glb", "objects/Fishes/ArmoredCatfish.glb", "objects/Fishes/Betta.glb",
"objects/Fishes/BlackLionFish.glb", "objects/Fishes/Blobfish.glb", "objects/Fishes/BlueGoldfish.glb", "objects/Fishes/Clownfish.glb",
"objects/Fishes/Flatfish.glb", "objects/Fishes/FlowerHorn.glb", "objects/Fishes/GoblinShark.glb", "objects/Fishes/Goldfish.glb",
"objects/Fishes/HumphHead.glb", "objects/Fishes/Koi.glb", "objects/Fishes/Lionfish.glb", "objects/Fishes/MandarinFish.glb",
"objects/Fishes/MoorishIdol.glb", "objects/Fishes/ParrotFish.glb", "objects/Fishes/Piranha.glb", "objects/Fishes/Puffer.glb",
"objects/Fishes/RedSnapper.glb", "objects/Fishes/RoyalGramma.glb", "objects/Fishes/Shark.glb", "objects/Fishes/Sunfish.glb",
"objects/Fishes/Swordfish.glb", "objects/Fishes/Tang.glb", "objects/Fishes/Tetra.glb", "objects/Fishes/Tuna.glb", "objects/Fishes/Turbot.glb",
"objects/Fishes/YellowTang.glb", "objects/Fishes/ZebraClownFish.glb"]; //List of 3D-object-files

/**
 * Initialises the 3D environment. This includes creating a renderer, rendering
 * it in a canvas in the position in the HTML document given by the 'div' parameter,
 * adding scenery to the 3D scene, setting up the user controls and creating a camera.
 */
async function init(id, connectionsObject, div) {
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
	addVideofile( summerInternsVideo, 3 * maxX, 25, - 2 * maxZ, - Math.PI / 8 );
	addVideofile( shuttleAnimationVideo, - 3 * maxX, 25, - 2 * maxZ, Math.PI / 8 );

	updateVideofilesPlayed();

	window.addEventListener( 'resize', onWindowResize, false );
	document.addEventListener( 'keydown', onDocumentKeyDown, false );
	document.addEventListener( 'keyup', onDocumentKeyUp, false );

	renderer.render(scene, camera);

	update();
}

/**
 * Returns the greatest width and height which can fit on the conference wall
 * whilst maintaining its original aspect ratio.
 */
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

/**
 * Places the given video stream in the 3D environment. If it is null, then we
 * only remove the existing one.
 */
async function updateShareScreen(screenTrack, details, name) {
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

// Adds a sky which appears unmoving from the user's perspective
function addSkyBox() {
	let urls = [
		"objects/Skybox/sh_ft.png", "objects/Skybox/sh_bk.png",
		"objects/Skybox/sh_up.png", "objects/Skybox/sh_dn.png",
		"objects/Skybox/sh_rt.png", "objects/Skybox/sh_lf.png"
	];

	let loader = new THREE.CubeTextureLoader();
	scene.background = loader.load(urls);

	//Extra floor to make rooom look real.
	let textureLoader = new THREE.TextureLoader();
	let floortext = textureLoader.load( "objects/Skybox/sh_dn.png" );
	floortext.wrapS = THREE.RepeatWrapping;
	floortext.wrapT = THREE.RepeatWrapping;
	floortext.repeat.set( 100,100 );
	let floor = new THREE.Mesh(
		new THREE.PlaneGeometry(10000,10000),
		new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, map: floortext })
	);
	floor.rotation.x += Math.PI / 2;
	floor.position.y = -0.5;
	scene.add(floor);
}

// Adds lighting to make models look less flat
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

// Creates a conference room with walls, a floor and a ceiling
function addWalls() {
	let textureLoader = new THREE.TextureLoader();

	// FLOOR
	let floortext = textureLoader.load( "objects/Room/floor.jpg" );
	floor = new THREE.Mesh(
		new THREE.PlaneGeometry(maxX * 2, maxZ * 2, maxX * 2, maxZ * 2),
		new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, map: floortext })
	);
	floor.rotation.x += Math.PI / 2; //can rotate the floor/plane
	floor.position.y = 0;
	scene.add(floor);
	allObjects.push(floor);

	// CEILING
	let ceilingtext = textureLoader.load( "objects/Room/ceiling2.jpg" );
	let ceiling = new THREE.Mesh(
		new THREE.PlaneGeometry(maxX * 2, maxZ * 2, maxX * 2, maxZ * 2),
		new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, map: ceilingtext })
	);
	ceiling.rotation.x += Math.PI / 2; //can rotate the floor/plane
	ceiling.position.y += wallHeight;
	scene.add(ceiling);
	allObjects.push(ceiling);

	// WALLS
	let walltext = textureLoader.load( "objects/Room/wall1.jpg" );

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

// Adds a video from a video file to the 3D environment, including sound
function addVideofile(videofile, xPos, yPos, zPos, rotation = 0) {
	videofile.play(); // FIXME This should be synchronized between users

	let Vtexture = new THREE.VideoTexture(videofile);
	let geometry = new THREE.PlaneGeometry(50,50,50);
	let Vmaterial = new THREE.MeshBasicMaterial ({side: THREE.DoubleSide, map: Vtexture});
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

	let audio2;
  if (navigator.userAgent.indexOf('Firefox') > -1) {
    audio2 = vPosAudio.context.createMediaStreamSource(videofile.mozCaptureStream());
  } else {
    audio2 = vPosAudio.context.createMediaStreamSource(videofile.captureStream());
  }

	try {
		vPosAudio.setNodeSource(audio2);
		videoPlane.add(vPosAudio);
		scene.add(videoPlane);
	} catch(err) {
		console.error(err);
 };

}

// Adds furniture to the conference room
function addDecoration() {
	// PLANT
	const plant = new THREE.Object3D();
	loader.load('objects/Room/planten.glb', function(gltf) {
		plant.add(gltf.scene);
		plant.scale.x = 20; plant.scale.y = 20; plant.scale.z = 20;
		plant.position.x= 0; plant.position.y = 7; plant.position.z = 10;
		scene.add(plant);
	});

	// TABLE
	let table = new THREE.Object3D();
	loader.load('objects/Room/table.glb', function(gltf) {
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

		let color = 0x990000; // The text is red

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

// Adds a new user to the 3D environment
async function newUserJoined(id, name, resource) {
	if (name == null || name === '' || typeof name !== "string") {
		return false; // Name needs to be a non-empty string
	}

	var newUser = {};
	newUser.name = name;
  newUser.resource = resourceList[resource];
  console.log("Adding new user to the 3D environment: " + name + ", with resource: " + resource + " aka " + newUser.resource);

	newUser.avatar = await loadNewObject(newUser.resource); // Load in their model
	addText(name, newUser.avatar.model); // Add their name above their model
	userMap[id] = newUser; // Add new user to userMap
	updateVideoList(id); // Update which videos to show on the right side of the screen
	return true; // User added succesfully
}

// Load 3D-object from file "resource" and add it to scene
async function loadNewObject(resource) {
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
	let user = userMap[id];

	// Look at where we are heading
	user.avatar.model.lookAt(x, y, z);

	// Updating coordinates
	user.avatar.model.position.x = x;
	user.avatar.model.position.y = y;
	user.avatar.model.position.z = z;

	// Update which way the text above the user is pointing
	if (user.avatar.model.getObjectByName('text'))
		user.avatar.model.getObjectByName('text').lookAt(camera.position.x, camera.position.y, camera.position.z);

	if (connections[id].stream)
		updateVideoList(id); // Update which videos are shown on the right
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
		for (const testID in userMap) {
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
	let otherPos = userMap[id].avatar.model.position;
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
	} else {
		roomVideo.pause();
		summerInternsVideo.play();
		shuttleAnimationVideo.play();
	}
}

// Adds a positional audio track to a user
function userGotMedia(id, mediaStream) {
	userMap[id].media = mediaStream;
	var posAudio = new THREE.PositionalAudio(listener);
	posAudio.setRefDistance(20);
	posAudio.setRolloffFactor(2);

	let n = document.createElement("audio"); // Create HTML element to store audio stream
	n.srcObject = mediaStream;
	n.muted = true; // We only want audio from the positional audio
	userMap[id].audioElement = n;

	const audio1 = posAudio.context.createMediaStreamSource(n.srcObject);

	try {
		posAudio.setNodeSource(audio1);
		userMap[id].avatar.model.add(posAudio);
	} catch(err) {
		console.error(err);
	};
}

// Removes a user from the 3D environment
function userLeft(id) {
	scene.remove(userMap[id].avatar.model);
	if (userMap[id].audioElement) { // Needed for testing
		if (userMap[id].audioElement.srcObject) {
			userMap[id].audioElement.srcObject.getTracks().forEach(track => track.stop());
		}
		userMap[id].audioElement.srcObject = null;
		userMap[id].audioElement = null;
	}
	delete userMap[id];
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

// Called when the size of the visible part of the webpage is changed.
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
  if (renderer)
	  renderer.setSize( window.innerWidth - videoWidth, window.innerHeight - 30 );
}

// Function to update frame
function update() {
	requestID = requestAnimationFrame(update);
	time = performance.now();
	var delta = ( time - prevUpdateTime ) / 1000;

	// Updating animation
	for (let u in userMap) {
		if (userMap[u].avatar.mixer) {
			userMap[u].avatar.mixer.update(delta);
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

		if (camera.position.y < floor.position.y) camera.position.y = floor.position.y + 1;

		// Only call costly functions if we have moved and some time has passed since the last time we called them
		if ( direction.lengthSq() && time - prevPosTime > 50 ) {
			changePos(camera.position.x, camera.position.y, camera.position.z); // Update our position for others
			updateVideoList(ourID); // Update which videos to show

			for (let keyId in userMap) { // Makes the usernames point towards the user
        if (userMap[keyId].avatar.model.getObjectByName('text'))
				    userMap[keyId].avatar.model.getObjectByName('text').lookAt(camera.position.x, camera.position.y, camera.position.z);
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

/**
 * Function which clears and resets all global variables.
 */
function leave() {
	if (!scene)	return; // Do nothing if the scene is not initialised

	if (tv) scene.remove(tv);

	for (let id in userMap) {
		if (userMap[id].audioElement) {
			userMap[id].audioElement.srcObject.getTracks().forEach(track => track.stop());
			userMap[id].audioElement.srcObject = null;
			userMap[id].audioElement = null;
		}
		delete userMap[id];
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
	userMap = {};
	allObjects = [];
	videoList = [];
	videoListLength = 0;

	if (roomVideo != undefined) roomVideo.srcObject = null;
	if (summerInternsVideo != undefined) summerInternsVideo.srcObject = null;
	if (shuttleAnimationVideo != undefined) shuttleAnimationVideo.srcObject = null;
}

// These are for testing
export function setUserRotation(id, angleY) { userMap[id].avatar.model.rotation.y = angleY };
export function setVideoList(list) { videoList = list };
export function setVideoListLength(n) { videoListLength = n };

export {
	userMap,
	ourID,
	objectScale,
	newUserJoined,
	userGotMedia,
	updatePos,
	userLeft,
	init,
	updateShareScreen,
	updateVideoList,
	resizeCanvas,
	leave,
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
