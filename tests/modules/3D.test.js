import * as threeD from '../../public/modules/3D.js'

test('squared distance between (0, 0) and (3, 4) is 25', () => {
    expect(threeD.getDistanceBetween(0, 0, 3, 40)).toBe(25)
})
