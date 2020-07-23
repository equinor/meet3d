"use strict";

require("core-js/modules/es.promise");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.newUserJoined3D = newUserJoined3D;
exports.userGotMedia = userGotMedia;
exports.updatePos = updatePos;
exports.userLeft3D = userLeft3D;
exports.init3D = init3D;
exports.updateShareScreen3D = updateShareScreen3D;
exports.getVideoList = getVideoList;
exports.updateVideoList = updateVideoList;
exports.resizeCanvas = resizeCanvas;
exports.leave3D = leave3D;
exports.onDocumentKeyDown = onDocumentKeyDown;
exports.onDocumentKeyUp = onDocumentKeyUp;
exports.changeUserPosition = changeUserPosition;
exports.controls = exports.objectScale = exports.ourID = exports.UserMap = void 0;

var THREE = _interopRequireWildcard(require("./three.module.js"));

var _GLTFLoader = require("./GLTFLoader.js");

var _PointerLockControls = require("./PointerLockControls.js");

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

// GLOBAL CONSTANTS
const maxX = 100;
const maxY = 100; // This is probably not needed

const maxZ = 100;
const wallHeight = 100;
const objectScale = 7;
exports.objectScale = objectScale;
const videoCount = 3;
const maxXcam = maxX - 1;
const minXcam = -maxX + 1;
const maxZcam = maxZ - 1;
const minZcam = -maxZ + 1; // GLOBAL VARIABLES

var scene;
var camera;
var renderer;
var controls;
exports.controls = controls;
var requestID;
var listener;
var loader;
var time;
var objectSize = new THREE.Vector3(); // A Vector3 representing size of each 3D-object

var tv; // The object which stores the screen sharing video

var tvAudio;
var moveForward = false;
var moveBackward = false;
var moveLeft = false;
var moveRight = false;
var prevUpdateTime = performance.now();
var prevPosTime = performance.now();
var velocity = new THREE.Vector3();
var direction = new THREE.Vector3();
var videoWidth = 0; // The width that is used up by videos on the side

var speed = 400.0; // The speed at which we move
// GLOBAL CONTAINERS

var UserMap = {}; //json-object to store the Users

exports.UserMap = UserMap;
var allObjects = []; // Stores all 3D objects so that they can be removed later

var videoList = []; // The list of remote videos to display

var videoListLength = 0; // The number of videos to show at a time, not including our own

const resourceList = ['objects/obj/pawn.glb']; //List of 3D-object-files

var resourceIndex = 0;
var connections;
var ourID;
exports.ourID = ourID;

async function init3D(id, connectionsObject, div) {
  exports.ourID = ourID = id;
  connections = connectionsObject;
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0f0f0); // CAMERA

  camera = new THREE.PerspectiveCamera(100, window.innerWidth / window.outerWidth, 0.1, 1000);
  camera.position.y = wallHeight / 3; // LIGHT

  let light = new THREE.PointLight(0xff0000, 1, 100);
  let ambientLight = new THREE.AmbientLight(0xcccccc); //keep the ambient light. The objects look a lot better

  let directionalLight = new THREE.DirectionalLight(0xffffff);
  directionalLight.position.set(50, 50, 50).normalize();
  scene.add(light);
  scene.add(ambientLight);
  scene.add(directionalLight);
  allObjects.push(light);
  allObjects.push(ambientLight);
  allObjects.push(directionalLight); //load models

  loader = new _GLTFLoader.GLTFLoader();
  addWalls();
  addDecoration(); // RENDERER

  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight - 30);
  renderer.domElement.id = "scene"; // Adds an ID to the canvas element

  div.appendChild(renderer.domElement);
  exports.controls = controls = new _PointerLockControls.PointerLockControls(camera, div);
  scene.add(controls.getObject());
  allObjects.push(controls.getObject());
  listener = new THREE.AudioListener();
  controls.getObject().add(listener);
  window.addEventListener('resize', onWindowResize, false);
  document.addEventListener('keydown', onDocumentKeyDown, false);
  document.addEventListener('keyup', onDocumentKeyUp, false);
  renderer.render(scene, camera);
  update();
}

function getVideoRatio(height, width) {
  let ratio = width / height; // This block of code makes the video fit the screen whilst maintaining the original aspect ratio

  if (height > wallHeight) {
    var width2 = wallHeight * ratio;

    if (width2 > maxX * 2) {
      height = maxX * 2 / ratio;
      width = maxX * 2;
    } else {
      width = width2;
      height = wallHeight;
    }
  } else if (width > maxX * 2) {
    var height2 = maxX * 2 / ratio;

    if (height2 > wallHeight) {
      width = wallHeight / ratio;
      height = wallHeight;
    } else {
      width = maxX * 2;
      height = height2;
    }
  }

  return {
    height: height,
    width: width
  };
}

