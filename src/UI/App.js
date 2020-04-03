import DOM from 'gen-impulse/DOM';
import FRP from 'gen-impulse/FRP';
import * as API from 'API';
import { toString, toSrc, fromInt } from 'Card';
import _ from 'Util/Mori';
import CardSVGs from '@younestouati/playing-cards-standard-deck';

class Screen extends _.Enum {
	static NoRoom = new Screen();
	static WaitingStart = new Screen();
	static InGame = new Screen();
	static _ = Screen.closeEnum();
}

class AdjustHeld extends _.Enum {
	static UpdateGameState = new AdjustHeld();
	static ManualChange = new AdjustHeld();
	static _ = AdjustHeld.closeEnum();
}
const UpdateGameState = (state) => (
	_.mk(AdjustHeld.UpdateGameState, { state })
);
const ManualChange = (updated) => (
	_.mk(AdjustHeld.ManualChange, { updated })
);
const reduceHeld = (curr, action) => _.match({
	[AdjustHeld.UpdateGameState]: ({ state }) => {
		const player = _.get(state, 'player');
		const hands = _.get(state, 'hands');
		const held = _.getIn(hands, [player, 'held']) || _.vector();
		_.log({ held, curr });
		const held_set = new Set(_.intoArray(held));
		const curr_set = new Set(_.intoArray(curr));
		const news = _.vector(
			...([...held_set].filter(card => !curr_set.has(card)))
		);
		return _.pipeline(
			_.concat(news, curr),
			_.partial(_.filter, (card) => held_set.has(card))
		);
	},
	[AdjustHeld.ManualChange]: ({ updated }) => updated,
})(action);

const s_reduce = (f_, s) => (function*() {
	const f = (prev, curr) => {
		return f_(prev, curr);
	};
	const init = FRP.s_inst(s);
	const changed = FRP.s_changed(s);
	return yield* FRP.s_from(FRP.reduce(f, init, changed), init);
})();

const getCurrScreen = (state) => {
	if (!state) {
		return Screen.NoRoom;
	}

	return _.get(state, 'started') ? Screen.InGame : Screen.WaitingStart;
};


const e_delay = (ms, e) => FRP.mkEvent(
	pushSelf => FRP.consume(v => setTimeout(() => pushSelf(v), ms), e)
);
const s_bindKeyedDOM = (s, toKey, render) => (
	DOM.s_bindDOM(s, v => DOM.keyed(toKey(v), render(v)))
);
const fadeInOut = (s, toKey, render) => (function*() {
	const s_stash = yield* DOM.s_bindDOM(
		s, v => DOM.d_stash(DOM.keyed(toKey(v), render(v)))
	);
	const s_faded = yield* DOM.s_use((function*() {
		const s_key = yield* FRP.s_fmap(toKey, s);
		const s_delay = (ms, s) => (function*() {
			const e = FRP.s_changed(s);
			const i = FRP.s_inst(s);
			return yield* FRP.s_from(e_delay(ms, e), i);
		})();
		const e_key = FRP.s_changed(s_key);
		const e_key_delayed = e_delay(1000, e_key);
		const s_key_ = yield* FRP.s_from(e_key, null);
		const s_key_delayed = yield* FRP.s_from(e_key_delayed, null);
		const s_className = yield* FRP.s_zipWith(
			(key1, key2) => key1 === key2 ? 'fade-in' : 'fade-out',
			s_key_,
			s_key_delayed
		);
		const s_stash_ = yield* s_delay(20, s_stash);
		const s_stash_class = yield* FRP.s_zipWith(
			(stash, className) => ({ stash, className }),
			s_stash_,
			s_className
		);
		return yield* s_reduce(
			(prev, curr) => ({
				className: curr.className,
				stash: _.match({
					['fade-out']: () => prev.stash,
					['fade-in']: () => curr.stash,
				})(curr.className)
			}),
			s_stash_class
		);
	})());
	return yield* DOM.s_bindDOM(s_faded, ({ stash, className }) => {
		console.log({ stash });
		return DOM.keyed('fader', DOM.div({ key: 'fader', id: 'fader', className }, DOM.d_apply(stash)));
	});
})();

