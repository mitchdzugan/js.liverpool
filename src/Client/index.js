import DOM from 'gen-impulse/DOM';
import FRP from 'gen-impulse/FRP';
import { App } from 'UI/App';
import SocketIO from 'socket.io-client';
import _ from 'Util/Mori';

const socket = SocketIO("");

const postRequest = (request) => (
	socket.emit('API', _.encode(request))
);
const e_response = FRP.mkEvent((pushSelf) => {
	socket.on('API', (data) => {
		const response = _.decode(data);
		pushSelf(response);
	});
	return () => socket.off('API');
});

DOM.attach('app', { postRequest, e_response }, App);
