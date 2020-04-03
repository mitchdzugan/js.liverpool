import React from 'react';
import FRP from 'gen-impulse/FRP';
import * as API from 'API';
import { toString, toSrc, fromInt } from 'Card';
import _ from 'Util/Mori';

const C = React.createContext();
const {
  useState, useContext, useEffect
} = React;

class Screen extends _.Enum {
	static NoRoom = new Screen();
	static WaitingStart = new Screen();
	static InGame = new Screen();
	static _ = Screen.closeEnum();
}

const getCurrScreen = (state) => {
	if (!state) {
		return Screen.NoRoom;
	}

	return _.get(state, 'started') ? Screen.InGame : Screen.WaitingStart;
};

const NoRoom = () => {
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const { postRequest } = useContext(C);
  const cardLoop = (i) => !i ? null : (
    <div className="card-loop" >
      <img src="/cards/15.0.png" />
      {cardLoop(i-1)}
    </div>
  );
  console.log({ name });
  const canCreate = name.length > 2;
  const canJoin = canCreate && roomId.length === 6;
  const create = () => canCreate && (
    postRequest(API.CreateRoom(name))
  );
  const join = () => canJoin && (
    postRequest(API.JoinRoom(roomId, name))
  );
  return (
    <div className="container content" >
      <div className="splash" >
        <div className="header" >
          <div className="quarantine" >QUARANTINE</div>
          <div className="liverpool" >Liverpool</div>
        </div>
        <div className="card-loop-top" >
          {cardLoop(16)}
        </div>
        <div className="actions">
          <div className="field has-addons">
            <p className="control">
              <input
                className="input"
                type="text"
                placeholder="Your Name"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </p>
            <p className="control">
              <button
                disabled={!canCreate}
                className="button is-danger"
                onClick={create}
              >
                Create Room
              </button>
            </p>
          </div>
          <div className="field has-addons">
            <p className="control">
              <input
                className="input"
                type="text"
                placeholder="Room ID"
                value={roomId}
                onChange={e => setRoomId(e.target.value)}
              />
            </p>
            <p className="control">
              <button
                disabled={!canJoin}
                className="button is-danger"
                onClick={join}
              >
                Join Room
              </button>
            </p>
          </div>
        </div>
			</div>
		</div>
  );
};

const WaitingStart = () => {
  const { state, postRequest } = useContext(C);
  const roomId = _.get(state, 'roomId');
  const players = _.get(state, 'players');
  const numDecks = _.get(state, 'numDecks');
  const numPlayers = _.count(_.get(state, 'players'));
  const canStart = numPlayers > 1;
  const start = () => (
    postRequest(API.StartGame(roomId))
  );
  const modDecks = (change) => () => (
    postRequest(API.ConfigureRoom(roomId, numDecks + change))
  );
  return (
    <>
			<div>Room ID: {roomId}</div>
      <div>Players</div>
      <ul>
        {_.intoArray(players).map(player => <li key={player} >{player}</li>)}
      </ul>
      <div>
        <div>Number of decks: {numDecks}</div>
        <button onClick={modDecks(-1)} disabled={numDecks === 1} >↓</button>
        <button onClick={modDecks(1)} >↑</button>
      </div>
      <button onClick={start} disabled={!canStart}>Start Game!</button>
    </>
  );
};

