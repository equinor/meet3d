var renderer
var camera
var scene
var controls

var myID
var requestID = undefined

var userCount = 0;
const distance = 15;

const maxX = 100;
const maxY = 100; // This is probably not needed
const maxZ = 100;
const speed = 3;

var listener;
var loader;

var UserMap = new Map();
var listObjects = [];

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
	renderer.setSize(window.innerWidth - 5, window.innerHeight - 25);
	renderer.domElement.id = "scene"; // Adds an ID to the canvas element
	renderer.domElement.hidden = true; // Initially hides the scene
	renderer.domElement.style.display = "none"
	document.body.appendChild( renderer.domElement);

	

	// FLOOR
	let floortext = new THREE.TextureLoader().load( "objects/obj/floor.jpg" );

	let floor = new THREE.Mesh(
		new THREE.PlaneGeometry(maxX * 2, maxZ * 2, maxX * 2, maxZ * 2),
		new THREE.MeshBasicMaterial({side: THREE.DoubleSide, map: floortext})
	);
	floor.rotation.x += Math.PI / 2; //can rotate the floor/plane
	scene.add( floor );

	loader = new THREE.GLTFLoader();

	//load the fishes
	/*makeNewObject('objects/Anglerfish/Anglerfish.glb', 10, 20, 5);
	makeNewObject('objects/ArmoredCatfish/ArmoredCatfish.glb', 25, 5, 5);
	makeNewObject('objects/Betta/Betta.glb', 5, 10, 10);
	makeNewObject('objects/BlackLionFish/BlackLionFish.glb', 30, 35, 15);
	makeNewObject('objects/Blobfish/Blobfish.glb', 5, 5, 10);*/
	
	makeNewObject('objects/obj/BlueGoldfish.glb', 10, 20, 5);
	makeNewObject('objects/obj/BlueGoldfish.glb', 25, 5, 5);
	makeNewObject('objects/obj/BlueGoldfish.glb', 5, 10, 10);
	makeNewObject('objects/obj/BlueGoldfish.glb', 30, 35, 15);
	makeNewObject('objects/obj/BlueGoldfish.glb', 5, 5, 10);

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

	myID = new user(0, "test", 10, 20, 5).getId();

	listener = new THREE.AudioListener();

	
	var ourUser = findUser(myID);
	ourUser.object.add(listener);
	

	camera.position = ourUser.object.position
	controls.target.set(ourUser.object.position.x, ourUser.object.position.y, ourUser.object.position.z)

	//makeNewObject('objects/obj/BlueGoldfish.glb', 10, 20, 5);

	update();
}

//Create the texture to display video on wall

for (var x in remoteStreamList){
	var video = remoteStreamList[x];
	var texture = new THREE.VideoTexture(video);
	texture.minFilter = THREE.LinearFilter;
	texture.magFilter = THREE.LinearFilter;
	texture.format = THREE.RGBFormat;
}



function addWalls() {
	if (remoteStreamList.length > 0){
		for (var x in remoteStreamList){
			var video = document.getElementById(remoteStreamList[x]);
			var texture = new THREE.VideoTexture(video);
			texture.minFilter = THREE.LinearFilter;
			texture.magFilter = THREE.LinearFilter;
			texture.format = THREE.RGBFormat;
		}
	}
	else{
		var texture = 0;}

	let wallHeight = 100;

	var wallLeft = new THREE.Mesh(
		new THREE.PlaneGeometry(maxY * 2, wallHeight, 1, 1),
		new THREE.MeshBasicMaterial({color: "white", side: THREE.DoubleSide})
	);

	wallLeft.rotation.y += Math.PI / 2; //can rotate the floor/plane
	wallLeft.position.x = -maxX;
	wallLeft.position.y += wallHeight / 2;

	var wallRight = new THREE.Mesh(
		new THREE.PlaneGeometry(maxY * 2, wallHeight, 1, 1),
		new THREE.MeshBasicMaterial({color: "white", side: THREE.DoubleSide})
	);

	wallRight.rotation.y += Math.PI / 2; //can rotate the floor/plane
	wallRight.position.x = maxX;
	wallRight.position.y += wallHeight / 2;

	var wallFront = new THREE.Mesh(
		new THREE.PlaneBufferGeometry(maxX * 2, wallHeight, 1, 1),
		new THREE.MeshBasicMaterial({side: THREE.DoubleSide, map: texture})
		)
	wallFront.position.z = -maxZ;
	wallFront.position.y += wallHeight / 2;
		
	scene.add( wallLeft );
	scene.add( wallRight );
	scene.add( wallFront );

	renderer.render(scene, camera);
	
}


//function to add a user to the UsersMap
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

function newUserJoined(id, name) {
	console.log("Adding new user to the environment: " + name)
	let newUser = new user(id, name, 10, 10, distance * userCount); // This does not look great at the moment
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
		//findUser(id).add(posAudio)
	} catch(err){
		console.log(err);
	};
}

//put the model outside of the field of view and add it to the pool of usable models
function userLeft(id) {
	findUser(id).vanish();
	listObjects.push(findUser(id).object);
	if (removeUser(id)) {
		userCount--;
	}
}

