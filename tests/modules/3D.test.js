import * as threeD from '../../public/modules/3D.js'

threeD.init3D(3, {"5" : {id: 5}}, document.body);

test('ourID defined after init3D is called', () => {
  expect(threeD.ourID).toBe(3);
})

threeD.newUserJoined3D(5, "myName");

test('Name defined after newUserJoined3D', () => {
  expect(threeD.UserMap[5].name).toBe("myName");
})

test('changeUserPosition - small value - all axis', () => {
  threeD.changeUserPosition(5, 1, 2, 3);
  expect(threeD.UserMap[5].avatar.model.position.x).toBe(1);
  expect(threeD.UserMap[5].avatar.model.position.y).toBe(2);
  expect(threeD.UserMap[5].avatar.model.position.z).toBe(3);
});

test('changeUserPosition - big values - all axis', () => {
  threeD.changeUserPosition(5, 777777, 123456789, 1000000000);
  expect(threeD.UserMap[5].avatar.model.position.x).toBe(777777);
  expect(threeD.UserMap[5].avatar.model.position.y).toBe(123456789);
  expect(threeD.UserMap[5].avatar.model.position.z).toBe(1000000000);
});

test('changeUserPosition - negative value - all axis', () => {
  threeD.changeUserPosition(5, -77, -44444400, -1);
  expect(threeD.UserMap[5].avatar.model.position.x).toBe(-77);
  expect(threeD.UserMap[5].avatar.model.position.y).toBe(-44444400);
  expect(threeD.UserMap[5].avatar.model.position.z).toBe(-1);
});

test('checking for unexisting user', () => {
  let i = 0;
  while(threeD.UserMap[i] != undefined) {
    i++;
  }
  expect(threeD.UserMap[i]).toBe(undefined);
})