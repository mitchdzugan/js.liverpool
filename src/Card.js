import _ from 'Util/Mori';
import { quot } from 'Util/Math';

export class CardType extends _.Enum {
	static Suited = new CardType();
	static Joker = new CardType();
	static NoCard = new CardType();
	static _ = this.closeEnum();
}

export const Suited = (suit, val) => (
	_.mk(CardType.Suited, { suit, val })
);
export const Joker = _.mk(CardType.Joker);
export const NoCard = _.mk(CardType.NoCard);

export const fromInt = (n) => _.match({
	[-1]: () => NoCard,
	[52]: () => Joker,
	[53]: () => Joker,
	[_.DEFAULT]: (n1) => Suited(
		_.match({
			[0]: () => 'Spades',
			[1]: () => 'Hearts',
			[2]: () => 'Diamonds',
			[3]: () => 'Clubs',
		})(quot(n1, 13)),
		_.match({
			[1]: () => 'Ace',
			[11]: () => 'Jack',
			[12]: () => 'Queen',
			[13]: () => 'King',
			[_.DEFAULT]: n2 => `${n2}`
		})(n1 % 13 + 1)
	)
})(n % 54);

export const toString = _.match({
	[CardType.NoCard]: () => "No Card",
	[CardType.Joker]: () => "Joker",
	[CardType.Suited]: ({ suit, val }) => `${val} of ${suit}`
});