//function that load a model and its corresponding animation at the input coordinates and add it to listObjects
function makeNewObject(ressource, x, y, z){
	//const model = new THREE.Object3D();
	loader.load(ressource, function(gltf){
		var model = gltf.scene;
		model.scale.x =7;
		model.scale.y =7;
		model.scale.z =7;
		model.position.x = x;
		model.position.y = y;
		model.position.z = z;
		scene.add(model);
		listObjects.push(model);
	})
}

//A user class. The constructor calls the makenewobject function.
//constructor adds a user to UserMap
class user {
	constructor(id, name, xPosition, yPosition, zPosition) {
		console.log(listObjects);
		this.name = name,
		this.id = id,
		this.object = listObjects.pop(); //THE PROBLEM IS HERE
		addToUserMap(this);
		this.object.position.x = xPosition;
		this.object.position.y = yPosition;
		this.object.position.z = zPosition;
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
	vanish(){
		this.object.position.x = maxX + 10;
		this.object.position.y = maxY + 10;
		this.object.position.z = maxZ + 10;
	}
	getMedia(){return this.media};
	setMedia(media) {
		this.media = media;
	}
	setRotation(x, y, z){
		this.object.rotation.x = x;
		this.object.rotation.y = y;
		this.object.rotation.z = z;
		console.log(this.object.rotation);
	}
	getRotationX(){
		return this.object.rotation.x;
	}
	getRotationY(){
		return this.object.rotation.y;
	}
	getRotationZ(){
		return this.object.rotation.z;
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
				ourUser.setRotation(0,135 * Math.PI / 180,0);
			} else if ((keysPressed['a']) || (keysPressed['arrow left'])) {
				if (ourUser.setxPosition(ourUser.getxPosition() - speed)) camera.position.x -= speed;
				if (ourUser.setzPosition(ourUser.getzPosition() - speed)) camera.position.z -= speed;
				ourUser.setRotation(0,-135 * Math.PI / 180,0);
			} else {
				if (ourUser.setzPosition(ourUser.getzPosition() - speed)) camera.position.z -= speed;
				ourUser.setRotation(0,180 * Math.PI / 180,0);
			}
			break;
		case 's':
		case 'arrow down':
			if ((keysPressed['d']) || (keysPressed['arrow right'])) {
				if (ourUser.setxPosition(ourUser.getxPosition() + speed)) camera.position.x += speed;
				if (ourUser.setzPosition(ourUser.getzPosition() + speed)) camera.position.z += speed;
				ourUser.setRotation(0,45 * Math.PI / 180,0);
			} else if ((keysPressed['a']) || (keysPressed['arrow left'])) {
				if (ourUser.setxPosition(ourUser.getxPosition() - speed)) camera.position.x -= speed;
				if (ourUser.setzPosition(ourUser.getzPosition() + speed)) camera.position.z += speed;
				ourUser.setRotation(0,-45 * Math.PI / 180,0);
			} else {
				if (ourUser.setzPosition(ourUser.getzPosition() + speed)) camera.position.z += speed;
				ourUser.setRotation(0,0,0);
			}
			break;
		case 'd':
		case 'arrow right':
			if ((keysPressed['w']) || (keysPressed['arrow up'])) {
				if (ourUser.setxPosition(ourUser.getxPosition() + speed)) camera.position.x += speed;
				if (ourUser.setzPosition(ourUser.getzPosition() - speed)) camera.position.z -= speed;
				ourUser.setRotation(0,135 * Math.PI / 180,0);
			} else if ((keysPressed['s']) || (keysPressed['arrow down'])) {
				if (ourUser.setxPosition(ourUser.getxPosition() + speed)) camera.position.x += speed;
				if (ourUser.setzPosition(ourUser.getzPosition() + speed)) camera.position.z += speed;
				ourUser.setRotation(0,45 * Math.PI / 180,0);
			} else {
				if (ourUser.setxPosition(ourUser.getxPosition() + speed)) camera.position.x += speed;
				ourUser.setRotation(0,90 * Math.PI / 180,0);
			}
			break;
		case 'a':
		case 'arrow left':
			if ((keysPressed['w']) || (keysPressed['arrow up'])) {
				if (ourUser.setxPosition(ourUser.getxPosition() - speed)) camera.position.x -= speed;
				if (ourUser.setzPosition(ourUser.getzPosition() - speed)) camera.position.z -= speed;
				ourUser.setRotation(0,-135 * Math.PI / 180,0);
			} else if ((keysPressed['s']) || (keysPressed['arrow down'])) {
				if (ourUser.setxPosition(ourUser.getxPosition() - speed)) camera.position.x -= speed;
				if (ourUser.setzPosition(ourUser.getzPosition() + speed)) camera.position.z += speed;
				ourUser.setRotation(0,-45 * Math.PI / 180,0);
			} else {
				if (ourUser.setxPosition(ourUser.getxPosition() - speed)) camera.position.x -= speed;
				ourUser.setRotation(0,-90 * Math.PI / 180,0);
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
