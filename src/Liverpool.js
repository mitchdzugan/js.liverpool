import _ from 'Util/Mori';
import mdo from './mdo.macro.js';

export class Goal extends _.Enum {
	static Set = new Goal();
	static Run = new Goal();
	static _ = this.closeEnum();
};

const hands = [
	{ [Goal.Set]: 2, [Goal.Run]: 0 },
	{ [Goal.Set]: 1, [Goal.Run]: 1 },
	{ [Goal.Set]: 0, [Goal.Run]: 2 },
	{ [Goal.Set]: 3, [Goal.Run]: 0 },
	{ [Goal.Set]: 2, [Goal.Run]: 1 },
	{ [Goal.Set]: 1, [Goal.Run]: 2 },
	{ [Goal.Set]: 0, [Goal.Run]: 3 },
];

export const initGame = (roomId, player) => _.m({
	roomId,
	numDecks: 2,
	started: false,
	players: _.vector(player),
	idLookup: _.hashMap(player, 0),
});

export const joinGame = (state, name) => _.pipeline(
	state,
	_.curry(_.update, 'players', _.curry(_.conj, name)),
	_.curry(_.update, 'idLookup', _.curry(_.assoc, name, 0))
);

export const setNumDecks = (state, numDecks) => (
	_.assoc(state, 'numDecks', numDecks)
);

const HAND_SIZE = 11;
export const startGame = (state) => {
	const players = _.shuffle(_.get(state, 'players'));
	const numDecks = _.get(state, 'numDecks');
	const fullDeck = _.shuffle(_.range(numDecks * 54));
	const idLookup = _.mkIdLookup(players);
	const scores = _.mapValues(() => 0, idLookup);
	const money = _.get(state, 'money', _.mapValues(() => -25, scores));
	const handId = 0;
	const dealerId = 0;
	const turnId = 1;
	const mayIs = _.vector();
	const playerCards = _.vec(_.partition(
		HAND_SIZE, _.take(HAND_SIZE * numDecks, fullDeck)
	));
	const hands = _.mapValues(
		(id, name) => _.m({
			mayIs: 3,
			held: _.nth(playerCards, id)
		}),
		idLookup
	);
	const discard = _.list(_.nth(fullDeck, HAND_SIZE * numDecks));
	const deck = _.drop(HAND_SIZE * numDecks + 1, fullDeck);
	return _.merge(state, _.m({
		started: true,
		hasDrawn: false,
		players,
		idLookup,
		scores,
		money,
		handId,
		dealerId,
		hands,
		turnId,
		mayIs,
		discard,
		deck,
	}));
};

export const mayI = (state, playerName) => {
	const idLookup = _.get(state, 'idLookup');
	const mayIs = _.get(state, 'mayIs');
	const id = _.get(idLookup, playerName);
	return _.merge(state, _.m({
		mayIs: _.conj(mayIs, id)
	}));
};

export const takeDiscard = (state, playerName) => {
	const discard = _.get(state, 'discard');
	const hands = _.get(state, 'hands');
	return _.merge(state, _.m({
		hasDrawn: true,
		discard: _.drop(1, discard),
		hands: _.updateIn(
			hands, [playerName, 'held'], _.curry(_.conj, _.nth(discard, 0))
		)
	}));
};

export const drawDeck = (state, playerName) => {
	const players = _.get(state, 'players');
	const playerCount = _.count(players);
	const turnId = _.get(state, 'turnId');
	const deck = _.get(state, 'deck');
	const discard = _.get(state, 'discard');
	const hands = _.get(state, 'hands');
	const mayIs = _.get(state, 'mayIs');
	const mayI = _.minBy(id => (turnId + playerCount - id) % playerCount, mayIs);
	const mayIer = _.count(mayIs) && _.nth(players, mayI);
	const hasMayI = !!mayIer && mayI !== turnId;
	const drawCount = hasMayI ? 3 : 1;
	const needsShuffle = _.count(deck) <= drawCount;
	let newDeck = _.drop(drawCount, deck);
	let drawPile = _.take(drawCount, deck);
	if (needsShuffle) {
		const shuffled = _.shuffle(discard);
		newDeck = _.drop(drawCount - _.count(deck), shuffled);
		drawPile = _.take(drawCount, _.concat(deck, shuffled));
	}
	const newDiscard = needsShuffle ? _.list() : discard;
	return _.merge(state, _.m({
		hasDrawn: true,
		mayIs: _.vector(),
		deck: newDeck,
		discard: _.drop(hasMayI ? 1 : 0, newDiscard),
		hands: _.pipeline(
			hands,
			_.curry(_.updateIn, [playerName, 'held'], _.curry(_.conj, _.nth(drawPile, drawCount - 1))),
			!hasMayI ? _.identity : _.comp(
				_.curry(_.updateIn, [mayIer, 'held'], _.curry(_.concat, _.take(2, drawPile))),
				_.curry(_.updateIn, [mayIer, 'held'], _.curry(_.conj, _.peek(discard))),
				_.curry(_.updateIn, [mayIer, 'mayIs'], _.dec)
			)
		)
	}));
};

export const play = (state, playerName, plays) => {
	const players = _.get(state, 'players');
	const playerCount = _.count(players);
	const turnId = _.get(state, 'turnId');
	const discard = _.get(state, 'discard');
	const hands = _.get(state, 'hands');
	const currHeld = _.getIn(hands, [playerName, 'held']);
	const discarded = _.get(plays, 'discard');
	const newHeld = _.remove(card => card === discarded, currHeld);
	return _.merge(state, _.m({
		hasDrawn: false,
		discard: _.conj(discard, discarded),
		turnId: (turnId + 1) % playerCount,
		hands: _.assocIn(hands, [playerName, 'held'], newHeld)
	}));
};
