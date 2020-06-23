

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
};

//list to store all the id´s
var idlist =[];

//function to add a users id to the id list
var addToIdList = function(id){
	idlist.push(id);
};


//A user class. The constructor calls the makenewobject function.
//constructor adds a users id to the id list
class user{
	constructor(id, name, xPosition, yPosition, zPosition){
	this.name = name,
	this.id = id,
	makeNewObject(xPosition, yPosition, zPosition),
	addToIdList(id)};
	getName(){return this.name};
	getId(){return this.id};
};

var user1 = new user(5, "Lene", 10, 10, 10)
console.log(idlist);


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

