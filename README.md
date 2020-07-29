# 3DAudioCalls

In this project we are creating a conferencing web application which allows the users in the conference to communicate with each other with 3D audio. This means that they are able to move around in a virtual 3D environment where participants who are closer together are able to hear each other more clearly than those stood further apart or behind an obstacle.

These features are implemented using WebRTC connections and the Three.js JavaScript library.

Below is a diagram showing the signaling process in client.js. In this case the "Server" represents the interaction with the server.js program.
![A diagram showing the WebRTC signaling process](/WebRTC-signaling.png)

The following diagram illustrated the broad architecture of the program, by mapping the connections between the different modules and files included.
![A diagram showing the program high level architecture](/architecture-diagram.png)

Usage:
To run the program you can open this [URL](https://web-server-meet3d-master.radix.equinor.com/).

To join a conference, just type in a username and the name of the room you want to join (case-sensitive). Then either click the enter key, or the 'join' button.

Once in the room the program will connect you to the other participants in the room and also load in the 3D environment. Be aware that this could take up to 10 seconds, depending on the number of participants.

After opening the 3D environment by pressing the 'Open 3D' button, you can look and move around by first locking your view to the scene. This is done by pressing the 'up' arrow key. If this does not work then you may want to click on the screen to make sure that the cursor is focused on the correct window. At this point you will be able to look around by moving your cursor. The 'W', 'A', 'S' and 'D' keys let you move around.
