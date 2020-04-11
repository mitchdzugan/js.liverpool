import React from 'react';
import { renderToString } from 'react-dom/server';
import fs from 'fs';
import express from 'express';
import http from 'http';
import SocketIO from 'socket.io';
import DOM from 'gen-impulse/DOM';
import FRP from 'gen-impulse/FRP';
import { babelFix } from 'UI/BabelFix';
import _ from 'Util/Mori';
import { App } from 'UI/App.jsx';
import * as API from 'API';
import * as Liverpool from 'Liverpool';

const html = fs.readFileSync('./dist/index.html').toString('utf8');
const nodeapp = express();
const server = http.Server(nodeapp);
const io = SocketIO(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}!`));

nodeapp.get('/', function(req, res) {
	const markup = renderToString(
		React.createElement(App, { e_response: FRP.never })
	);
	// DOM.toMarkup({ e_response: FRP.never }, App).then(({ markup }) => {
	res.send(html.replace('__SSR_CONTENT__', markup));
	// });
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

const broadcastGameState = (roomId, only = null) => {
	const game = games[roomId];
	if (!game) {
		return;
	}
	const { players, state } = game;
	Object.entries(players).forEach(([player, socket]) => {
		if (!!only && only !== player) {
			return;
		}
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
		try {
			const request = _.decode(data);
			const roomId = _.get(request, 'roomId');
			if (roomId && !games[roomId]) {
				throw(`Invalid Room: ${roomId}`);
			}

			console.log(request);

			_.match({
				[API.Request.CreateRoom]: ({ name }) => {
					G.playerName = name;
					const roomId = getRoomId();
					games[roomId] = {
						players: {
							[name]: socket,
						},
						state: _.pipeline(
							Liverpool.initGame(roomId, name),
							// _.curry(Liverpool.joinGame, 'Test Account'),
							_.identity,
						)
					};
					broadcastGameState(roomId);
				},
				[API.Request.JoinRoom]: ({ roomId, name }) => {
					G.playerName = name;
					if (games[roomId].players[name]) {
						games[roomId].players[name] = socket;
						broadcastGameState(roomId);
						return;
					}
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
				[API.Request.Pass]: ({ roomId }) => {
					games[roomId].state = Liverpool.pass(
						games[roomId].state, G.playerName
					);
					broadcastGameState(roomId);
				},
				[API.Request.MayI]: ({ roomId }) => {
					games[roomId].state = Liverpool.mayI(
						games[roomId].state, G.playerName
					);
					broadcastGameState(roomId);
				},
				[API.Request.UnMayI]: ({ roomId }) => {
					games[roomId].state = Liverpool.unMayI(
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
				[API.Request.Unintend]: ({ roomId }) => {
					games[roomId].state = Liverpool.unintend(
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
				[API.Request.Deal]: ({ roomId }) => {
					games[roomId].state = Liverpool.deal(
						games[roomId].state, G.playerName
					);
					broadcastGameState(roomId);
				},
				[API.Request.Ping]: ({ roomId }) => {
					broadcastGameState(roomId, G.playerName);
				},
			})(request);
		}
		catch(err) {
			console.log(err);
			const response = API.Error(err);
			socket.emit('API', _.encode(response));
		}
	});
});
