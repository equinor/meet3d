import * as threeD from '../../public/modules/3D.js'

// This can possible be changed, so it is made to fail.
test('ourId uninitialised before init3D is called', () => {
expect(threeD.ourID).toBe(undefined);
})

test('changeUserPosition - small value - all axis', () => {
  let id = 3;
  
  threeD.init3D(id, {"5" : {id: 5}}, document.body);
  expect(threeD.ourID).toBe(id);

  threeD.newUserJoined3D(5, "myName");
  expect(threeD.UserMap[5].name).toBe("myName");
  expect(threeD.UserMap[5].avatar.model.scale.x).toBe(threeD.objectScale);
  
  threeD.changeUserPosition(5, 1, 2, 3);
  expect(threeD.UserMap[5].avatar.model.position.x).toBe(1);
  expect(threeD.UserMap[5].avatar.model.position.y).toBe(2);
});