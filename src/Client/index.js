import DOM from 'gen-impulse/DOM';
import FRP from 'gen-impulse/FRP';
import { App } from 'UI/App';
import SocketIO from 'socket.io-client';
import dragula from 'dragula';
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

DOM.attach('app', { postRequest, e_response }, App, () => {
	const containers = Array.from(
		document.getElementsByClassName('dragula')
	);
	dragula(containers, {
		revertOnSpill: true
	});
});
