import * as threeD from '../../static//modules/3D.js'

test('squared distance between (0, 0) and (3, 4) is 25', () => {
    expect(threeD.getDistanceBetween(0, 0, 3, 4)).toBe(25)
})