function addPositionalAudioToObject(stream, object) {
  var posAudio = new THREE.PositionalAudio(listener);
  posAudio.setRefDistance(20);
  posAudio.setRolloffFactor(2);
  let n = document.createElement("audio"); // Create HTML element to store audio stream

  n.srcObject = stream;
  n.muted = true; // We only want audio from the positional audio

  const audio1 = posAudio.context.createMediaStreamSource(n.srcObject);

  try {
    posAudio.setNodeSource(audio1);
    object.model.add(posAudio);
  } catch (err) {
    console.error(err);
  }

  ;
  return n;
}
/**
 * Places the given video stream in the 3D environment. If it is null, then we
 * only remove the existing one.
 */


function updateShareScreen3D(screenTrack, details) {
  if (screenTrack) {
    // If someone is sharing their screen, display it
    let stream = new MediaStream([screenTrack]);

    if (screenTrack.kind == "video") {
      let screenObject = document.createElement("video");
      screenObject.autoplay = true;
      screenObject.srcObject = stream;
      let texture = new THREE.VideoTexture(screenObject);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.format = THREE.RGBFormat;
      let height = details.height;
      let width = details.width;
      let ratio = getVideoRatio(height, width);
      tv = new THREE.Mesh(new THREE.PlaneBufferGeometry(ratio.width, ratio.height, 1, 1), new THREE.MeshBasicMaterial({
        side: THREE.DoubleSide,
        map: texture
      }));
      tv.position.z = -(maxZ - 1);
      tv.position.y += wallHeight / 2;
      scene.add(tv);
      allObjects.push(tv);
    } else if (screenTrack.kind == "audio") {
      tvAudio = new THREE.Object3D();
      addPositionalAudioToObject(stream, tvAudio);
    }
  } else {
    scene.remove(tv);
    scene.remove(tvAudio);
  }
}

function addWalls() {
  let textureLoader = new THREE.TextureLoader(); // FLOOR

  let floortext = textureLoader.load("objects/obj/floor.jpg");
  let floor = new THREE.Mesh(new THREE.PlaneGeometry(maxX * 2, maxZ * 2, maxX * 2, maxZ * 2), new THREE.MeshBasicMaterial({
    side: THREE.DoubleSide,
    map: floortext
  }));
  floor.rotation.x += Math.PI / 2; //can rotate the floor/plane

  scene.add(floor);
  allObjects.push(floor); // CEILING

  let ceilingtext = textureLoader.load("objects/obj/ceiling2.jpg");
  let ceiling = new THREE.Mesh(new THREE.PlaneGeometry(maxX * 2, maxZ * 2, maxX * 2, maxZ * 2), new THREE.MeshBasicMaterial({
    side: THREE.DoubleSide,
    map: ceilingtext
  }));
  ceiling.rotation.x += Math.PI / 2; //can rotate the floor/plane

  ceiling.position.y += wallHeight;
  scene.add(ceiling);
  allObjects.push(ceiling); // WALLS

  let walltext = textureLoader.load("objects/obj/wall1.jpg");
  let wallLeft = new THREE.Mesh(new THREE.PlaneGeometry(maxX * 2, wallHeight, 1, 1), new THREE.MeshBasicMaterial({
    side: THREE.DoubleSide,
    map: walltext
  }));
  wallLeft.rotation.y += Math.PI / 2;
  wallLeft.position.x = -maxX;
  wallLeft.position.y += wallHeight / 2;
  let wallRight = new THREE.Mesh(new THREE.PlaneGeometry(maxX * 2, wallHeight, 1, 1), new THREE.MeshBasicMaterial({
    side: THREE.DoubleSide,
    map: walltext
  }));
  wallRight.rotation.y += Math.PI / 2;
  wallRight.position.x = maxX;
  wallRight.position.y += wallHeight / 2;
  let wallBack = new THREE.Mesh(new THREE.PlaneGeometry(maxX * 2, wallHeight, 1, 1), new THREE.MeshBasicMaterial({
    side: THREE.DoubleSide,
    map: walltext
  }));
  wallBack.position.z = maxZ;
  wallBack.position.y += wallHeight / 2;
  let wallFront = new THREE.Mesh(new THREE.PlaneBufferGeometry(maxX * 2, wallHeight, 1, 1), new THREE.MeshBasicMaterial({
    side: THREE.DoubleSide,
    map: walltext
  }));
  wallFront.position.z = -maxZ;
  wallFront.position.y += wallHeight / 2;
  scene.add(wallLeft);
  scene.add(wallRight);
  scene.add(wallBack);
  scene.add(wallFront);
  allObjects.push(wallLeft);
  allObjects.push(wallRight);
  allObjects.push(wallBack);
  allObjects.push(wallFront);
}