const requestOn = (e, req, getArgs = (_, id) => [id]) => (function*() {
	const postRequest = yield* DOM.getEnv('postRequest');
	const state = yield* DOM.getEnv('gameState');
	const roomId = _.get(state, 'roomId');
	yield* DOM.e_consume(
		(e) => postRequest(req(...getArgs(e, roomId))), e
	);
})();

const CardLoop = (i) => (function*() {
	if (!i) {
		return;
	}
	yield* DOM.div({ className: 'card-loop' }, (function*() {
		yield* DOM.img({ src: '/cards/15.0.png' });
		yield* CardLoop(i - 1);
	})());
})();

const NoRoom = () => (function*() {
	yield* DOM.e_collectAndReduce('name', (_, name) => name, "", (function*() {
		yield* DOM.e_collectAndReduce('roomId', (_, roomId) => roomId, "", (function*() {
			const s_name = yield* DOM.getEnv('name');
			yield* DOM.s_bindDOM(s_name, (name) => (function*() {
				const s_roomId = yield* DOM.getEnv('roomId');
				yield* DOM.s_bindDOM(s_roomId, (roomId) => (function*() {
					yield* DOM.div({ className: 'splash' }, (function*() {
						yield* DOM.div({ className: 'header' }, (function*() {
							yield* DOM.div({ className: 'quarantine' }, DOM.text("QUARANTINE"));
							yield* DOM.div({ className: 'liverpool' }, DOM.text("Liverpool"));
						})());
						yield* DOM.div({ className: 'card-loop-top' }, CardLoop(16));
						yield* DOM.div({ className: 'actions' }, (function*() {
							yield* DOM.div({ className: 'field has-addons' }, (function*() {
								yield* DOM.p({ className: 'control' }, (function*() {
									const d_name = yield* DOM.input({
										className: 'input',
										type: 'text',
										placeholder: 'Your Name'
									});
									yield* DOM.e_emit(
										'name', FRP.fmap(e => e.target.value, d_name.onKeyup)
									);
								})());
								const d_create = yield* DOM.p({ className: 'control' },
									DOM.button({ className: 'button is-danger', disabled: name === '' },
										DOM.text("Create Room")
									)
								);
								yield* requestOn(
									d_create.onClick, API.CreateRoom, () => [name]
								);
							})());
							yield* DOM.div({ className: 'field has-addons' }, (function*() {
								yield* DOM.p({ className: 'control' }, (function*() {
									const d_roomId = yield* DOM.input({
										className: 'input',
										type: 'text',
										placeholder: 'Room ID'
									});
									yield* DOM.e_emit(
										'roomId', FRP.fmap(e => e.target.value, d_roomId.onKeyup)
									);
								})());
								const d_join = yield* DOM.p({ className: 'control' },
									DOM.button({ className: 'button is-danger', disabled: roomId.length !== 6 },
										DOM.text("Join Room")
									)
								);
								yield* requestOn(
									d_join.onClick, API.JoinRoom, () => [roomId, name]
								);
							})());
						})());
					})());
				})());
			})());
		})());
	})());
})();

const RenderCard = (card, inner = f => f({})) => (
	DOM.div({ className: 'pcard', ['data-card-val']: card },
		inner(attrs => (
			DOM.img({ ...attrs, src: toSrc(fromInt(card)) })
		))
	)
);

