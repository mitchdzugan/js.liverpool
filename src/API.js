import _ from 'Util/Mori';

export class Request extends _.Enum {
	static CreateRoom = new Request();
	static JoinRoom = new Request();
	static ConfigureRoom = new Request();
	static StartGame = new Request();
	static MayI = new Request();
	static TakeDiscard = new Request();
	static DrawDeck = new Request();
	static Play = new Request();
	static _ = this.closeEnum();
}
export const CreateRoom = (name) => (
	_.mk(Request.CreateRoom, { name })
);
export const JoinRoom = (roomId, name) => (
	_.mk(Request.JoinRoom, { roomId, name })
);
export const ConfigureRoom = (roomId, numDecks) => (
	_.mk(Request.ConfigureRoom, { roomId, numDecks })
);
export const StartGame = (roomId) => (
	_.mk(Request.StartGame, { roomId })
);
export const MayI = (roomId) => (
	_.mk(Request.MayI, { roomId })
);
export const TakeDiscard = (roomId) => (
	_.mk(Request.TakeDiscard, { roomId })
);
export const DrawDeck = (roomId) => (
	_.mk(Request.DrawDeck, { roomId })
);
export const Play = (roomId, plays) => (
	_.mk(Request.Play, { roomId, plays })
);

export class Response extends _.Enum {
	static GameState = new Response();
	static Error = new Response();
	static _ = this.closeEnum();
}
export const GameState = (roomId, gameState) => (
	_.mk(Response.GameState, { roomId, gameState })
);
export const Error = (error) => (
	_.mk(Response.Error, { error })
);
