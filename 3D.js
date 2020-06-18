var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

var geometry = new THREE.BoxGeometry();
var material = new THREE.MeshBasicMaterial( { color: 0x669966 } );
var cube = new THREE.Mesh( geometry, material );
scene.add( cube );

camera.position.z = 5;
var a = false;

var animate = function () {
	requestAnimationFrame( animate );

	cube.rotation.x += 0.01;
	if (a) {
		cube.rotation.y += 0.01;
	} else {
		cube.rotation.x += 0.01;
	}

	renderer.render( scene, camera );
};

function buttonA() {
	a = !a;
}

animate();