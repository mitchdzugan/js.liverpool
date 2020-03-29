import DOM from 'gen-impulse/DOM';

export const App = (function* () {
	yield* DOM.div({}, DOM.text("Hello World!!!"));
})();
