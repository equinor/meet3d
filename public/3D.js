var scene;
var camera;
var renderer;

var geometry;
var material;
var requestID = undefined;
var userCount = 0;
var listener;
var loader;
var allObjects = []; // Stores all 3D objects so that they can be removed later
var videoList = []; // The list of remote videos to display
var videoListLength = 0; // The number of videos to show at a time, not including our own
var ourUser;
var controls;

let wallLeft;
let wallRight;
let wallFront;

var moveForward = false;
var moveBackward = false;
var moveLeft = false;
var moveRight = false;

var prevTime = performance.now();
var velocity = new THREE.Vector3();
var direction = new THREE.Vector3();

const distance = 15;
const maxX = 100;
const maxY = 100; // This is probably not needed
const maxZ = 100;
const speed = 3;
const wallHeight = 100;
const objectScale = 7;
var objectSize = new THREE.Vector3(0,0,0); // A Vector3 representing size of 3D-object
const videoCount = 3;

const objectWidth = 10; // Probably not needed
const objectHeight = 20; // Probably not needed

function init3D() {
	scene = new THREE.Scene();
	scene.background = new THREE.Color(0xf0f0f0);

	// CAMERA
	camera = new THREE.PerspectiveCamera(100, (window.innerWidth / window.outerWidth), 0.1, 1000);
	camera.position.z = 70;

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
	document.getElementById("3D").appendChild(renderer.domElement);

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

	
	controls = new THREE.PointerLockControls( camera, document.body );
	
	controls.addEventListener( 'click', function () {
		//lock mouse on screen
		controls.lock();
	}, false );

	controls.addEventListener( 'lock', function () {

		menu.style.display = 'none';
	
	} );
	
	controls.addEventListener( 'unlock', function () {
	
		menu.style.display = 'block';
	
	} );

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

/*
	//choose which object to make when the makeobjectfunction is called
	geometry = new THREE.BoxGeometry(10, 20, 10);
	material = new THREE.MeshBasicMaterial( {color: 0x669966, wireframe: false});
	object = new THREE.Mesh(geometry, material);
	allObjects.push(object);
*/

	// ORBITCONTROLS
	/*controls = new THREE.OrbitControls(camera, renderer.domElement);
	controls.enableKeys = false;
	controls.enablePan = false;
	controls.minDistance = 1;
	controls.maxDistance = 100;
	controls.maxPolarAngle = Math.PI * 0.5; // Does not let you clip through the floor
	controls.minAzimuthAngle = 0; // Prevents left-right rotation of camera
	controls.maxAzimuthAngle = 0; // Prevents left-right rotation of camera
*/
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
		let shapes = font.generateShapes(nameShowed, shapeSize/objectScale);

		let textGeometry = new THREE.ShapeBufferGeometry(shapes);
		
		// Set center of text object equal to center of 3D-text-object
		textGeometry.computeBoundingBox();
		textGeometry.center();

		// Determine position of text object realtive to 3D-object
		textGeometry.translate(0, (objectSize.y + shapeSize) / objectScale, 0);

		var text = new THREE.Mesh(textGeometry, textMaterial);

		user.object.add(text);
	});
} // end of addText() function

//function to add a User to the UserMap
function addToUserMap(User) {
	UserMap[User.getId()] = User;
	return UserMap;
}

//return true if a User with the id passed in parameter was a part of the UserMap and removed, false otherwise
function removeUser(id) {
	delete UserMap[id];
}

// Returns the user object corresponding to the given user ID
function findUser(id) {
	return UserMap[id];
}

//map to store the Users
var UserMap = {};

function newUserJoined(id, name) {
	console.log("Adding new user to the 3D environment: " + name);
	let newUser = new User(id, name, 10, 10, distance * userCount); // This does not look great at the moment
 	addText(newUser);
	addToUserMap(newUser);
	userCount++;
	updateVideoList(id);
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

function getDistance(id) {
	let otherUser = findUser(id);
	return Math.abs(otherUser.getxPosition() - ourUser.getxPosition()) +
		Math.abs(otherUser.getyPosition() - ourUser.getyPosition()) +
		Math.abs(otherUser.getzPosition() - ourUser.getzPosition());
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
var makeNewObject = function(xPosition, yPosition, zPosition){
	const obj = new THREE.Object3D();
	console.log("makeNewObject...");
	loader.load('objects/obj/pawn.glb', function(gltf) {
		var object = gltf.scene;				
		//scene.add( gltf.scene );
		obj.add(object);
		obj.color = "blue";
		obj.scale.x = objectScale;
		obj.scale.y = objectScale;
		obj.scale.z = objectScale;

		let boundingBox = new THREE.Box3().setFromObject(obj);
		objectSize = boundingBox.getSize(); // Returns Vector3
		console.log("objectsize: {" + objectSize.x + objectSize.y + objectSize.z + "}");

		scene.add(obj);
	});
	console.log("MakeNewObject finished");
	return obj;
};

//A User class. The constructor calls the makenewobject function.
//constructor adds a User to UserMap
class User {
	constructor(id, name, xPosition, yPosition, zPosition) {
		console.log("constructing user...");
		this.name = name,
		this.id = id,
		this.object = makeNewObject(xPosition, yPosition, zPosition);
		addToUserMap(this)
	};
	getxPosition() { return this.object.position.x; }
	getyPosition() { return this.object.position.y; }
	getzPosition() { return this.object.position.z; }
	getPosition() { return this.object.position; }
	getName() { return this.name; }
	getId() { return this.id; }
	
	setName(newname) { this.name = newname; }
	
	getMedia() { return this.media; }
	setMedia(media) {
		this.media = media;
	}
};

function onDocumentKeyDown(event) {
	switch (event.keyCode) {
		case 38://up
		case 87: //w
			moveForward = true;
			break;
			
		case 37: // left
		case 65: // a
			moveLeft = true;
			break;

		case 40: // down
		case 83: // s
			moveBackward = true;
			break;

		case 39: // right
		case 68: // d
			moveRight = true;
			break;
	
	}
}
function onDocumentKeyUp(event){
	switch ( event.keyCode ) {

		case 38: // up
		case 87: // w
			moveForward = false;
			break;

		case 37: // left
		case 65: // a
			moveLeft = false;
			break;

		case 40: // down
		case 83: // s
			moveBackward = false;
			break;

		case 39: // right
		case 68: // d
			moveRight = false;
			break;
	}
}
	

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );

}


//function to update frame
function update() {
	requestID = requestAnimationFrame(update);
	if (controls.isLocked===true){
		console.log("Dette skjer");
		var time = performance.now();
		var delta = ( time - prevTime ) / 1000;

		velocity.x -= velocity.x * 10.0 * delta;
		velocity.z -= velocity.z * 10.0 * delta;

		velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass

		direction.z = Number( moveForward ) - Number( moveBackward );
		direction.x = Number( moveRight ) - Number( moveLeft );
		direction.normalize(); // this ensures consistent movements in all directions

		if ( moveForward || moveBackward ) velocity.z -= direction.z * 400.0 * delta;
		if ( moveLeft || moveRight ) velocity.x -= direction.x * 400.0 * delta;

		controls.moveRight( - velocity.x * delta );
		controls.moveForward( - velocity.z * delta );

		controls.getObject().position.y += ( velocity.y * delta ); // new behavior
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
	scene = null;
	camera = null;
	renderer = null;
	controls = null;
	geometry = null;
	material = null;
	userCount = 0;
	window.cancelAnimationFrame(requestID); // Stops rendering the scene
	requestID = undefined;
}