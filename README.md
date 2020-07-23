# 3DAudioCalls

In this project we are creating a conferencing web application which allows the users in the conference to communicate with each other with 3D audio. This means that they are able to move around in a virtual 3D environment where participants who are closer together are able to hear each other more clearly than those stood further apart or behind an obstacle.

These features are implemented using WebRTC connections and the Three.js JavaScript library.

Below is a diagram showing the signaling process in client.js. In this case the "Server" represents the interaction with the server.js program.
![A diagram showing the WebRTC signaling process](/WebRTC-signaling.png)

The following diagram illustrated the broad architecture of the program, by mapping the connections between the different modules and files included.
![A diagram showing the program high level architecture](/architecture-diagram.png)