function addDecoration() {
  // PLANT
  const plant = new THREE.Object3D();
  loader.load('objects/obj/planten.glb', function (gltf) {
    plant.add(gltf.scene);
    plant.scale.x = 20;
    plant.scale.y = 20;
    plant.scale.z = 20;
    plant.position.x = 0;
    plant.position.y = 7;
    plant.position.z = 10;
    scene.add(plant);
  }); // TABLE

  const table = new THREE.Object3D();
  loader.load('objects/obj/table.glb', function (gltf) {
    table.add(gltf.scene);
    table.scale.x = 20;
    table.scale.y = 20;
    table.scale.z = 20;
    table.rotation.y += Math.PI / 2;
    scene.add(table);
  });
  allObjects.push(table);
  allObjects.push(plant);
}
/**
 * Returns a list containing the currently displayed videos.
 */


function getVideoList() {
  return videoList.slice(0, videoListLength);
} // Add username as text on top of 3D-object


function addText(name, model) {
  var text = new THREE.Mesh();
  var fontLoader = new THREE.FontLoader();
  fontLoader.load('helvetiker_regular.typeface.json', function (font) {
    let color = 0x990000;
    let textMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 1.0,
      side: THREE.DoubleSide
    });
    const letterSize = 2; // Creates an array of Shapes representing nameShowed

    let shapes = font.generateShapes(name, letterSize / objectScale);
    let textGeometry = new THREE.ShapeBufferGeometry(shapes); // Set center of text object equal to center of 3D-text-object

    textGeometry.computeBoundingBox();
    textGeometry.center(); // Determine position of text object realtive to 3D-object

    textGeometry.translate(0, (objectSize.y + letterSize) / objectScale, 0);
    text = new THREE.Mesh(textGeometry, textMaterial);
    text.name = "text";
    model.add(text);
  });
} // end of function addText()


function newUserJoined3D(id, name) {
  console.log("Adding new user to the 3D environment: " + name);
  let newUser = {};
  newUser['name'] = name;
  newUser['avatar'] = loadNewObject(resourceList[resourceIndex]);
  resourceIndex++;
  resourceIndex %= resourceList.length; // Make sure the index never exceeds the size of the list

  addText(name, newUser.avatar.model); // Add new user to UserMap

  UserMap[id] = newUser;
  updateVideoList(id);
}

function changeUserPosition(id, x, y, z) {
  let user = UserMap[id];
  user.avatar.model.position.x = x;
  user.avatar.model.position.y = y;
  user.avatar.model.position.z = z;

  if (connections[id].stream) {
    updateVideoList(id);
  }

  user.avatar.model.getObjectByName('text').lookAt(camera.position.x, 0, camera.position.z);
}

function setUserRotation(id, angleY) {
  UserMap[id].avatar.model.rotation.y = angleY;
}
/**
 * This function updates the list of videos to display on the screen. Only the
 * 'videoCount' number of videos closest to the user are displayed. This is
 * done using a basic insertion sort algorithm.
 */


