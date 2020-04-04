import _ from 'Util/Mori';
import mdo from './mdo.macro.js';
import { fromInt, isJoker, isNoCard, toPoints } from 'Card';

export class Goal extends _.Enum {
	static Set = new Goal("Goal.Set");
	static Run = new Goal("Goal.Run");
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

const validateSetPlay = (play) => {
	if (_.count(play) < 3) {
		return false;
	}

	return 1 === _.pipeline(
		play,
		_.partial(_.map, fromInt),
		_.partial(_.filter, _.comp(_.not, isJoker)),
		_.partial(_.groupBy, _.g('val')),
		_.keys,
		_.count
	);
};

const validateRunPlay = (play) => {
	if (_.count(play) < 4) {
		return false;
	}

	const cards = _.pipeline(
		play,
		_.partial(_.map, fromInt)
	);

	const isSuited = 1 === _.pipeline(
		cards,
		_.partial(_.filter, _.comp(_.not, isJoker)),
		_.partial(_.groupBy, _.g('suit')),
		_.keys,
		_.count
	);

	if (!isSuited) {
		return false;
	}

	return _.pipeline(
		cards,
		_.partial(
			_.reduce,
			({ hasInit, isValid, offset, init }, card) => {
				if (!isValid) {
					return { isValid };
				}

				if (isJoker(card)) {
					return { hasInit, isValid, offset: offset + 1, init };
				}

				const n = _.get(card, 'n');

				if (!hasInit) {
					const theInit = n - offset;
					const isValidInit = theInit >= 0 && theInit + _.count(cards) < 15;
					return !isValidInit ? { isValid: false } : {
						hasInit: true,
						offset: offset + 1,
						isValid: true,
						init: n - offset
					};
				}

				return (init + offset) % 13 !== n ? { isValid: false } : {
					hasInit,
					init,
					isValid,
					offset: offset + 1,
				};
			},
			{ hasInit: false, isValid: true, offset: 0 }
		),
		({ isValid }) => isValid
	);
};

export const validatePlay = (type, play) => {
	const hasNoCard = _.reduce(
		(has, card) => has || isNoCard(fromInt(card)),
		false,
		play
	);

	const hasDuplicates = _.pipeline(
		play,
		_.partial(_.groupBy, _.identity),
		_.keys,
		_.count,
		(uniqueCount) => uniqueCount < _.count(play)
	);

	if (hasNoCard || hasDuplicates) {
		return false;
	}

	return _.match({
		[Goal.Set]: () => validateSetPlay(play),
		[Goal.Run]: () => validateRunPlay(play),
	})(type);
};

export const getGoal = (state) => (
	hands[_.get(state, 'handId')]
);

export const initGame = (roomId, player) => _.m({
	roomId,
	numDecks: 2,
	started: false,
	players: _.vector(player),
	idLookup: _.hashMap(player, 0),
});

export const joinGame = (state, name) => {
	const started = _.get(state, 'started');
	if (started) {
		throw("Already Started");
	}
	return _.pipeline(
		state,
		_.curry(_.update, 'players', _.curry(_.conj, name)),
		_.curry(_.update, 'idLookup', _.curry(_.assoc, name, 0))
	);
};

export const setNumDecks = (state, numDecks) => (
	_.assoc(state, 'numDecks', numDecks)
);

const HAND_SIZE = 11;
export const startGame = (state) => {
	const players = _.shuffle(_.get(state, 'players'));
	const playerCount = _.count(players);
	const numDecks = _.get(state, 'numDecks');
	const fullDeck = _.shuffle(_.range(numDecks * 54));
	const idLookup = _.mkIdLookup(players);
	const scores = _.mapValues(() => _.vector(), idLookup);
	const money = _.get(state, 'money', _.mapValues(() => 0, scores));
	const handId = 0;
	const dealerId = 0;
	const turnId = 1;
	const mayIs = _.vector();
	const playerCards = _.vec(_.partition(
		HAND_SIZE, _.take(HAND_SIZE * playerCount, fullDeck)
	));
	const hands = _.mapValues(
		(id, name) => _.m({
			mayIs: 3,
			held: _.nth(playerCards, id),
		}),
		idLookup
	);
	const discard = _.list(_.nth(fullDeck, HAND_SIZE * playerCount));
	const deck = _.drop(HAND_SIZE * playerCount + 1, fullDeck);
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
		handWinner: null,
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

export const unMayI = (state, playerName) => {
	const idLookup = _.get(state, 'idLookup');
	const mayIs = _.get(state, 'mayIs');
	const id = _.get(idLookup, playerName);
	return _.merge(state, _.m({
		mayIs: _.filter((pId) => pId !== id, mayIs)
	}));
};

export const takeDiscard = (state, playerName) => {
	const turnId = _.get(state, 'turnId');
	const idLookup = _.get(state, 'idLookup');
	const playerId = _.get(idLookup, playerName);
	if (turnId !== playerId) {
		throw("Not your turn");
	}
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
	const turnId = _.get(state, 'turnId');
	const idLookup = _.get(state, 'idLookup');
	const playerId = _.get(idLookup, playerName);
	if (turnId !== playerId) {
		throw("Not your turn");
	}
	const players = _.get(state, 'players');
	const playerCount = _.count(players);
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
	let usedCards = _.vector();
	let hands = _.get(state, 'hands');

	const players = _.get(state, 'players');
	const playerCount = _.count(players);
	const turnId = _.get(state, 'turnId');
	const dealerId = _.get(state, 'dealerId');
	const currHand = _.get(hands, playerName);
	const currHeld = _.get(currHand, 'held');
	const heldSet = new Set(_.intoArray(currHeld));
	const isDown = _.count(_.get(currHand, 'down', _.hashMap())) > 0;
	const idLookup = _.get(state, 'idLookup');
	const playerId = _.get(idLookup, playerName);

	const discard = _.get(plays, 'discard');
	const table = _.get(plays, 'table');
	const down = _.get(plays, 'down');

	const hasDiscard = !isNoCard(fromInt(discard));
	const hasTable = _.count(table);
	const hasDown = _.count(down);

	if (turnId !== playerId) {
		throw("Not your turn");
	}
	if (isDown && hasDown) {
		throw("Already Down");
	}
	if (!isDown && !hasDown && hasTable) {
		throw("Cannot play on others until down");
	}

	_.meach(table, (player, goals) => (
		_.meach(goals, (type, piles) => (
			_.each(
				_.map((pileId, plays) => ({ pileId, plays }), _.range(), piles),
				({ pileId, plays }) => {
					const playL = _.nth(plays, 0);
					const playR = _.nth(plays, 1);
					const curr = _.getIn(hands, [player, 'down', type, pileId]);
					const next = _.vec(_.concat(playL, curr, playR));
					const isValid = validatePlay(type, next);
					if (!isValid) {
						throw("Invalid Play");
					}
					hands = _.assocIn(hands, [player, 'down', type, pileId], next);
					usedCards = _.concat(playL, playR, usedCards);
				}
			)
		))
	));

	if (hasDown) {
		hands = _.assocIn(hands, [playerName, 'down'], down);
	}
	_.meach(down, (type, piles) => (
		_.each(piles, (pile) => {
			const isValid = validatePlay(type, pile);
			if (!isValid) {
				throw("Invalid Play");
			}
			usedCards = _.concat(pile, usedCards);
		})
	));
	const currGoal = getGoal(state);
	const hasEnoughSet = (
		_.count(_.get(down, Goal.Set.toString())) === currGoal[Goal.Set]
	);
	const hasEnoughRun = (
		_.count(_.get(down, Goal.Run.toString())) === currGoal[Goal.Run]
	);

	if (hasDown && !hasEnoughSet) {
		throw("Not Enough Sets Played");
	}
	if (hasDown && !hasEnoughRun) {
		throw("Not Enough Runs Played");
	}

	const hasDuplicates = _.pipeline(
		usedCards,
		_.partial(_.groupBy, _.identity),
		_.keys,
		_.count,
		(uniqueCount) => uniqueCount < _.count(usedCards)
	);
	if (hasDuplicates) {
		throw("Used Duplicate Cards In Play");
	}
	_.each(usedCards, (card) => {
		if (!heldSet.has(card)) {
			throw "Do Not Have Played Card";
		}
	});
	if (_.count(usedCards) < _.count(currHeld) && !hasDiscard) {
		throw "Must Play Discard Or Go Out";
	}
	usedCards = _.conj(usedCards, discard);

	const usedSet = new Set(_.intoArray(usedCards));
	// const nextHeld = _.vec(_.remove(card => usedSet.has(card), currHeld));
	const nextHeld = _.vector(); // TODO remove
	hands = _.assocIn(hands, [playerName, 'held'], nextHeld);

	const discardPile = _.get(state, 'discard');
	const newState = _.merge(state, _.m({
		hasDrawn: false,
		discard: _.conj(discardPile, discard),
		turnId: (turnId + 1) % playerCount,
		hands,
		...(_.count(nextHeld) ? {} : {
			turnId,
			dealerId: (dealerId + 1) % playerCount,
			handWinner: playerName,
			hands: _.assocIn(hands, [playerName, 'held'], _.vector()),
			scores: _.reduceKV(
				(scores, player, hand) => (
					_.update(scores, player, _.curry(_.conj, _.reduce(
						(heldPoints, held) => heldPoints + toPoints(fromInt(held)),
						0,
						_.get(hand, 'held')
					)))
				),
				_.get(state, 'scores'),
				hands,
			),
			money: (() => {
				const curr = _.get(state, 'money');
				const buyIn = _.match({
					[0]: () => 25,
					[_.DEFAULT]: () => 10,
				})(_.get(state, 'handId'));
				const spent = _.reduceKV(
					(spent, player, hand) => (
						_.assoc(spent, player, buyIn + (5 * (3 - _.get(hand, 'mayIs'))))
					),
					_.hashMap(),
					hands
				);
				const potsize = _.reduceKV((pot, _, contrib) => pot + contrib, 0, spent);
				const getNext = (player) => (
					_.get(curr, player) + (player === playerName ? potsize : 0) - _.get(spent, player)
				);
				return _.reduceKV((money, player) => _.assoc(money, player, getNext(player)), curr, curr);
			})(),
		})
	}));
	const gameOver = !_.count(nextHeld) && _.get(state, 'handId') === 6;
	return !gameOver ? newState : (() => {
		const scores = _.get(newState, 'scores');
		const money = _.get(newState, 'money');
		const toScore = (scores) => (
			_.reduce((a, c) => a + c, 0, scores)
		);
		const minScore = toScore(_.minBy(toScore, _.vals(scores)));
		let totalOwed = 0;
		const getFinalCash = (player) => {
			const curr = _.get(money, player);
			const score = toScore(_.get(scores, player));
			const owed = Math.floor((((score - minScore) / 4) / 5) + 0.5) * 5;
			totalOwed += owed;
			return curr - owed;
		};
		const penultCash = _.reduce(
			(penult, player) => _.assoc(
				penult, player, getFinalCash(player)
			),
			_.hashMap(),
			players
		);
		const finalCash = _.update(penultCash, playerName, curr => curr + totalOwed);
		return _.pipeline(
			newState,
			_.curry(_.assoc, 'isGameOver', true),
			_.curry(_.assoc, 'money', finalCash),
			_.curry(_.dissoc, 'handWinner')
		);
	})();
};


export const deal = (state, playerName) => {
	const players = _.get(state, 'players');
	const playerCount = _.count(players);
	const dealerId = _.get(state, 'dealerId');
	const idLookup = _.get(state, 'idLookup');
	const handWinner = _.get(state, 'handWinner');
	const playerId = _.get(idLookup, playerName);
	if (!handWinner) {
		throw("Current hand is not over");
	}
	if (playerId !== dealerId) {
		throw("Not the dealer");
	}


	const numDecks = _.get(state, 'numDecks');
	const fullDeck = _.shuffle(_.range(numDecks * 54));
	const handId = _.get(state, 'handId') + 1;
	const turnId = (dealerId + 1) % playerCount;
	const mayIs = _.vector();
	const playerCards = _.vec(_.partition(
		HAND_SIZE, _.take(HAND_SIZE * playerCount, fullDeck)
	));
	const hands = _.mapValues(
		(id, name) => _.m({
			mayIs: 3,
			held: _.nth(playerCards, id),
		}),
		idLookup
	);
	const discard = _.list(_.nth(fullDeck, HAND_SIZE * playerCount));
	const deck = _.drop(HAND_SIZE * playerCount + 1, fullDeck);
	return _.merge(state, _.m({
		hasDrawn: false,
		handId,
		dealerId,
		hands,
		turnId,
		mayIs,
		discard,
		deck,
		handWinner: null,
	}));
};