const InGame = () => {
  const { state, postRequest } = useContext(C);
  const [selectedCard, setSelectedCard] = useState(null);
  useEffect(
    () => {
      const f = (e) => (
        setTimeout(() => !e.ignore && setSelectedCard(null), 0)
      );
      document.body.addEventListener('click', f, false);
      return () => (
        document.body.removeEventListener('click', f)
      );
    },
    [],
  );
  const roomId = _.get(state, 'roomId');
  const players = _.get(state, 'players');
	const idLookup = _.get(state, 'idLookup');
	const hands = _.get(state, 'hands');
	const dealerId = _.get(state, 'dealerId');
	const turnId = _.get(state, 'turnId');
	const discard = _.get(state, 'discard');
	const s = i => toString(fromInt(i));
	const player = _.get(state, 'player');
	const hasDrawn = _.get(state, 'hasDrawn');
	const deckCount = _.get(state, 'deckCount');
	const id = _.get(idLookup, player);
	const isTurn = turnId === id;
	const isDealer = dealerId === id;
	const mayIs = _.getIn(hands, [player, 'mayIs']);
  const [ held, setHeld ] = useState(_.getIn(hands, [player, 'held']));
  const mayI = () => (
    postRequest(API.MayI(roomId))
  );
  const isSel = (card) => card === selectedCard;
  console.log(selectedCard);
  const onCard = (card) => (e) => {
    if (!selectedCard) {
      e.nativeEvent.ignore = true;
      e.stopPropagation();
      setSelectedCard(card);
      return;
    }
  };
  const onCardParent = (e) => {
		const { clientX, clientY, target } = e;
		const cardWidth = 46;
		const cardHeight = 35;
		const closest = _.pipeline(
			document.getElementById('card-parent').children,
			Array.from,
			(children) => _.vector(...children),
      _.partial(_.filter, (el) => el.tagName !== 'BUTTON'),
			_.partial(_.map, (el) => ({ el, rect: el.getBoundingClientRect() })),
			_.partial(_.map, ({ el, rect: { x, y, width, height } }) => {
				const distX = (width / 2) + x - clientX;
				const cardVal = parseInt(el.dataset.cardVal, 10);
				return {
					distX: Math.abs(distX),
					distY: Math.abs((height / 2) + y - clientY),
					orientation: distX < 0 ? 'RIGHT' : 'LEFT',
					card: toString(fromInt(cardVal)),
					cardVal,
				};
			}),
			_.partial(_.minBy, ({ distY, distX }) => Math.sqrt(distY * distY + distX * distX)),
		);

		if (closest.distX > cardWidth || closest.distY > cardHeight) {
			return;
		}
		let past = false;
		let first = true;
		let wasFirst = false;
		const updatedHeld = _.pipeline(
			held,
			_.partial(_.partitionBy, (card) => {
				if (past) {
					return true;
				}
				if (card === closest.cardVal) {
					past = true;
					wasFirst = first;
					return closest.orientation === 'LEFT';
				}
				first = false;
				return false;
			}),
			(partitioned) => (
				_.count(partitioned) > 1 ? partitioned : (
					wasFirst ?
						_.concat(_.vector(_.vector()), partitioned) :
						_.concat(partitioned, _.vector(_.vector()))
				)
			),
			(partitioned) => _.concat(
				_.filter(card => card !== selectedCard, _.nth(partitioned, 0)),
				_.vector(selectedCard),
				_.filter(card => card !== selectedCard, _.nth(partitioned, 1)),
			)
		);
    setHeld(updatedHeld);
  };
  const className = card => (
    `${!selectedCard ? 'clickable' : ''}${isSel(card) ? 'selected' : ''}`
  );

  const deckLoop = (i) => !i ? null : (
    <div className="pcard deck-loop" >
      <img src="/cards/15.0.png" />
      {deckLoop(i-1)}
    </div>
  );
  const renderDeck = (deckCount) => {
    const showCount = Math.min(deckCount, 11);
    return (
      <>
        <div
          style={{ width: `${25 + 2*showCount}px` }}
          className="deck-top"
        >
          {deckLoop(showCount)}
        </div>
        <div className="full-count" >{deckCount}</div>
      </>
    );
  };
  return (
    <>
			<div className="in-game">
				<div className="main-controls">
          <div className="deck" >
            <div className="grant" >
              <button className="button is-info is-small">
                Grant May I
              </button>
            </div>
						<div
							className="pcard"
							data-card-val={discard}
						>
							<img
								src={toSrc(fromInt(discard))}
							/>
						</div>
            {renderDeck(deckCount)}
          </div>
				</div>
        <div className="players">
          {_.intoArray(players).map(player => {
	          const id = _.get(idLookup, player);
            const isTurn = id === turnId;
            let pClassName = "player";
            pClassName += isTurn ? ' turn' : '';
            return (
              <div key={player} className={pClassName} >
                <div className="text">{player}</div>
								<div key={player} className="player-contents" >
									<div className="board-hand">
										{renderDeck(_.getIn(hands, [player, 'heldCount']))}
									</div>
								</div>
              </div>
            );
          })}
          <div className="reserved-space"/>
        </div>
			</div>
			<div className="my-hand">
				<div id="card-parent" onClick={onCardParent}>
					{_.intoArray(held).map(card => (
						<div
							key={card}
							className="pcard"
							data-card-val={card}
							onClick={onCard(card)}
						>
							<img
								className={className(card)}
								src={toSrc(fromInt(card))}
							/>
						</div>
					))}
					<button className="may-i-spacer" />
				</div>
				<button className="may-i" onClick={mayI} >
					May I <br />
					{mayIs}
				</button>
			</div>
    </>
  );
};

const ScreenComponent = (state) => (
  _.match({
    [Screen.NoRoom]: () => NoRoom,
    [Screen.WaitingStart]: () => WaitingStart,
    [Screen.InGame]: () => InGame,
  })(getCurrScreen(state))
);

export const App = ({ e_response, postRequest }) => {
  const [state, setState] = useState(null);
	const e_gameState = _.pipeline(
		e_response,
		_.partial(FRP.filter, _.match({
			[API.Response.GameState]: () => true,
			[_.DEFAULT]: () => false
		})),
		_.partial(FRP.fmap, _.g('gameState'))
	);
  useEffect(() => (FRP.consume(setState, e_gameState)), []);
  const CurrScreen = ScreenComponent(state);
  const context = { postRequest, state };
  return (
    <C.Provider value={context} >
      <div className="container content" >
				<CurrScreen />
      </div>
    </C.Provider>
  );
};