const WaitingStart = () => (function*() {
	const state = yield* DOM.getEnv('gameState');
	const roomId = _.get(state, 'roomId');
	yield* DOM.div({}, DOM.text(`Room ID: ${roomId}`));



	yield* DOM.div({ className: 'field has-addons' }, (function*() {
		yield* DOM.p({ className: 'control' },
			DOM.button({ className: 'button is-static' }, DOM.text("Room ID"))
		);
		yield* DOM.p({ className: 'control' }, (function*() {
			yield* DOM.input({
				className: 'input',
				type: 'text',
				value: roomId,
				readonly: true,
			});
		})());
	})());


	const players = _.get(state, 'players');
	yield* DOM.div({}, DOM.text('Players'));
	yield* DOM.ul({}, (function*() {
		for (const player of _.intoArray(players)) {
			yield* DOM.li({}, DOM.text(player));
		}
	})());
	const numDecks = _.get(state, 'numDecks');
	yield* DOM.div({}, (function*() {
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
})();

const InGame = () => (function*() {
	const state = yield* DOM.getEnv('gameState');
	yield* DOM.e_collectAndReduce('selectedCard', (_, card) => card, null, DOM.keyed('started', (function*() {
		const s_selectedCard = yield* DOM.getEnv('selectedCard');
		const e_pageClick = FRP.mkEvent(
			(pushSelf) => {
				const f = () => {
					const selectedCard = FRP.s_inst(s_selectedCard);
					console.log({ selectedCard }, 'pageClick');
					setTimeout(() => selectedCard && pushSelf(null), 100);
				};
				document.body.addEventListener('click', f);
				return () => document.body.removeEventListener('click', f);
			}
		);
		yield* DOM.e_consume((sel) => {
			FRP.push(sel, FRP.s_changed(s_selectedCard));
		}, e_pageClick);
		// yield* DOM.e_emit('selectedCard', e_pageClick);
		// yield* DOM.s_bindDOM(s_selectedCard, (selectedCard) => (function*() {
		const s_myHeld = yield* DOM.getEnv('myHeld');
		yield* DOM.s_bindDOM(s_myHeld, (held) => (function*() {
			const players = _.get(state, 'players');
			const idLookup = _.get(state, 'idLookup');
			const hands = _.get(state, 'hands');
			const dealerId = _.get(state, 'dealerId');
			const turnId = _.get(state, 'turnId');
			yield* DOM.div({}, DOM.text('Players'));
			yield* DOM.ul({}, (function*() {
				for (const player of _.intoArray(players)) {
					const id = _.get(idLookup, player);
					const isTurn = turnId === id;
					const isDealer = dealerId === id;
					const heldCount = _.getIn(hands, [player, 'heldCount']);
					const mayIs = _.getIn(hands, [player, 'mayIs']);
					yield* DOM.li({}, DOM.div({}, (function*() {
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
			yield* DOM.div({}, DOM.text('Discard:'));
			yield* RenderCard(discard);
			const player = _.get(state, 'player');
			const hasDrawn = _.get(state, 'hasDrawn');
			const id = _.get(idLookup, player);
			const isTurn = turnId === id;
			const isDealer = dealerId === id;
			const mayIs = _.getIn(hands, [player, 'mayIs']);
			yield* DOM.div({ className: 'my-hand' }, (function*() {
				yield* DOM.createElement('h3', {}, DOM.text("Hand"));
				const d_parent = yield* DOM.div({ id: 'card-parent' }, (function*() {
					let i = 0;
					for (const card of _.intoArray(held)) {
						i++;
						yield* DOM.keyed(`${card}.${i}`, (function*() {
							const d_card = yield* RenderCard(card, (inner) => (
								DOM.s_bindDOM(s_selectedCard, (selectedCard) => {
									const isSelected = selectedCard === card;
									const className = isSelected ? 'selected clickable' : 'clickable';
									return inner({ className });
								})
							));
							// if (!selectedCard) {

							const e_setSelected = FRP.fmap(
								(e) => {
									console.log('is this doing anything...');
									e.stopPropagation();
									return card;
								},
								FRP.filter(() => !FRP.s_inst(s_selectedCard), d_card.onClick)
							);
							// yield* DOM.e_emit('selectedCard',);
							yield* DOM.e_consume(sel => {
								FRP.push(sel, FRP.s_changed(s_selectedCard));
							}, e_setSelected);
							// }
							if (hasDrawn) {
								yield* requestOn(
									d_card.onClick, API.Play, (e, roomId) => [roomId, _.m({ discard: card })]
								);
							}
						})());
					}
				})());
				const closestCards = _.pipeline(
					d_parent.onClick,
					_.partial(FRP.fmap, (e) => {
						// e.stopPropagation();
						const { clientX, clientY, target } = e;
						const cardWidth = 46;
						const cardHeight = 35;
						const closest = _.pipeline(
							document.getElementById('card-parent').children,
							Array.from,
							(children) => _.vector(...children),
							_.partial(_.map, (el) => ({ el, rect: el.getBoundingClientRect() })),
							_.partial(_.map, ({ el, rect: { x, y, width, height } }) => {
								const distX = (width / 2) + x - clientX;
								const cardVal = parseInt(el.dataset.cardVal, 10);
								return {
									distX: Math.abs(distX),
									distY: Math.abs((height / 2) + y - clientY),
									orientation: distX < 0 ? 'RIGHT' : 'LEFT',
									card: toString(fromInt(cardVal)),
									cardVal,
								};
							}),
							_.partial(_.minBy, ({ distY, distX }) => Math.sqrt(distY * distY + distX * distX)),
						);

						if (closest.distX > cardWidth || closest.distY > cardHeight) {
							return null;
						}

						return closest;
					}),
				);

				yield* DOM.s_bindDOM(s_selectedCard, (selectedCard) => (function*() {
					const e_updatedHeld = _.pipeline(
						closestCards,
						_.partial(FRP.filter, (closest) => !!closest),
						_.partial(FRP.fmap, (closest) => {
							let past = false;
							let first = true;
							let wasFirst = false;
							return _.pipeline(
								held,
								_.partial(_.partitionBy, (card) => {
									if (past) {
										return true;
									}
									if (card === closest.cardVal) {
										past = true;
										wasFirst = first;
										return closest.orientation === 'LEFT';
									}
									first = false;
									return false;
								}),
								(partitioned) => (
									_.count(partitioned) > 1 ? partitioned : (
										wasFirst ?
										_.concat(_.vector(_.vector()), partitioned) :
										_.concat(partitioned, _.vector(_.vector()))
									)
								),
								(partitioned) => _.concat(
									_.filter(card => card !== selectedCard, _.nth(partitioned, 0)),
									_.vector(selectedCard),
									_.filter(card => card !== selectedCard, _.nth(partitioned, 1)),
								)
							);
						})
					);
					if (selectedCard) {
						yield* DOM.e_emit('myHeld', FRP.fmap(updated => ManualChange(updated), e_updatedHeld));
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
		// })());
	})()));
})();

const bodyAttrs = { className: 'container content' };
const renderGameState = (state) => (
	DOM.upsertEnv('gameState', state, DOM.div(bodyAttrs, _.match({
		[Screen.NoRoom]: NoRoom,
		[Screen.WaitingStart]: WaitingStart,
		[Screen.InGame]: InGame,
	})(getCurrScreen(state))))
);

export const App = (function*() {
	const e_response = yield* DOM.getEnv('e_response');
	const e_gameState = _.pipeline(
		e_response,
		_.partial(FRP.filter, _.match({
			[API.Response.GameState]: () => true,
			[_.DEFAULT]: () => false
		})),
		_.partial(FRP.fmap, _.g('gameState'))
	);
	const s_gameState = yield* DOM.s_use(FRP.s_from(e_gameState, null));
	yield* DOM.e_collectAndReduce('myHeld', reduceHeld, _.vector(), (function*() {
		yield* DOM.e_emit('myHeld', FRP.fmap(state => UpdateGameState(state), e_gameState));
		yield* s_bindKeyedDOM(s_gameState, getCurrScreen, renderGameState);
	})());
})();
