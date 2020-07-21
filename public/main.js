/*import {
  init3D,
  updateShareScreen3D,
  getVideoList,
  updateVideoList,
  resizeCanvas,
  leave3D,
  onDocumentKeyDown,
  onDocumentKeyUp,
  changeUserPosition,
  controls
} from './modules/3D.js';*/
// import { initSignaling, leaveRoom } from './modules/connect.js';
//import * as ThreeD from './modules/3D.js';
//import * as Connect from './modules/connect.js';
import * as Client from './modules/client.js';

var startButton = document.getElementById("start/leave");


startButton.onclick = function () { Client.init(startButton) };
Client.cameraButton.onclick = function () { Client.shareCamera(cameraButton) };
Client.shareButton.onclick = function () { Client.shareScreen(shareButton) };

username.addEventListener("keyup", function(event) {
    if (event.keyCode === 13) { // This is the 'enter' key-press
      event.preventDefault();
      Client.init(startButton); // Join the conference by pressing enter in the username input box
    }
  });

roomName.addEventListener("keyup", function(event) {
    if (event.keyCode === 13) { // This is the 'enter' key-press
      event.preventDefault();
      Client.init(startButton); // Join the conference by pressing enter in the room name input box
    }
  });

chatSend.addEventListener("keyup", function(event) {
    if (event.keyCode === 13) { // This is the 'enter' key-press
      event.preventDefault();
      Client.sendChat(); // Send chat message by pressing enter in the chat
    }
  });


/*export {
  appendConnectionHTMLList,
  addLocalTracksToConnection,
  addVideoStream,
  addScreenCapture,
  advertiseFile,
  dataChannelReceive,
  userLeft,
  changePos,
  updateVideoVisibility
};*/
