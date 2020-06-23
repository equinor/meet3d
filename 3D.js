

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(100, window.innerWidth / window.outerWidth, 0.1, 1000);
var renderer = new THREE.WebGLRenderer();

scene.background = new THREE.Color( 0xf0f0f0 );

var floor = new THREE.Mesh(
	new THREE.PlaneGeometry(100,100,100),
	new THREE.MeshBasicMaterial({color : "skyblue", wireframe :true})
);

floor.rotation.x += Math.PI/2;
scene.add( floor ); 


renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild( renderer.domElement);

var geometry = new THREE.BoxGeometry(20,20,20);
var material = new THREE.MeshNormalMaterial( {color:0x669966, wireframe:true});
var object = new THREE.Mesh(geometry, material);


var newobject = function(xPosition, yPosition, zPosition=0){ //function that makes an object and position it at input coordinates
	var object = new THREE.Mesh(geometry,material);
	object.position.x = xPosition;
	object.position.y = yPosition;
	scene.add(object);
};

camera.position.z =70;
newobject(0,0);

var light = new THREE.PointLight( 0xff0000, 1, 100 );
light.position.set( 50, 50, 50 );
scene.add( light );

//If we want to load an object from a file. 
/*var loader = new THREE.ObjectLoader();
loader.load(URL, handeler());

function handeler(){
	var mesh = new THREE.Mesh(geometry, material);
	scene.add(mesh);
}*/


function update(){  //function to update frame
	renderer.render(scene, camera);
	requestAnimationFrame(update);
}

update();

//lets you move the camera with the mouse
var controls = new THREE.OrbitControls( camera, renderer.domElement );
controls.minDistance = 1;
controls.maxDistance = 100;

