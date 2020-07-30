import * as ThreeD from '../../public/modules/3D.js'
import * as THREE from '../../public/modules/three.module.js'

// --------------------------- SETUP ---------------------------

beforeAll(() => {
  ThreeD.init(3, {"5" : {id: 5}, "1" : {id: 1}, "6" : {id: 6}}, document.body);
});

beforeEach(async () => {
  ThreeD.setVideoList([]);
  ThreeD.setVideoListLength(0);

  ThreeD.moveForward = false;
  ThreeD.moveBackward = false;
  ThreeD.moveRight = false;
  ThreeD.moveLeft = false;

  await ThreeD.newUserJoined(5, "test", 0);
  let text5 = new THREE.Mesh();
  text5.name = "text";
  ThreeD.userMap[5].avatar.model.add(text5);

  await ThreeD.newUserJoined(1, "test1", 1);
  let text1 = new THREE.Mesh();
  text1.name = "text";
  ThreeD.userMap[1].avatar.model.add(text1);

  await ThreeD.newUserJoined(6, "test6", 2);
  let text6 = new THREE.Mesh();
  text6.name = "text";
  ThreeD.userMap[6].avatar.model.add(text6);
});

afterEach(() => {
  if (ThreeD.userMap[5])
    ThreeD.userLeft(5);
  if (ThreeD.userMap[1])
    ThreeD.userLeft(1);
  if (ThreeD.userMap[6])
    ThreeD.userLeft(6);
});

afterAll(() => {
  ThreeD.leave();
});

// --------------------------- TESTS ---------------------------

// ---changeUserPosition---
test('changeUserPosition - small value - all axis', () => {
  ThreeD.changeUserPosition(5, 1, 1, 1);

  expect(ThreeD.userMap[5].avatar.model.position.x).toBe(1);
  expect(ThreeD.userMap[5].avatar.model.position.y).toBe(1);
  expect(ThreeD.userMap[5].avatar.model.position.z).toBe(1);
});

test('changeUserPosition - large value - all axis', () => {
  ThreeD.changeUserPosition(5, 10000001, -999999, 70000001);

  expect(ThreeD.userMap[5].avatar.model.position.x).toBe(10000001);
  expect(ThreeD.userMap[5].avatar.model.position.y).toBe(-999999);
  expect(ThreeD.userMap[5].avatar.model.position.z).toBe(70000001);
});

// ---getDistance---
test('getDistance - small x movement', () => {
  ThreeD.changeUserPosition(5, 5, 0, 0);
  expect(ThreeD.getDistance(5)).toBe(25);
});

test('getDistance - small negative x movement', () => {
  ThreeD.changeUserPosition(5, -5, 0, 0);
  expect(ThreeD.getDistance(5)).toBe(25);
});

test('getDistance - small x, z movements', () => {
  ThreeD.changeUserPosition(5, 5, 0, 6);
  expect(ThreeD.getDistance(5)).toBe(25 + 36);
});

test('getDistance - small negative x, z movements', () => {
  ThreeD.changeUserPosition(5, -5, 0, -6);
  expect(ThreeD.getDistance(5)).toBe(25 + 36);
});

test('getDistance - small y movement', () => {
  ThreeD.changeUserPosition(5, 0, 5, 0);
  expect(ThreeD.getDistance(5)).toBe(0);
});

test('getDistance - same positions', () => {
  ThreeD.changeUserPosition(5, 0, 0, 0);
  expect(ThreeD.getDistance(5)).toBe(0);
});

// ---set name---
test('set name normal', async () => {
  ThreeD.userLeft(5);
  await ThreeD.newUserJoined(5, "myName", 4);
  expect(ThreeD.userMap[5].name).toBe("myName");
});

test('set name empty', async () => {
  ThreeD.userLeft(5);
  expect(await ThreeD.newUserJoined(5, '', 5)).toEqual(false);
});

test('set name null', async () => {
  ThreeD.userLeft(5);
  expect(await ThreeD.newUserJoined(5, null, 6)).toEqual(false);
});

test('set name number', async () => {
  ThreeD.userLeft(5);
  expect(await ThreeD.newUserJoined(5, 2, 7)).toEqual(false);
});

// ---getVideoRatio---
test('getVideoRatio - no adjustment', () => {
  expect(ThreeD.getVideoRatio(50, 50)).toEqual({ height: 50, width: 50 });
});

test('getVideoRatio - vertical adjustment', () => {
  expect(ThreeD.getVideoRatio(50, 50)).toEqual({ height: 50, width: 50 });
});

test('getVideoRatio - horizontal adjustment', () => {
  expect(ThreeD.getVideoRatio(50, 50)).toEqual({ height: 50, width: 50 });
});

// ---setUserRotation---
test('setUserRotation - small value', () => {
  ThreeD.setUserRotation(5, 1);
  expect(ThreeD.userMap[5].avatar.model.rotation.y).toBe(1);
});

test('setUserRotation - several values', () => {
  ThreeD.setUserRotation(5, 1);
  expect(ThreeD.userMap[5].avatar.model.rotation.y).toBe(1);
  ThreeD.setUserRotation(5, 7);
  expect(ThreeD.userMap[5].avatar.model.rotation.y).toBe(7);
  ThreeD.setUserRotation(5, -100);
  expect(ThreeD.userMap[5].avatar.model.rotation.y).toBe(-100);
});

