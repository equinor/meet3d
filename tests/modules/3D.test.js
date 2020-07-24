import * as threeD from '../../public/modules/3D.js'
import * as THREE from '../../public/modules/three.module.js'

// --------------------------- SETUP ---------------------------

beforeAll(() => {
  threeD.init3D(3, {"5" : {id: 5}, "1" : {id: 1}, "6" : {id: 6}}, document.body);
});

beforeEach(() => {
  //threeD.videoList = [];
  //threeD.videoListLength = 0;

  threeD.setVideoList([]);
  threeD.setVideoListLength(0);

  threeD.moveForward = false;
  threeD.moveBackward = false;
  threeD.moveRight = false;
  threeD.moveLeft = false;

  threeD.newUserJoined3D(5, "test");
  let text5 = new THREE.Mesh();
  text5.name = "text";
  threeD.UserMap[5].avatar.model.add(text5);

  threeD.newUserJoined3D(1, "test1");
  let text1 = new THREE.Mesh();
  text1.name = "text";
  threeD.UserMap[1].avatar.model.add(text1);

  threeD.newUserJoined3D(6, "test6");
  let text6 = new THREE.Mesh();
  text6.name = "text";
  threeD.UserMap[6].avatar.model.add(text6);
});

afterEach(() => {
  if (threeD.UserMap[5])
    threeD.userLeft3D(5);
  if (threeD.UserMap[1])
    threeD.userLeft3D(1);
  if (threeD.UserMap[6])
    threeD.userLeft3D(6);
});

afterAll(() => {
  threeD.leave3D();
});

// --------------------------- TESTS ---------------------------

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

test('getDistance - small x movement', () => {
  threeD.changeUserPosition(5, 5, 0, 0);
  expect(threeD.getDistance(5)).toBe(25);
});

test('getDistance - small negative x movement', () => {
  threeD.changeUserPosition(5, -5, 0, 0);
  expect(threeD.getDistance(5)).toBe(25);
});

test('getDistance - small x, z movements', () => {
  threeD.changeUserPosition(5, 5, 0, 6);
  expect(threeD.getDistance(5)).toBe(25 + 36);
});

test('getDistance - small negative x, z movements', () => {
  threeD.changeUserPosition(5, -5, 0, -6);
  expect(threeD.getDistance(5)).toBe(25 + 36);
});

test('getDistance - small y movement', () => {
  threeD.changeUserPosition(5, 0, 5, 0);
  expect(threeD.getDistance(5)).toBe(0);
});

test('getDistance - same positions', () => {
  threeD.changeUserPosition(5, 0, 0, 0);
  expect(threeD.getDistance(5)).toBe(0);
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

test('onDocumentKeyUp - user stopped moving forwards', () => {
  threeD.moveForward = true;
  threeD.moveBackward = true;
  threeD.moveRight = true;
  threeD.moveLeft = true;
  threeD.onDocumentKeyUp({ keyCode: 87 });
  expect(!threeD.moveForward && threeD.moveBackward && threeD.moveRight && threeD.moveLeft).toBe(true);
});

test('onDocumentKeyUp - user stopped moving left', () => {
  threeD.moveForward = true;
  threeD.moveBackward = true;
  threeD.moveRight = true;
  threeD.moveLeft = true;
  threeD.onDocumentKeyUp({ keyCode: 65 });
  expect(threeD.moveForward && threeD.moveBackward && threeD.moveRight && !threeD.moveLeft).toBe(true);
});

test('onDocumentKeyUp - user stopped moving backwards', () => {
  threeD.moveForward = true;
  threeD.moveBackward = true;
  threeD.moveRight = true;
  threeD.moveLeft = true;
  threeD.onDocumentKeyUp({ keyCode: 83 });
  expect(threeD.moveForward && !threeD.moveBackward && threeD.moveRight && threeD.moveLeft).toBe(true);
});

test('onDocumentKeyUp - user stopped moving right', () => {
  threeD.moveForward = true;
  threeD.moveBackward = true;
  threeD.moveRight = true;
  threeD.moveLeft = true;
  threeD.onDocumentKeyUp({ keyCode: 68 });
  expect(threeD.moveForward && threeD.moveBackward && !threeD.moveRight && threeD.moveLeft).toBe(true);
});

test('userLeft3D - user removed correctly', () => {
  threeD.userLeft3D(5);
  expect(threeD.UserMap[5]).toBeUndefined();
});

test('shiftVideoList - empty list, none pushed out', () => {
  threeD.setVideoList([]);
  threeD.setVideoListLength(0);
  let shifted = threeD.shiftVideoList(5);
  expect(threeD.videoList).toEqual([]);
  expect(shifted).toBe(0);
});

test('shiftVideoList - one entry, one pushed out', () => {
  threeD.setVideoList([1]);
  threeD.setVideoListLength(1);

  threeD.changeUserPosition(1, 10, 10, 10);
  threeD.changeUserPosition(5, 5, 5, 5);
  let shifted = threeD.shiftVideoList(5);
  expect(threeD.videoList).toEqual([5]);
  expect(shifted).toBe(1);
});

test('shiftVideoList - one entry, none pushed out', () => {
  threeD.setVideoList([1]);
  threeD.setVideoListLength(1);

  threeD.changeUserPosition(1, 5, 5, 5);
  threeD.changeUserPosition(5, 10, 10, 10);
  let shifted = threeD.shiftVideoList(5);
  expect(threeD.videoList).toEqual([1]);
  expect(shifted).toBe(0);
});

test('shiftVideoList - two entries, one pushed out, new inserted last', () => {
  threeD.setVideoList([1, 6]);
  threeD.setVideoListLength(2);

  threeD.changeUserPosition(1, 5, 5, 5);
  threeD.changeUserPosition(5, 10, 10, 10);
  threeD.changeUserPosition(6, 15, 15, 15);
  let shifted = threeD.shiftVideoList(5);
  expect(threeD.videoList).toEqual([1, 5]);
  expect(shifted).toBe(6);
});

test('shiftVideoList - two entries, one pushed out, new inserted first', () => {
  threeD.setVideoList([1, 6]);
  threeD.setVideoListLength(2);

  threeD.changeUserPosition(1, 10, 10, 10);
  threeD.changeUserPosition(5, 5, 5, 5);
  threeD.changeUserPosition(6, 15, 15, 15);
  let shifted = threeD.shiftVideoList(5);
  expect(threeD.videoList).toEqual([5, 1]);
  expect(shifted).toBe(6);
});