function updateVideoList(id) {
  if (connections[id] && !connections[id].stream) {
    return; // Ignore users who do not share video
  }

  if (videoList.includes(id) || id == ourID) {
    // In this case we need to update the entire list using all positions
    for (let i = 0; i < videoListLength; i++) {
      let id = videoList[i];

      if (id && connections[id] && connections[id].stream) {
        document.getElementById(connections[id].stream.id).hidden = true; // Hide currently shown videos

        document.getElementById(connections[id].stream.id).children[0].autoplay = false;
      }
    }

    videoList = []; // Reset the list of videos to display

    videoListLength = 0;

    for (const testID in UserMap) {
      if (testID == ourID || !connections[testID] || !connections[testID].stream || videoList.includes(testID)) {
        continue; // Ignore our own user, those who do not have video and those already in the list
      }

      let shiftedID = shiftVideoList(testID); // Try to add 'testID' to the list

      if (shiftedID !== 0) {
        // Someone was shifted out of the list, which means 'testID' was added
        if (videoListLength < videoCount) {
          // If there is more room, add them in at the end
          videoList[videoListLength] = shiftedID;
          videoListLength++;
        }
      } else {
        // No one was removed from the list, which means 'testID' was not added
        if (videoListLength < videoCount) {
          videoList[videoListLength] = testID;
          videoListLength++;
        }
      }
    }
  } else if (videoListLength < videoCount) {
    // The list is not full so just add the user
    let shifted = shiftVideoList(id);

    if (shifted) {
      videoList[videoListLength] = shifted; // Re-add the user that was shifted out
    } else {
      videoList[videoListLength] = id; // Add the current ID at the end
    }

    videoListLength++;
  } else {
    // Try to fit the user into the list, and if it succeeds then hide the user that was shifted out
    let shiftedID = shiftVideoList(id);

    if (shiftedID !== 0) {
      // Someone was shifted out of the list, so we hide them
      document.getElementById(connections[shiftedID].stream.id).hidden = true;
      document.getElementById(connections[shiftedID].stream.id).autoplay = false;
    }
  }

  updateVideoVisibility(); // Updates the HTML so that only the users in the list are shown
}
/**
 * Inserts an ID into the videoList, shifting the later elements along. If any
 * element gets shifted out of the array then their ID is returned, and 0 otherwise
 */


function shiftVideoList(id) {
  let thisDistance = getDistance(id);
  let shiftedID = 0;

  for (let i = 0; i < videoListLength; i++) {
    if (shiftedID) {
      // If an ID has been inserted, shift the later entries along
      let tempID = shiftedID;
      shiftedID = videoList[i];
      videoList[i] = tempID;
    } else if (getDistance(videoList[i]) >= thisDistance) {
      // If the user 'id' is closer than the current entry then replace the entry and shift it along
      shiftedID = videoList[i];
      videoList[i] = id;
    }
  }

  return shiftedID; // Return the shifted ID or 0 otherwise
}
/**
 * Gets a number representing the distance between the user with ID 'id' and our
 * user in the 3D space.
 */


function getDistance(id) {
  let otherPos = UserMap[id].avatar.model.position;
  return (otherPos.x - camera.position.x) ** 2 + (otherPos.z - camera.position.z) ** 2;
}
/**
 * True if keypress suggests that the user wants to move,
 * false otherwise.
 */


function hasMoved() {
  return direction.lengthSq();
}
/**
 * This function updates which videos are visible on the screen. The list of
 * videos to display is 'videoList' in 3D.js.
 */


function updateVideoVisibility() {
  for (let i = 0; i < videoListLength; i++) {
    let id = videoList[i];
    if (id == 0 || !connections[id].stream.id) continue;
    document.getElementById(connections[id].stream.id).hidden = false;
    document.getElementById(connections[id].stream.id).children[0].autoplay = true;
  }
}

function userGotMedia(id, mediaStream) {
  UserMap[id]["media"] = mediaStream;
  var posAudio = new THREE.PositionalAudio(listener);
  posAudio.setRefDistance(20);
  posAudio.setRolloffFactor(2);
  let n = document.createElement("audio"); // Create HTML element to store audio stream

  n.srcObject = mediaStream;
  n.muted = true; // We only want audio from the positional audio

  UserMap[id].audioElement = n;
  const audio1 = posAudio.context.createMediaStreamSource(n.srcObject);

  try {
    posAudio.setNodeSource(audio1);
    UserMap[id].avatar.model.add(posAudio);
  } catch (err) {
    console.error(err);
  }

  ;
}

function userLeft3D(id) {
  scene.remove(UserMap[id].avatar.model);

  if (UserMap[id].audioElement.srcObject) {
    UserMap[id].audioElement.srcObject.getTracks().forEach(track => track.stop());
  }

  UserMap[id].audioElement.srcObject = null;
  UserMap[id].audioElement = null;
  delete UserMap[id];
  updateVideoList(ourID);
} // Load 3D-object from file "resource" and add it to scene


function loadNewObject(resource) {
  let avatar = {};
  avatar['model'] = new THREE.Object3D();
  loader.load(resource, function (gltf) {
    // this could probably be vastly improved
    avatar.model.add(gltf.scene);
    avatar.model.scale.x = objectScale;
    avatar.model.scale.y = objectScale;
    avatar.model.scale.z = objectScale; //FIXME errors when these are uncommented
    //avatar['clips'] = gltf.animations;
    //avatar['mixer'] = new THREE.AnimationMixer(gltf.scene);
    //avatar['swim'] = avatar.mixer.clipAction(gltf.animations[0]);
    //avatar.swim.play(); // FIXME Currently not working

    let boundingBox = new THREE.Box3().setFromObject(avatar.model);
    objectSize = boundingBox.getSize(); // Returns Vector3

    scene.add(avatar.model);
    allObjects.push(avatar.model);
  });
  return avatar;
}