// ---onDocumentKeyDown---
test('onDocumentKeyDown - user moved forwards', () => {
  ThreeD.onDocumentKeyDown({ keyCode: 87 });
  expect(ThreeD.moveForward && !ThreeD.moveBackward && !ThreeD.moveRight && !ThreeD.moveLeft).toBe(true);
});

test('onDocumentKeyDown - user moved left', () => {
  ThreeD.onDocumentKeyDown({ keyCode: 65 });
  expect(!ThreeD.moveForward && !ThreeD.moveBackward && !ThreeD.moveRight && ThreeD.moveLeft).toBe(true);
});

test('onDocumentKeyDown - user moved backwards', () => {
  ThreeD.onDocumentKeyDown({ keyCode: 83 });
  expect(!ThreeD.moveForward && ThreeD.moveBackward && !ThreeD.moveRight && !ThreeD.moveLeft).toBe(true);
});

test('onDocumentKeyDown - user moved right', () => {
  ThreeD.onDocumentKeyDown({ keyCode: 68 });
  expect(!ThreeD.moveForward && !ThreeD.moveBackward && ThreeD.moveRight && !ThreeD.moveLeft).toBe(true);
});

// ---onDocumentKeyUp---
test('onDocumentKeyUp - user stopped moving forwards', () => {
  ThreeD.moveForward = true;
  ThreeD.moveBackward = true;
  ThreeD.moveRight = true;
  ThreeD.moveLeft = true;
  ThreeD.onDocumentKeyUp({ keyCode: 87 });
  expect(!ThreeD.moveForward && ThreeD.moveBackward && ThreeD.moveRight && ThreeD.moveLeft).toBe(true);
});

test('onDocumentKeyUp - user stopped moving left', () => {
  ThreeD.moveForward = true;
  ThreeD.moveBackward = true;
  ThreeD.moveRight = true;
  ThreeD.moveLeft = true;
  ThreeD.onDocumentKeyUp({ keyCode: 65 });
  expect(ThreeD.moveForward && ThreeD.moveBackward && ThreeD.moveRight && !ThreeD.moveLeft).toBe(true);
});

test('onDocumentKeyUp - user stopped moving backwards', () => {
  ThreeD.moveForward = true;
  ThreeD.moveBackward = true;
  ThreeD.moveRight = true;
  ThreeD.moveLeft = true;
  ThreeD.onDocumentKeyUp({ keyCode: 83 });
  expect(ThreeD.moveForward && !ThreeD.moveBackward && ThreeD.moveRight && ThreeD.moveLeft).toBe(true);
});

test('onDocumentKeyUp - user stopped moving right', () => {
  ThreeD.moveForward = true;
  ThreeD.moveBackward = true;
  ThreeD.moveRight = true;
  ThreeD.moveLeft = true;
  ThreeD.onDocumentKeyUp({ keyCode: 68 });
  expect(ThreeD.moveForward && ThreeD.moveBackward && !ThreeD.moveRight && ThreeD.moveLeft).toBe(true);
});

// ---userLeft3D---
test('userLeft3D - user removed correctly', () => {
  ThreeD.userLeft(5);
  expect(ThreeD.userMap[5]).toBeUndefined();
});

// ---shiftVideoList---
test('shiftVideoList - empty list, none pushed out', () => {
  ThreeD.setVideoList([]);
  ThreeD.setVideoListLength(0);
  let shifted = ThreeD.shiftVideoList(5);
  expect(ThreeD.videoList).toEqual([]);
  expect(shifted).toBe(0);
});

test('shiftVideoList - one entry, one pushed out', () => {
  ThreeD.setVideoList([1]);
  ThreeD.setVideoListLength(1);

  ThreeD.changeUserPosition(1, 10, 10, 10);
  ThreeD.changeUserPosition(5, 5, 5, 5);
  let shifted = ThreeD.shiftVideoList(5);
  expect(ThreeD.videoList).toEqual([5]);
  expect(shifted).toBe(1);
});

test('shiftVideoList - one entry, none pushed out', () => {
  ThreeD.setVideoList([1]);
  ThreeD.setVideoListLength(1);

  ThreeD.changeUserPosition(1, 5, 5, 5);
  ThreeD.changeUserPosition(5, 10, 10, 10);
  let shifted = ThreeD.shiftVideoList(5);
  expect(ThreeD.videoList).toEqual([1]);
  expect(shifted).toBe(0);
});

test('shiftVideoList - two entries, one pushed out, new inserted last', () => {
  ThreeD.setVideoList([1, 6]);
  ThreeD.setVideoListLength(2);

  ThreeD.changeUserPosition(1, 5, 5, 5);
  ThreeD.changeUserPosition(5, 10, 10, 10);
  ThreeD.changeUserPosition(6, 15, 15, 15);
  let shifted = ThreeD.shiftVideoList(5);
  expect(ThreeD.videoList).toEqual([1, 5]);
  expect(shifted).toBe(6);
});

test('shiftVideoList - two entries, one pushed out, new inserted first', () => {
  ThreeD.setVideoList([1, 6]);
  ThreeD.setVideoListLength(2);

  ThreeD.changeUserPosition(1, 10, 10, 10);
  ThreeD.changeUserPosition(5, 5, 5, 5);
  ThreeD.changeUserPosition(6, 15, 15, 15);
  let shifted = ThreeD.shiftVideoList(5);
  expect(ThreeD.videoList).toEqual([5, 1]);
  expect(shifted).toBe(6);
});
