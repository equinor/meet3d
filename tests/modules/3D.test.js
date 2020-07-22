import * as threeD from '../../public/modules/3D.js'

test('changeUserPosition - small value - all axis', () => {

  threeD.init3D(3, {"5" : {id: 5}}, document.body);

  threeD.newUserJoined3D(5, "test");

  threeD.changeUserPosition(5, 1, 1, 1);

  expect(threeD.UserMap[5].avatar.model.position.x).toBe(1);
});
