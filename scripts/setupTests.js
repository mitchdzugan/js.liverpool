// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/extend-expect';
import _ from 'mori';
import diff from 'jest-diff';

expect.extend({
	toMoriEqual(received_raw, expected_raw) {
		const options = {
			comment: 'equivalent mori objects',
      isNot: this.isNot,
      promise: this.promise,
		};
		const toJs = (raw) => _.isCollection(raw) ?
					_.toJs(raw) :
					_.toJs(_.toClj(raw));
		const received = toJs(received_raw);
		const expected = toJs(expected_raw);
		const pass = this.equals(received, expected);
		const message = pass ? (
			() => this.utils.matcherHint('toMoriEqual', undefined, undefined, options) +
				'\n\n' +
				`Expected: not ${this.utils.printExpected(expected)}\n` +
				`Received: ${this.utils.printReceived(received)}`
		) : (
			() => {
				const diffString = diff(expected, received, { expand: this.expand });
				const matcherHint = this.utils.matcherHint('toMoriEqual', undefined, undefined, options);
				const hasExpect = diffString && diffString.includes('- Expect');
				const rest = hasExpect ? `Difference:\n\n${diffString}` : (
					`Expected: ${this.utils.printExpected(expected)}\n` +
						`Received: ${this.utils.printReceived(received)}`
				);
				return `${matcherHint}\n\n${rest}`;
			}
		);

		return { actual: received, message, pass };
	}
});
