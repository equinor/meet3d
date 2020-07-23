import * as Client from '../../public/modules/client.js';

test('dataChannelReceive - Prepare to receive screen sharing', () => {
  Client.dataChannelReceive(5, '{"type": "share", "sharing": true, "height": 100,"width": 200}');
  expect(Client.sharing).toStrictEqual({ id: 5, height: 100, width: 200 });
});
