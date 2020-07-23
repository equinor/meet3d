import * as threeD from '../../public/modules/3D.js'
import * as THREE from '../../public/modules/three.module.js'

beforeAll(() => {
  threeD.init3D(3, {"5" : {id: 5}}, document.body);
});

beforeEach(() => {

  threeD.moveForward = false;
  threeD.moveBackward = false;
  threeD.moveRight = false;
  threeD.moveLeft = false;

  threeD.newUserJoined3D(5, "test");
  let text = new THREE.Mesh();
  text.name = "text";
  threeD.UserMap[5].avatar.model.add(text);
});

afterEach(() => {
  if (threeD.UserMap[5])
    threeD.userLeft3D(5);
});

afterAll(() => {
  threeD.leave3D();
});

test('changeUserPosition - small value - all axis', () => {
  threeD.changeUserPosition(5, 1, 1, 1);

  expect(threeD.UserMap[5].avatar.model.position.x).toBe(1);
  expect(threeD.UserMap[5].avatar.model.position.y).toBe(1);
  expect(threeD.UserMap[5].avatar.model.position.z).toBe(1);
});

test('changeUserPosition - large value - all axis', () => {
  threeD.changeUserPosition(5, 10000001, -999999, 70000001);

  expect(threeD.UserMap[5].avatar.model.position.x).toBe(10000001);
  expect(threeD.UserMap[5].avatar.model.position.y).toBe(-999999);
  expect(threeD.UserMap[5].avatar.model.position.z).toBe(70000001);
});

test('set name normal', () => {
  threeD.userLeft3D(5);
  threeD.newUserJoined3D(5, "myName");
  expect(threeD.UserMap[5].name).toBe("myName");
});

test('set name empty', () => {
  threeD.userLeft3D(5);
  expect(() => {threeD.newUserJoined3D(5, '')}).toThrow("Name cannot be empty");
});

test('set name null', () => {
  threeD.userLeft3D(5);
  expect(() => {threeD.newUserJoined3D(5, null)}).toThrow("Name cannot be empty");
});

test('set name number', () => {
  threeD.userLeft3D(5);
  expect(() => {threeD.newUserJoined3D(5, 2)}).toThrow("Name must be a string");
});

test('set name number', () => {
  expect(threeD.getVideoRatio(50, 50)).toEqual({ height: 50, width: 50 });
});

test('setUserRotation - small value', () => {
  threeD.setUserRotation(5, 1);

  expect(threeD.UserMap[5].avatar.model.rotation.y).toBe(1);
});

test('setUserRotation - several values', () => {
  threeD.setUserRotation(5, 1);
  expect(threeD.UserMap[5].avatar.model.rotation.y).toBe(1);
  threeD.setUserRotation(5, 7);
  expect(threeD.UserMap[5].avatar.model.rotation.y).toBe(7);
  threeD.setUserRotation(5, -100);
  expect(threeD.UserMap[5].avatar.model.rotation.y).toBe(-100);
});

test('onDocumentKeyDown - user moved forwards', () => {
  threeD.onDocumentKeyDown({ keyCode: 87 });
  expect(threeD.moveForward && !threeD.moveBackward && !threeD.moveRight && !threeD.moveLeft).toBe(true);
});

test('onDocumentKeyDown - user moved left', () => {
  threeD.onDocumentKeyDown({ keyCode: 65 });
  expect(!threeD.moveForward && !threeD.moveBackward && !threeD.moveRight && threeD.moveLeft).toBe(true);
});

test('onDocumentKeyDown - user moved backwards', () => {
  threeD.onDocumentKeyDown({ keyCode: 83 });
  expect(!threeD.moveForward && threeD.moveBackward && !threeD.moveRight && !threeD.moveLeft).toBe(true);
});

test('onDocumentKeyDown - user moved right', () => {
  threeD.onDocumentKeyDown({ keyCode: 68 });
  expect(!threeD.moveForward && !threeD.moveBackward && threeD.moveRight && !threeD.moveLeft).toBe(true);
});

test('userLeft3D - user moved right', () => {
  threeD.userLeft3D(5);
  expect(threeD.UserMap[5]).toBeUndefined();
});
