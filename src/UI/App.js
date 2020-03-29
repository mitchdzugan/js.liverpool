import DOM from 'gen-impulse/DOM';
import FRP from 'gen-impulse/FRP';
import * as API from 'API';
import { toString, fromInt } from 'Card';
import _ from 'Util/Mori';

const requestOn = (e, req, getArgs = (_, id) => [id]) => (function* () {
	const postRequest = yield* DOM.getEnv('postRequest');
	const state = yield* DOM.getEnv('gameState');
	const roomId = _.get(state, 'roomId');
	yield* DOM.e_consume(
		(e) => postRequest(req(...getArgs(e, roomId))), e
	);
})();

const OutsideGame = () => (function* () {
	yield* DOM.label({}, DOM.text("Name: "));
	const d_name = yield* DOM.input({});
	yield* DOM.label({}, DOM.text("RoomId: "));
	const d_roomId = yield* DOM.input({});

	const mkSig = (d) => DOM.s_use(FRP.s_from(
		FRP.fmap(el => el.target.value, d.onKeyup), ""
	));
	const s_name = yield* mkSig(d_name);
	const s_roomId = yield* mkSig(d_roomId);
	yield* DOM.div({}, (function* () {
		yield* DOM.s_bindDOM(s_name, name => DOM.s_bindDOM(s_roomId, roomId => (function* () {
			const d_createRoom = yield* DOM.button({ disabled: name === "" }, DOM.text("Create Room"));
			const d_joinRoom = yield* DOM.button({ disabled: roomId.length < 6 }, DOM.text("Join Room"));
			yield* requestOn(
				d_createRoom.onClick, API.CreateRoom, () => [name]
			);
			yield* requestOn(
				d_joinRoom.onClick, API.JoinRoom, () => [roomId, name]
			);
		})()));
	})());
})();

const InsideGame = () => (function* () {
	const state = yield* DOM.getEnv('gameState');
	const started = _.get(state, 'started');
	if (started) {
		yield* DOM.keyed('started', (function* () {
			const players = _.get(state, 'players');
			const idLookup = _.get(state, 'idLookup');
			const hands = _.get(state, 'hands');
			const dealerId = _.get(state, 'dealerId');
			const turnId = _.get(state, 'turnId');
			yield* DOM.div({}, DOM.text('Players'));
			yield* DOM.ul({}, (function* () {
				for (const player of _.intoArray(players)) {
					const id = _.get(idLookup, player);
					const isTurn = turnId === id;
					const isDealer = dealerId === id;
					const heldCount = _.getIn(hands, [player, 'heldCount']);
					const mayIs = _.getIn(hands, [player, 'mayIs']);
					yield* DOM.li({}, DOM.div({}, (function* () {
						const italics = isDealer ? 'is-italic ' : '';
						const bold = isTurn ? 'has-text-weight-bold' : '';
						const className = `${italics}${bold}`;
						yield* DOM.div({ className }, DOM.text(player));
						yield* DOM.div({}, DOM.text(`Cards: ${heldCount}`));
						yield* DOM.div({}, DOM.text(`May Is: ${mayIs}`));
					})()));
				}
			})());
			const discard = _.get(state, 'discard');
			const s = i => toString(fromInt(i));
			yield* DOM.div({}, DOM.text(`Discard: ${s(discard)}`));
			const player = _.get(state, 'player');
			const hasDrawn = _.get(state, 'hasDrawn');
			const id = _.get(idLookup, player);
			const isTurn = turnId === id;
			const isDealer = dealerId === id;
			const held = _.getIn(hands, [player, 'held']);
			const mayIs = _.getIn(hands, [player, 'mayIs']);
			yield* DOM.div({ className: 'box' }, (function* () {
				yield* DOM.createElement('h3', {}, DOM.text("Hand"));
				yield* DOM.ul({}, (function* () {
					for (const card of _.intoArray(held)) {
						const d_card = yield* DOM.li({}, DOM.text(s(card)));
						if (hasDrawn) {
							yield* requestOn(
								d_card.onClick, API.Play, (e, roomId) => [roomId, _.m({ discard: card })]
							);
						}
					}
				})());
				if (isTurn && !hasDrawn) {
					const d_discard = yield* DOM.button({}, DOM.text('Take Discard'));
					const d_deck = yield* DOM.button({}, DOM.text('Draw Deck'));
					yield* requestOn(d_discard.onClick, API.TakeDiscard);
					yield* requestOn(d_deck.onClick, API.DrawDeck);
				} else if (!hasDrawn) {
					const d_mayI = yield* DOM.button({}, DOM.text('May I'));
					yield* requestOn(d_mayI.onClick, API.MayI);
				}
			})());
		})());
	} else {
		const roomId = _.get(state, 'roomId');
		yield* DOM.div({}, DOM.text(`Room ID: ${roomId}`));
		const players = _.get(state, 'players');
		yield* DOM.div({}, DOM.text('Players'));
		yield* DOM.ul({}, (function* () {
			for (const player of _.intoArray(players)) {
				yield* DOM.li({}, DOM.text(player));
			}
		})());
		const numDecks = _.get(state, 'numDecks');
		yield* DOM.div({}, (function* () {
			yield* DOM.text(`Number of decks: ${numDecks}`);
			const d_dec = yield* DOM.button({ disabled: numDecks === 1 }, DOM.text("↓"));
			const d_inc = yield* DOM.button({}, DOM.text("↑"));
			yield* requestOn(
				d_dec.onClick, API.ConfigureRoom, (_, roomId) => [roomId, numDecks - 1]
			);
			yield* requestOn(
				d_inc.onClick, API.ConfigureRoom, (_, roomId) => [roomId, numDecks + 1]
			);
		})());
		const numPlayers = _.count(_.get(state, 'players'));
		const d_start = yield* DOM.button({ disabled: numPlayers < 2 }, DOM.text("Start Game!"));
		yield* requestOn(d_start.onClick, API.StartGame);
	}
})();

export const App = (function* () {
	const e_response = yield* DOM.getEnv('e_response');
	const e_gameState = _.pipeline(
		e_response,
		_.partial(FRP.filter, _.match({
			[API.Response.GameState]: () => true,
			[_.DEFAULT]: () => false
		})),
		_.partial(FRP.fmap, _.g('gameState'))
	);
	yield* DOM.e_consume(_.log, e_gameState);
	const s_gameState = yield* DOM.s_use(FRP.s_from(e_gameState, null));
	yield* DOM.s_bindDOM(s_gameState, (gameState) => DOM.div({ className: 'container content' }, (
		!gameState ? OutsideGame() : (
			DOM.upsertEnv('gameState', gameState, InsideGame())
		)
	)));
})();
