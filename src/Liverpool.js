import _ from 'Util/Mori';

export class Goal extends _.Enum {
	static Set = new Goal();
	static Run = new Goal();
	static _ = this.closeEnum();
}

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
