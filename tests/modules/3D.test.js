import * as threeD from '../../public/modules/3D.js'
import * as THREE from '../../public/modules/three.module.js'

beforeAll(() => {
  threeD.init3D(3, {"5" : {id: 5}}, document.body);
});

beforeEach(() => {
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
