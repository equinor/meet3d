import * as threeD from '../../public/modules/3D.js'
import * as THREE from '../../public/modules/three.module.js'

test('changeUserPosition - small value - all axis', () => {
  threeD.init3D(3, {"5" : {id: 5}}, document.body);
  threeD.newUserJoined3D(5, "test");

  let text = new THREE.Mesh();
  text.name = "text";
  threeD.UserMap[5].avatar.model.add(text);

  threeD.changeUserPosition(5, 1, 2, 3);

  expect(threeD.UserMap[5].avatar.model.position.x).toBe(1);
  expect(threeD.UserMap[5].avatar.model.position.y).toBe(2);
  expect(threeD.UserMap[5].avatar.model.position.z).toBe(3);
});


test('set name', () => {
  threeD.init3D(3, {"5" : {id: 5}}, document.body);
  threeD.newUserJoined3D(5, "myName");
  expect(threeD.UserMap[5].name).toBe("myName");
});

test('set name new', () => {
  threeD.init3D(3, {"5" : {id: 5}}, document.body);
  threeD.newUserJoined3D(5, "my_new_name");
  expect(threeD.UserMap[5].name).toBe("my_new_name");
});

test('set name - WILL FAIL', () => {
  threeD.init3D(3, {"5" : {id: 5}}, document.body);
  threeD.newUserJoined3D(5, "my_new_name");
  expect(threeD.UserMap[5].name).toBe("wrong _name");
});

test('changeUserPosition - big values - all axis', () => {
  threeD.init3D(3, {"5" : {id: 5}}, document.body);
  threeD.newUserJoined3D(5, "test");

  let text = new THREE.Mesh();
  text.name = "text";
  threeD.UserMap[5].avatar.model.add(text);

  threeD.changeUserPosition(5, 777777, 123456789, 1000000000);

  expect(threeD.UserMap[5].avatar.model.position.x).toBe(777777);
  expect(threeD.UserMap[5].avatar.model.position.y).toBe(123456789);
  expect(threeD.UserMap[5].avatar.model.position.z).toBe(1000000000);
});


test('changeUserPosition - negative values - all axis', () => {
  threeD.init3D(3, {"5" : {id: 5}}, document.body);
  threeD.newUserJoined3D(5, "test");

  let text = new THREE.Mesh();
  text.name = "text";
  threeD.UserMap[5].avatar.model.add(text);

  threeD.changeUserPosition(5, -77, -44444400, -1);

  expect(threeD.UserMap[5].avatar.model.position.x).toBe(-77);
  expect(threeD.UserMap[5].avatar.model.position.y).toBe(-44444400);
  expect(threeD.UserMap[5].avatar.model.position.z).toBe(-1);
});

test('changeUserPosition - new test', () => {
  threeD.init3D(3, {"5" : {id: 5}}, document.body);
  threeD.newUserJoined3D(5, "test");

  let text = new THREE.Mesh();
  text.name = "text";
  threeD.UserMap[5].avatar.model.add(text);

  threeD.changeUserPosition(5, 10, 100, 1000);

  expect(threeD.UserMap[5].avatar.model.position.x).toBe(10);
  expect(threeD.UserMap[5].avatar.model.position.y).toBe(100);
  expect(threeD.UserMap[5].avatar.model.position.z).toBe(1000);
});