function onDocumentKeyDown(event) {
  switch (event.keyCode) {
    case 87:
      //w
      moveForward = true;
      break;

    case 65:
      // a
      moveLeft = true;
      break;

    case 83:
      // s
      moveBackward = true;
      break;

    case 68:
      // d
      moveRight = true;
      break;

    case 38:
      //up
      time = performance.now();
      prevUpdateTime = time;
      controls.lock();
      break;

    case 40:
      // down
      controls.unlock();
      break;
  }
}

function onDocumentKeyUp(event) {
  switch (event.keyCode) {
    case 87:
      // w
      moveForward = false;
      break;

    case 65:
      // a
      moveLeft = false;
      break;

    case 83:
      // s
      moveBackward = false;
      break;

    case 68:
      // d
      moveRight = false;
      break;
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  resizeCanvas(-1);
}
/**
 * Resizes the 3D scene, whilst making sure to include the video streams if there
 * are any. The parameter specifies how much space to leave on the right side.
 * If it is -1 then the previously used value of videoWidth will be used.
 */


function resizeCanvas(newWidth) {
  if (newWidth >= 0) videoWidth = newWidth;
  renderer.setSize(window.innerWidth - videoWidth, window.innerHeight - 30);
} //function to update frame


function update() {
  requestID = requestAnimationFrame(update);

  if (controls.isLocked === true) {
    time = performance.now();
    var delta = (time - prevUpdateTime) / 1000;
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;
    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize(); // this ensures consistent movements in all directions

    if (moveForward || moveBackward) velocity.z -= direction.z * speed * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * speed * delta;
    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);
    if (camera.position.x > maxXcam) camera.position.x = maxXcam;else if (camera.position.x < minXcam) camera.position.x = minXcam;
    if (camera.position.z > maxZcam) camera.position.z = maxZcam;else if (camera.position.z < minZcam) camera.position.z = minZcam; // Only call costly functions if we have moved and some time has passed since the last time we called them

    if (hasMoved() && time - prevPosTime > 50) {
      changePos(camera.position.x, 0, camera.position.z); // Update our position for others

      updateVideoList(ourID); // Update which videos to show

      for (let keyId in UserMap) {
        // Makes the usernames point towards the user
        UserMap[keyId].avatar.model.getObjectByName('text').lookAt(camera.position.x, 0, camera.position.z);
      }

      prevPosTime = time;
    }

    prevUpdateTime = time;
  }

  renderer.render(scene, camera);
}
/**
 * This is a wrapper function which can be used to update our current position
 * for other users without needing to access 3D.js variables.
 */


function updatePos() {
  changePos(camera.position.x, 0, camera.position.z);
}
/**
 * Function which tells other users our new 3D position.
 */


function changePos(x, y, z) {
  let jsonPos = JSON.stringify({
    type: "pos",
    x: x,
    y: y,
    z: z
  });

  for (let id in connections) {
    // Send it to everyone
    connections[id].dataChannel.send(jsonPos);
  }
}

function leave3D() {
  updateShareScreen3D(null);

  for (let id in UserMap) {
    if (UserMap[id].audioElement) {
      UserMap[id].audioElement.srcObject.getTracks().forEach(track => track.stop());
      UserMap[id].audioElement.srcObject = null;
      UserMap[id].audioElement = null;
    }

    delete UserMap[id];
  }

  for (let i in allObjects) {
    if (allObjects[i]) scene.remove(allObjects[i]);
  }

  document.removeEventListener("keydown", onDocumentKeyDown);
  document.removeEventListener("keyup", onDocumentKeyUp);

  if (document.getElementById("scene")) {
    document.getElementById("scene").outerHTML = ''; // Deletes the scene canvas
  }

  window.cancelAnimationFrame(requestID); // Stops rendering the scene

  scene = null;
  camera = null;
  renderer = null;
  exports.controls = controls = null;
  requestID = undefined;
  listener = null;
  loader = null;
  exports.UserMap = UserMap = {};
  allObjects = [];
  videoList = [];
  videoListLength = 0;
  resourceIndex = 0;
}