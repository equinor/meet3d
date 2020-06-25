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

//list to store all the id´s
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

/*moveObject(direction){
	//center the camera on the character (this seem to conflict with the settings of the scene)
	//camera.position.x = this.object.position.x;
	//camera.position.y = this.object.position.y;
	//camera.position.z = this.object.position.z + 70; //10 so as to hover above the object
	switch (direction){
		case "up":
			this.object.position.y += 1;
			camera.position.y += 1;
			break;
		case "down":
			this.object.position.y -= 1;
			camera.position.y -= 1;
			break;
		case "right":
			this.object.position.x += 1;
			camera.position.x += 1;
			break;
		case "left":
			this.object.position.x -= 1;
			camera.position.x -= 1;
			break;
		case "right-up":
			this.object.position.x += 1;
			this.object.position.y += 1;
			camera.position.x += 1;
			camera.position.y += 1;
			break;
		case "left-up":
			this.object.position.x -= 1;
			this.object.position.y += 1;
			camera.position.x -= 1;
			camera.position.y += 1;
			break;
		default :
			break; 
	}
}*/

  //var keysPressed = {};
  document.addEventListener("keydown", onDocumentKeyDown, false);
  function onDocumentKeyDown(event) {
	var key = event.key;
	//keysPressed[event.key] = true;
	console.log(findUser(myID));
	console.log(findUser(myID).getxPosition());
	console.log(findUser(myID).getyPosition());
	console.log(findUser(myID).getzPosition());
	switch (key){
		case 'w':
		case 'arrow up':
			/*if ((keysPressed['d']) || (keysPressed['arrow right'])) {
				UserList[0].object("right-up");
			} else if ((keysPressed['a']) || (keysPressed['arrow left'])) { 
				  UserList[0].object("left-up");
			} else { */
			console.log("UP");
			findUser(myID).setPosition(findUser(myID).getxPosition(), findUser(myID).getyPosition() + 1, findUser(myID).getzPosition());
			camera.position.y += 1;
			//}
			break;
		case 's':
		case 'arrow down':
			console.log("DOWN");
			findUser(myID).setPosition(findUser(myID).getxPosition(), findUser(myID).getyPosition() - 1, findUser(myID).getzPosition());
			camera.position.y -= 1;
			break;
		case 'd':
		case 'arrow right':
			console.log("RIGHT");
			findUser(myID).setPosition(findUser(myID).getxPosition() + 1, findUser(myID).getyPosition(), findUser(myID).getzPosition());
			camera.position.x += 1;
			break;
		case 'a':
		case 'arrow left':
			console.log("LEFT");
			findUser(myID).setPosition(findUser(myID).getxPosition() - 1, findUser(myID).getyPosition(), findUser(myID).getzPosition());
			camera.position.x -= 1;
			break;
		default:
			break;
	  }
	//keysPressed[event.key] = true;
  }

  //document.addEventListener("keyup", onDocumentKeyUp, false);
  //function onDocumentKeyUp(event) {
	  //keysPressed = {};
  //}

const myID = new user(0, "test", 10, 10, 0).getId();
console.log(myID);
//var user1 = new user(5, "test", 10, 10, 10)
console.log(UserList);


//If we want to load an object from a file. 
/*var loader = new THREE.ObjectLoader();
loader.load(URL, handeler());
function handeler(){
	var mesh = new THREE.Mesh(geometry, material);
	scene.add(mesh);
}*/


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