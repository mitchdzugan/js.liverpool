import DOM from 'gen-impulse/DOM';
import FRP from 'gen-impulse/FRP';
import * as API from 'API';
import _ from 'Util/Mori';

const OutsideGame = () => (function* () {
	const postRequest = yield* DOM.getEnv('postRequest');
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
			console.log({ roomId, name });
			const d_createRoom = yield* DOM.button({ disabled: true, className: "huh" }, DOM.text("Create Room"));
			const d_joinRoom = yield* DOM.button({}, DOM.text("Join Room"));
			yield* DOM.e_consume(
				() => postRequest(API.CreateRoom(name)), d_createRoom.onClick
			);
		})()));
	})());
})();

const InsideGame = () => (function* () {
	yield* DOM.div({}, DOM.text("You are in an active game!"));
})();

export const App = (function* () {
	const e_response = yield* DOM.getEnv('e_response');
	const e_gameState = FRP.filter(
		_.match({
			[API.Response.GameState]: () => true,
			[_.DEFAULT]: () => false
		}),
		e_response
	);
	yield* DOM.e_consume(_.log, e_gameState);
	const s_gameState = yield* DOM.s_use(FRP.s_from(e_gameState, null));
	yield* DOM.s_bindDOM(s_gameState, (gameState) => (
		!gameState ? OutsideGame() : (
			DOM.upsertEnv('gameState', gameState, InsideGame())
		)
	));
})();
