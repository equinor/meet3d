/*
changes made by Emma to Lene's file :
-UserList instead of IdList
-each User has an Object property
-added getter for the object's position
-added object movement with arrow key (movement with the mouse could still be added later)
*/

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(100, window.innerWidth / window.outerWidth, 0.1, 1000);
var renderer = new THREE.WebGLRenderer();

scene.background = new THREE.Color( 0xf0f0f0 );

camera.position.z =70;
var light = new THREE.PointLight( 0xff0000, 1, 100 );
light.position.set( 50, 50, 50 );
scene.add( light );

//make a floor to rhe scene
var floor = new THREE.Mesh(
	new THREE.PlaneGeometry(100,100,100),
	new THREE.MeshBasicMaterial({color : "skyblue", wireframe :true})
);

floor.rotation.x += Math.PI/2; //can rotate the floor/plane
scene.add( floor ); 


renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild( renderer.domElement);


//choose which object to make when the makeobjectfunction is called
var geometry = new THREE.BoxGeometry(20,20,20);
var material = new THREE.MeshNormalMaterial( {color:0x669966, wireframe:true});
var object = new THREE.Mesh(geometry, material);

//function that makes an object and position it at input coordinates
var makeNewObject = function(xPosition, yPosition, zPosition){ 
	var object = new THREE.Mesh(geometry,material);
	object.position.x = xPosition;
	object.position.y = yPosition;
	object.position.z = zPosition;
	scene.add(object);
	return object;
};

//list to store all the Users
var UserList =[];

//function to add a user to the UsersList
var addToUserList = function(User){
	UserList.push(User);
};


//A user class. The constructor calls the makenewobject function.
//constructor adds a user to Userlist
class user{
	constructor(id, name, xPosition, yPosition, zPosition){
	this.name = name,
	this.id = id,
	this.object = makeNewObject(xPosition, yPosition, zPosition),
	addToUserList(this)};
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

function findUser(id){
	var i;
	for (i = 0; i < UserList.length; i++) {
  		if (id == UserList[i].getId()){
			  console.log(UserList[i].getId());
			  return UserList[i];
		  }
	}
	return false;
}

var keysPressed = {};
document.addEventListener("keydown", onDocumentKeyDown, false);
function onDocumentKeyDown(event) {
	var key = event.key;
	keysPressed[event.key] = true;
	console.log(findUser(myID));
	console.log(findUser(myID).getxPosition());
	console.log(findUser(myID).getyPosition());
	console.log(findUser(myID).getzPosition());
	console.log(keysPressed);
	switch (key){
		case 'w':
		case 'arrow up':
			if ((keysPressed['d']) || (keysPressed['arrow right'])) {
				console.log("UP-RIGHT");
				findUser(myID).setPosition(findUser(myID).getxPosition() + 1, findUser(myID).getyPosition() + 1, findUser(myID).getzPosition());
				camera.position.x += 1;
				camera.position.y += 1;
			} else if ((keysPressed['a']) || (keysPressed['arrow left'])) { 
				console.log("UP-LEFT");
				findUser(myID).setPosition(findUser(myID).getxPosition() - 1, findUser(myID).getyPosition() + 1, findUser(myID).getzPosition());
				camera.position.x -= 1;
				camera.position.y += 1;
			} else {
				console.log("UP");
				findUser(myID).setPosition(findUser(myID).getxPosition(), findUser(myID).getyPosition() + 1, findUser(myID).getzPosition());
				camera.position.y += 1;
			}
			break;
		case 's':
		case 'arrow down':
			if ((keysPressed['d']) || (keysPressed['arrow right'])) {
				console.log("DOWN-RIGHT");
				findUser(myID).setPosition(findUser(myID).getxPosition() + 1, findUser(myID).getyPosition() - 1, findUser(myID).getzPosition());
				camera.position.x += 1;
				camera.position.y -= 1;
			} else if ((keysPressed['a']) || (keysPressed['arrow left'])) { 
				console.log("DOWN-LEFT");
				findUser(myID).setPosition(findUser(myID).getxPosition() - 1, findUser(myID).getyPosition() - 1, findUser(myID).getzPosition());
				camera.position.x -= 1;
				camera.position.y -= 1;
			} else {
				console.log("DOWN");
				findUser(myID).setPosition(findUser(myID).getxPosition(), findUser(myID).getyPosition() - 1, findUser(myID).getzPosition());
				camera.position.y -= 1;
			}
			break;
		case 'd':
		case 'arrow right':
			if ((keysPressed['w']) || (keysPressed['arrow up'])) {
				console.log("RIGHT-UP");
				findUser(myID).setPosition(findUser(myID).getxPosition() + 1, findUser(myID).getyPosition() + 1, findUser(myID).getzPosition());
				camera.position.x += 1;
				camera.position.y += 1;
			} else if ((keysPressed['s']) || (keysPressed['arrow down'])) { 
				console.log("RIGHT-DOWN");
				findUser(myID).setPosition(findUser(myID).getxPosition() + 1, findUser(myID).getyPosition() - 1, findUser(myID).getzPosition());
				camera.position.x += 1;
				camera.position.y -= 1;
			} else {
				console.log("RIGHT");
				findUser(myID).setPosition(findUser(myID).getxPosition() + 1, findUser(myID).getyPosition(), findUser(myID).getzPosition());
				camera.position.x += 1;
			}
			break;
		case 'a':
		case 'arrow left':
			if ((keysPressed['w']) || (keysPressed['arrow up'])) {
				console.log("LEFT-UP");
				findUser(myID).setPosition(findUser(myID).getxPosition() - 1, findUser(myID).getyPosition() + 1, findUser(myID).getzPosition());
				camera.position.x -= 1;
				camera.position.y += 1;
			} else if ((keysPressed['s']) || (keysPressed['arrow down'])) { 
				console.log("LEFT-DOWN");
				findUser(myID).setPosition(findUser(myID).getxPosition() - 1, findUser(myID).getyPosition() - 1, findUser(myID).getzPosition());
				camera.position.x -= 1;
				camera.position.y -= 1;
			} else {
				console.log("LEFT");
				findUser(myID).setPosition(findUser(myID).getxPosition() - 1, findUser(myID).getyPosition(), findUser(myID).getzPosition());
				camera.position.x -= 1;
			}
			break;
		default:
			break;
	}
}

  document.addEventListener("keyup", onDocumentKeyUp, false);
  function onDocumentKeyUp(event) {
	delete keysPressed[event.key];
  }

const myID = new user(0, "test", 10, 10, 0).getId();
console.log(myID);
console.log(UserList);

//function to update frame
function update(){  
	renderer.render(scene, camera);
	requestAnimationFrame(update);
}

update();

//lets you move the camera with the mouse
var controls = new THREE.OrbitControls( camera, renderer.domElement );
controls.minDistance = 1;
controls.maxDistance = 100;


//function to change name of user.
function nameChange(userer, newname){
	userer.name = newname;
}