

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(100, window.innerWidth / window.outerWidth, 0.1, 1000);
var renderer = new THREE.WebGLRenderer();
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
	//renderer.render(scene,camera);};
};

camera.position.z =70;
newobject(0,0);


function update(){  //function to update frame
	renderer.render(scene, camera);
	requestAnimationFrame(update);
}
update();
