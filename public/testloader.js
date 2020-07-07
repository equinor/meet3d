
// Load 3D Scene
var scene = new THREE.Scene(); 

 // Load Camera Perspektive
var camera = new THREE.PerspectiveCamera( 25, window.innerWidth / window.innerHeight, 1, 20000 );
camera.position.set( 1, 1, 20 );
	
 // Load a Renderer
var renderer = new THREE.WebGLRenderer({ alpha: false });
renderer.setClearColor( 0xC5C5C3 );
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
	
 // Load the Orbitcontroller
var controls = new THREE.OrbitControls( camera, renderer.domElement ); 
			
 // Load Light
var ambientLight = new THREE.AmbientLight( 0xcccccc );
scene.add( ambientLight );
			
var directionalLight = new THREE.DirectionalLight( 0xffffff );
directionalLight.position.set( 0, 1, 1 ).normalize();
scene.add( directionalLight );				

 // glTf 2.0 Loader
var loader = new THREE.GLTFLoader();				
	loader.load( 'objects/Clownfish/Clownfish.glb', function ( gltf ) {             
	var object = gltf.scene;				
	gltf.scene.scale.set( 2, 2, 2 );			   
	gltf.scene.position.x = 0;				    //Position (x = right+ left-) 
        gltf.scene.position.y = 0;				    //Position (y = up+, down-)
	gltf.scene.position.z = 0;				    //Position (z = front +, back-)
	
	scene.add( gltf.scene );
	});	 

function animate() {
	render();
	requestAnimationFrame( animate );
	}

function render() {
	renderer.render( scene, camera );
	}

render();
animate();




