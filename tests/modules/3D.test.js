import * as threeD from '../../public/modules/3D.js'
import * as THREE from '../../public/modules/three.module.js'

test('changeUserPosition - small value - all axis', () => {
  threeD.init3D(3, {"5" : {id: 5}}, document.body);
  threeD.newUserJoined3D(5, "test");

  let text = new THREE.Mesh();
  text.name = "text";
  threeD.UserMap[5].avatar.model.add(text);

  threeD.changeUserPosition(5, 1, 1, 1);

  expect(threeD.UserMap[5].avatar.model.position.x).toBe(1);
});

test('set name', () => {
  threeD.init3D(3, {"5" : {id: 5}}, document.body);
  threeD.newUserJoined3D(5, "myName");
  expect(threeD.UserMap[5].name).toBe("myName");
});
