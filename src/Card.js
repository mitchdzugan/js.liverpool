import _ from 'Util/Mori';
import { quot } from 'Util/Math';

export class CardType extends _.Enum {
	static Suited = new CardType();
	static Joker = new CardType();
	static NoCard = new CardType();
	static _ = this.closeEnum();
}

export const Suited = (suit, val, n) => (
	_.mk(CardType.Suited, { suit, val, n })
);
export const Joker = (color) => (
	_.mk(CardType.Joker, { color })
);
export const NoCard = _.mk(CardType.NoCard);

const fromInt_h = (n) => _.match({
	[null]: () => NoCard,
	[undefined]: () => NoCard,
	[NaN]: () => NoCard,
	[-1]: () => NoCard,
	[52]: () => Joker('Red'),
	[53]: () => Joker('Black'),
	[_.DEFAULT]: (n1) => Suited(
		_.match({
			[0]: () => 'Diamonds',
			[1]: () => 'Hearts',
			[2]: () => 'Spades',
			[3]: () => 'Clubs',
		})(quot(n1, 13)),
		_.match({
			[1]: () => 'Ace',
			[11]: () => 'Jack',
			[12]: () => 'Queen',
			[13]: () => 'King',
			[_.DEFAULT]: n2 => `${n2}`
		})(n1 % 13 + 1),
		n1 % 13
	)
})(n % 54);

export const fromInt = (n) => {
	if (!n && n !== 0) {
		return NoCard;
	}

	return fromInt_h(n);
};

export const toString = _.match({
	[CardType.NoCard]: () => "No Card",
	[CardType.Joker]: () => "Joker",
	[CardType.Suited]: ({ suit, val }) => `${val} of ${suit}`
});

export const toSrc = _.match({
	[CardType.NoCard]: () => '/cards/15.3.png',
	[CardType.Joker]: [({ color }) => color, {
		Red: () => '/cards/15.1.png',
		Black: () => '/cards/15.2.png',
	}],
	[CardType.Suited]: [({ suit }) => suit, {
		Diamonds: ({ n }) => `/cards/${n}.0.png`,
		Hearts: ({ n }) => `/cards/${n}.1.png`,
		Spades: ({ n }) => `/cards/${n}.2.png`,
		Clubs: ({ n }) => `/cards/${n}.3.png`,
	}],
});
