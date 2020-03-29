import fs from 'fs';
import express from 'express';
import http from 'http';
import SocketIO from 'socket.io';
import DOM from 'gen-impulse/DOM';
import FRP from 'gen-impulse/FRP';
import { App } from 'UI/App';
import _ from 'Util/Mori';
import * as API from 'API';
import * as Liverpool from 'Liverpool';

const html = fs.readFileSync('./dist/index.html').toString('utf8');
const nodeapp = express();
const server = http.Server(nodeapp);
const io = SocketIO(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}!`));

nodeapp.get('/', function(req, res) {
	DOM.toMarkup({ e_response: FRP.never }, App).then(({ markup }) => {
		res.send(html.replace('__SSR_CONTENT__', markup));
	});
});

nodeapp.use(express.static('public'));
nodeapp.use(express.static('dist'));

const games = {};

const makeRoomId = () => {
	var text = "";
	var possible = "abcdefghijklmnopqrstuvwxyz0123456789";

	for (var i = 0; i < 6; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}

	return text;
};

const getRoomId = () => {
	const roomId = makeRoomId();
	return games[roomId] ? getRoomId() : roomId;
};

const broadcastGameState = (roomId) => {
	const game = games[roomId];
	if (!game) {
		return;
	}
	const { players, state } = game;
	Object.entries(players).forEach(([player, socket]) => {
		const fixHand = (hands, name, hand) => (
			_.assoc(hands, name, _.pipeline(
				hand,
				_.curry(_.assoc, 'heldCount', _.count(_.get(hand, 'held'))),
				name === player ? _.identity : _.curry(_.dissoc, 'held')
			))
		);
		const discard = _.get(state, 'discard');
		const topDiscard = _.count(discard) ? _.nth(discard, 0) : -1;
		const filteredState = _.pipeline(
			_.update(state, 'hands', _.partial(_.reduceKV, fixHand, _.hashMap())),
			_.curry(_.assoc, 'deckCount', _.count(_.get(state, 'deck'))),
			_.curry(_.assoc, 'discard', topDiscard),
			_.curry(_.dissoc, 'deck'),
			_.curry(_.assoc, 'player', player)
		);
		const response = API.GameState(roomId, filteredState);
		socket.emit('API', _.encode(response));
	});
};

io.on('connection', (socket) => {
	const G = {};
	socket.on('API', (data) => {
		const request = _.decode(data);
		console.log(request);
		_.match({
			[API.Request.CreateRoom]: ({ name }) => {
				G.playerName = name;
				const roomId = getRoomId();
				games[roomId] = {
					players: {
						[name]: socket,
					},
					state: Liverpool.initGame(roomId, name),
				};
				broadcastGameState(roomId);
			},
			[API.Request.JoinRoom]: ({ roomId, name }) => {
				G.playerName = name;
				games[roomId].players[name] = socket;
				games[roomId].state = Liverpool.joinGame(
					games[roomId].state, name
				);
				broadcastGameState(roomId);
			},
			[API.Request.ConfigureRoom]: ({ roomId, numDecks }) => {
				games[roomId].state = Liverpool.setNumDecks(
					games[roomId].state, numDecks
				);
				broadcastGameState(roomId);
			},
			[API.Request.StartGame]: ({ roomId }) => {
				games[roomId].state = Liverpool.startGame(games[roomId].state);
				broadcastGameState(roomId);
			},
			[API.Request.MayI]: ({ roomId }) => {
				games[roomId].state = Liverpool.mayI(
					games[roomId].state, G.playerName
				);
				broadcastGameState(roomId);
			},
			[API.Request.TakeDiscard]: ({ roomId }) => {
				games[roomId].state = Liverpool.takeDiscard(
					games[roomId].state, G.playerName
				);
				broadcastGameState(roomId);
			},
			[API.Request.DrawDeck]: ({ roomId }) => {
				games[roomId].state = Liverpool.drawDeck(
					games[roomId].state, G.playerName
				);
				broadcastGameState(roomId);
			},
			[API.Request.Play]: ({ roomId, plays }) => {
				games[roomId].state = Liverpool.play(
					games[roomId].state, G.playerName, plays
				);
				broadcastGameState(roomId);
			},
		})(request);
	});
});
