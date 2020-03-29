import { quot } from 'Util/Math';

const numLookup = [
	'A',
	'B',
	'C',
	'D',
	'E',
	'F',
	'G',
	'H',
	'I',
	'J',
	'K',
	'L',
	'M',
	'N',
	'O',
	'P',
	'Q',
	'R',
	'S',
	'T',
	'U',
	'V',
	'W',
	'X',
	'Y',
	'Z',
];

export const alphaNum = (n) => {
	if (n < 26) {
		return numLookup[n];
	}

	return `${alphaNum(quot(n, 26))}${numLookup[n % 26]}`;
};
