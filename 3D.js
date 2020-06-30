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

	myID = new user(0, "test", 10, 10, 0).getId();

	document.addEventListener("keydown", onDocumentKeyDown, false);
	document.addEventListener("keyup", onDocumentKeyUp, false);
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
	let newUser = new user(id, name, 0, distance * userCount, distance * userCount);
	addToUserMap(newUser);
	userCount++
}

function userLeft(id) {
	if (removeUser(id)) userCount--;
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
class user{
	constructor(id, name, xPosition, yPosition, zPosition){
		this.name = name,
		this.id = id,
		this.object = makeNewObject(xPosition, yPosition, zPosition),
		addToUserMap(this)};
		getName(){return this.name};
		getId(){return this.id};
		getxPosition(){return this.object.position.x;}
		getyPosition(){return this.object.position.y;}
		getzPosition(){return this.object.position.z;}
		setPosition(xPosition, yPosition, zPosition){
			this.object.position.x = xPosition;
			this.object.position.y = yPosition;
			this.object.position.z = zPosition;
		}
};

var keysPressed = {};
function onDocumentKeyDown(event) {
	var key = event.key;
	keysPressed[event.key] = true;
	switch (key){
		case 'w':
		case 'arrow up':
			if ((keysPressed['d']) || (keysPressed['arrow right'])) {
				findUser(myID).setPosition(findUser(myID).getxPosition() + speed, findUser(myID).getyPosition() + speed, findUser(myID).getzPosition());
				camera.position.x += speed;
				camera.position.y += speed;
			} else if ((keysPressed['a']) || (keysPressed['arrow left'])) {
				findUser(myID).setPosition(findUser(myID).getxPosition() - speed, findUser(myID).getyPosition() + speed, findUser(myID).getzPosition());
				camera.position.x -= speed;
				camera.position.y += speed;
			} else {
				findUser(myID).setPosition(findUser(myID).getxPosition(), findUser(myID).getyPosition() + speed, findUser(myID).getzPosition());
				camera.position.y += speed;
			}
			break;
		case 's':
		case 'arrow down':
			if ((keysPressed['d']) || (keysPressed['arrow right'])) {
				findUser(myID).setPosition(findUser(myID).getxPosition() + speed, findUser(myID).getyPosition() - speed, findUser(myID).getzPosition());
				camera.position.x += speed;
				camera.position.y -= speed;
			} else if ((keysPressed['a']) || (keysPressed['arrow left'])) {
				findUser(myID).setPosition(findUser(myID).getxPosition() - speed, findUser(myID).getyPosition() - speed, findUser(myID).getzPosition());
				camera.position.x -= speed;
				camera.position.y -= speed;
			} else {
				findUser(myID).setPosition(findUser(myID).getxPosition(), findUser(myID).getyPosition() - speed, findUser(myID).getzPosition());
				camera.position.y -= speed;
			}
			break;
		case 'd':
		case 'arrow right':
			if ((keysPressed['w']) || (keysPressed['arrow up'])) {
				findUser(myID).setPosition(findUser(myID).getxPosition() + speed, findUser(myID).getyPosition() + speed, findUser(myID).getzPosition());
				camera.position.x += speed;
				camera.position.y += speed;
			} else if ((keysPressed['s']) || (keysPressed['arrow down'])) {
				findUser(myID).setPosition(findUser(myID).getxPosition() + speed, findUser(myID).getyPosition() - speed, findUser(myID).getzPosition());
				camera.position.x += speed;
				camera.position.y -= speed;
			} else {
				findUser(myID).setPosition(findUser(myID).getxPosition() + speed, findUser(myID).getyPosition(), findUser(myID).getzPosition());
				camera.position.x += speed;
			}
			break;
		case 'a':
		case 'arrow left':
			if ((keysPressed['w']) || (keysPressed['arrow up'])) {
				findUser(myID).setPosition(findUser(myID).getxPosition() - speed, findUser(myID).getyPosition() + speed, findUser(myID).getzPosition());
				camera.position.x -= speed;
				camera.position.y += speed;
			} else if ((keysPressed['s']) || (keysPressed['arrow down'])) {
				findUser(myID).setPosition(findUser(myID).getxPosition() - speed, findUser(myID).getyPosition() - speed, findUser(myID).getzPosition());
				camera.position.x -= speed;
				camera.position.y -= speed;
			} else {
				findUser(myID).setPosition(findUser(myID).getxPosition() - speed, findUser(myID).getyPosition(), findUser(myID).getzPosition());
				camera.position.x -= speed;
			}
			break;
		default:
			break;
	}
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
