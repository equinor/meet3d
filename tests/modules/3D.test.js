import * as threeD from '../../public/modules/3D.js'

test('squared distance between (0, 0) and (3, 4) is 25', () => {

  threeD.init3D(3, {"5" : {id: 5}}, document.body);

  threeD.newUserJoined3D(5, "test");

  threeD.changeUserPosition(5, 10, 10, 10);

  expect(threeD.UserMap[5].avatar.model.position.x).toBe(10);
});
