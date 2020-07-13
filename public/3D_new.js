var scene;
var camera;
var renderer;
var controls;
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

let wallLeft;
let wallRight;
let wallFront;

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
}