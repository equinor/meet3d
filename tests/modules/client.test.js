import * as Client from '../../public/modules/client.js';
import * as THREE from '../../public/modules/three.module.js';

test('dataChannelReceive - Prepare to receive screen sharing', () => {
  Client.dataChannelReceive(5, '{"type": "share", "sharing": true, "height": 100,"width": 200}');
  expect(Client.sharing).toStrictEqual({ id: 5, height: 100, width: 200 });
});
