var renderer
var camera
var scene
var controls

var geometry
var material
var object
var speed

var myID
var userCount = 0;

const distance = 15;

var listener;

function init3D() {
	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera(100, window.innerWidth / window.outerWidth, 0.1, 1000);
	renderer = new THREE.WebGLRenderer();

	scene.background = new THREE.Color( 0xf0f0f0 );

	camera.position.x = 0;
	camera.position.y = 0;
	camera.position.z = 70;
	var light = new THREE.PointLight( 0xff0000, 1, 100 );
	light.position.set( 50, 50, 50 );
	scene.add( light );

	//make a floor to the scene
	var floor = new THREE.Mesh(
		new THREE.PlaneGeometry(100,100,100),
		new THREE.MeshBasicMaterial({color : "skyblue", wireframe :true})

	);

	floor.rotation.x += Math.PI / 2; //can rotate the floor/plane
	scene.add( floor );


	renderer.setSize(window.innerWidth, window.innerHeight);
	document.body.appendChild( renderer.domElement);

	renderer.domElement.id = "scene";

	//choose which object to make when the makeobjectfunction is called
	geometry = new THREE.BoxGeometry(20, 20, 20);
	material = new THREE.MeshNormalMaterial( {color:0x669966, wireframe:true});
	object = new THREE.Mesh(geometry, material);
	speed = 1;

	update();

	//lets you move the camera with the mouse
	controls = new THREE.OrbitControls( camera, renderer.domElement );
	controls.minDistance = 1;
	controls.maxDistance = 100;
	controls.maxPolarAngle = Math.PI * 0.5; // Does not let you clip through the floor

	myID = new user(0, "test", 10, 10, 0).getId();

	document.addEventListener("keydown", onDocumentKeyDown, false);
	document.addEventListener("keyup", onDocumentKeyUp, false);


	listener = new THREE.AudioListener();
	findUser(myID).object.add(listener);

}

//function to add a user to the UsersMap
function addToUserMap(User){
	UserMap.set(User.getId(), User);
	return UserMap;
}

//return true if a user with the id passed in parameter was a part of the UserMap and removed, false otherwise
function removeUser(id){
	return UserMap.delete(id);
}

function findUser(id){
	return UserMap.get(id);
}

//map to store the Users
var UserMap = new Map();

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
	posAudio.setRefDistance(5);
	posAudio.setDirectionalCone(180,320,0.1);
	posAudio.setRolloffFactor(10);
	const audio1 = posAudio.context.createMediaStreamSource(mediaStream);

	try {
		posAudio.setNodeSource(audio1);
		findUser(id).object.add(posAudio)
	} catch(err){
		console.log(err);
	};
}

function userLeft(id) {
	if (removeUser(id)) {
		// Here we also need to remove them from the scene
		userCount--;
	}
}

//function that makes an object and position it at input coordinates
var makeNewObject = function(xPosition, yPosition, zPosition){
	var object = new THREE.Mesh(geometry,material);
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
		this.object = makeNewObject(xPosition, yPosition, zPosition),
		addToUserMap(this)};
		getName(){ return this.name };
		getId(){ return this.id };
		getxPosition(){ return this.object.position.x; }
		getyPosition(){ return this.object.position.y; }
		getzPosition(){ return this.object.position.z; }
		setPosition(xPosition, yPosition, zPosition) {
			this.object.position.x = xPosition;
			this.object.position.y = yPosition;
			this.object.position.z = zPosition;
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
	switch (key){
		case 'w':
		case 'arrow up':
			if ((keysPressed['d']) || (keysPressed['arrow right'])) {
				ourUser.setPosition(ourUser.getxPosition() + speed, ourUser.getyPosition() + speed, ourUser.getzPosition());
				camera.position.x += speed;
				camera.position.y += speed;
			} else if ((keysPressed['a']) || (keysPressed['arrow left'])) {
				ourUser.setPosition(ourUser.getxPosition() - speed, ourUser.getyPosition() + speed, ourUser.getzPosition());
				camera.position.x -= speed;
				camera.position.y += speed;
			} else {
				ourUser.setPosition(ourUser.getxPosition(), ourUser.getyPosition() + speed, ourUser.getzPosition());
				camera.position.y += speed;
			}
			break;
		case 's':
		case 'arrow down':
			if ((keysPressed['d']) || (keysPressed['arrow right'])) {
				ourUser.setPosition(ourUser.getxPosition() + speed, ourUser.getyPosition() - speed, ourUser.getzPosition());
				camera.position.x += speed;
				camera.position.y -= speed;
			} else if ((keysPressed['a']) || (keysPressed['arrow left'])) {
				ourUser.setPosition(ourUser.getxPosition() - speed, ourUser.getyPosition() - speed, ourUser.getzPosition());
				camera.position.x -= speed;
				camera.position.y -= speed;
			} else {
				ourUser.setPosition(ourUser.getxPosition(), ourUser.getyPosition() - speed, ourUser.getzPosition());
				camera.position.y -= speed;
			}
			break;
		case 'd':
		case 'arrow right':
			if ((keysPressed['w']) || (keysPressed['arrow up'])) {
				ourUser.setPosition(ourUser.getxPosition() + speed, ourUser.getyPosition() + speed, ourUser.getzPosition());
				camera.position.x += speed;
				camera.position.y += speed;
			} else if ((keysPressed['s']) || (keysPressed['arrow down'])) {
				ourUser.setPosition(ourUser.getxPosition() + speed, ourUser.getyPosition() - speed, ourUser.getzPosition());
				camera.position.x += speed;
				camera.position.y -= speed;
			} else {
				ourUser.setPosition(ourUser.getxPosition() + speed, ourUser.getyPosition(), ourUser.getzPosition());
				camera.position.x += speed;
			}
			break;
		case 'a':
		case 'arrow left':
			if ((keysPressed['w']) || (keysPressed['arrow up'])) {
				ourUser.setPosition(ourUser.getxPosition() - speed, ourUser.getyPosition() + speed, ourUser.getzPosition());
				camera.position.x -= speed;
				camera.position.y += speed;
			} else if ((keysPressed['s']) || (keysPressed['arrow down'])) {
				ourUser.setPosition(ourUser.getxPosition() - speed, ourUser.getyPosition() - speed, ourUser.getzPosition());
				camera.position.x -= speed;
				camera.position.y -= speed;
			} else {
				ourUser.setPosition(ourUser.getxPosition() - speed, ourUser.getyPosition(), ourUser.getzPosition());
				camera.position.x -= speed;
			}
			break;
		default:
			break;
	}

	changePos(ourUser.getxPosition(), ourUser.getyPosition(), ourUser.getzPosition())
}

function onDocumentKeyUp(event) {
	delete keysPressed[event.key];
}

//function to update frame
function update(){
	renderer.render(scene, camera);
	requestAnimationFrame(update);
}

//function to change name of user.
function nameChange(userer, newname){
	userer.name = newname;
}
