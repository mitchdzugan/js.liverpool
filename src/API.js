import _ from 'Util/Mori';

export class Request extends _.Enum {
	static CreateRoom = new Request('Request.CreateRoom');
	static JoinRoom = new Request('Request.JoinRoom');
	static ConfigureRoom = new Request('Request.ConfigureRoom');
	static StartGame = new Request('Request.StartGame');
	static MayI = new Request('Request.MayI');
	static UnMayI = new Request('Request.UnMayI');
	static TakeDiscard = new Request('Request.TakeDiscard');
	static DrawDeck = new Request('Request.DrawDeck');
	static Play = new Request('Request.Play');
	static Deal = new Request('Request.Deal');
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
export const UnMayI = (roomId) => (
	_.mk(Request.UnMayI, { roomId })
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
export const Deal = (roomId) => (
	_.mk(Request.Deal, { roomId })
);

export class Response extends _.Enum {
	static GameState = new Response('Response.GameState');
	static Error = new Response('Response.Error');
	static _ = this.closeEnum();
}
export const GameState = (roomId, gameState) => (
	_.mk(Response.GameState, { roomId, gameState })
);
export const Error = (error) => (
	_.mk(Response.Error, { error })
);
