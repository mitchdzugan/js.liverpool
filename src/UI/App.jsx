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
  const [myHandHeight, setMyHandHeight] = useState("0px");
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
  useEffect(
    () => {
      setTimeout(
        () => {
          const myHandEl = document.getElementById('my-hand');
          if (!myHandEl) {
            return;
          }
          const height = myHandEl.clientHeight;
          if (myHandHeight !== height) {
            setMyHandHeight(height);
          }
        },
        0
      );
    }
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
	const playerId = _.get(idLookup, player);
	const hasDrawn = _.get(state, 'hasDrawn');
	const deckCount = _.get(state, 'deckCount');
	const id = _.get(idLookup, player);
	const isTurn = turnId === id;
	const isDealer = dealerId === id;
	const mayIs = _.getIn(hands, [player, 'mayIs']);
  const canMayI = !isTurn && !hasDrawn && mayIs > 0;
  const [ held, setHeld ] = useState(_.getIn(hands, [player, 'held']));
  useEffect(
    () => {
      const srvr = _.getIn(hands, [player, 'held']);
		  const srvr_set = new Set(_.intoArray(srvr));
		  const held_set = new Set(_.intoArray(held));
		  const news = _.vector(
			  ...([...srvr_set].filter(card => !held_set.has(card)))
		  );
		  const updatedHeld = _.pipeline(
			  _.concat(news, held),
			  _.partial(_.filter, (card) => srvr_set.has(card))
		  );
      setHeld(updatedHeld);
    },
    [_.getIn(hands, [player, 'held'])]
  );
  const isMayI = _.pipeline(
    _.get(state, 'mayIs'),
    _.partial(_.reduce, (has, id) => has || id === playerId, false)
  );
  const mayI = () => (
    postRequest(API.MayI(roomId))
  );
  const unMayI = () => (
    postRequest(API.UnMayI(roomId))
  );
  const isSel = (card) => card === selectedCard;
  const onCard = (card) => (e) => {
    if (!selectedCard) {
      e.nativeEvent.ignore = true;
      e.stopPropagation();
      setSelectedCard(card);
      return;
    }
  };
  const onCardParent = (e) => {
    if (!selectedCard) {
      return;
    }
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

  const deckLoop = (i) => !i ? null : (
    <div className="pcard deck-loop" >
      <img src="/cards/15.0.png" />
      {deckLoop(i-1)}
    </div>
  );
  const renderDeck = (deckCount, onClick = () => {}) => {
    const showCount = Math.min(deckCount, 11);
    return (
      <>
        <div
          onClick={onClick}
          style={{ width: `${25 + 2*showCount}px` }}
          className="deck-top"
        >
          {deckLoop(showCount)}
        </div>
        <div className="full-count" >{deckCount}</div>
      </>
    );
  };
  let mayIClassName = "may-i";
  mayIClassName += isMayI ? " cancel" : "";
  mayIClassName += canMayI ? "" : " cant";
  const mkKey = (card) => _.pipeline(
    _.reduce((agg, card) => `${agg}-${card}`, "", held),
    (soFar) => `${soFar}, ${card}`
  );
  const [isTable, setIsTable] = useState(true);
  const mkButtonClass = (isBold) => (
    `button is-small${isBold ? ' has-text-weight-bold' : ''}`
  );
  const isPicking = isTurn && !hasDrawn;
  const drawDeck = () => (
    isPicking && postRequest(API.DrawDeck(roomId))
  );
  const takeDiscard = () => (
    isPicking && postRequest(API.TakeDiscard(roomId))
  );
  const [plays, setPlays] = useState(_.hashMap());
  const inPlay = _.reduceKV(
    (inPlay, k, v) => k === 'discard' ? (
      _.assoc(inPlay, v, true)
    ) : (
      _.reduceKV(
        (inPlay, k, v) => _.assoc(inPlay, v, true),
        inPlay,
        v
      )
    ),
    _.hashMap(),
    plays,
  );
  const className = card => (
    `${!selectedCard ? 'clickable' : ''}${isSel(card) ? 'selected' : ''}${_.get(inPlay, card) ? ' in-play' : ''}`
  );

  return (
    <>
			<div className="in-game">
				<div className={`main-controls${isTable ? ' hide-controls' : ''}`}>
          <div className="field has-addons" >
            <p className="control">
              <button
                onClick={() => setIsTable(true)}
                className={mkButtonClass(isTable)}
              >
                Table
              </button>
            </p>
            <p className="control">
              <button
                onClick={() => setIsTable(false)}
                className={mkButtonClass(!isTable)}
              >
                Scores
              </button>
            </p>
          </div>
          {isTable && (
            <div className={`deck${isPicking ? ' picking' : ''}`} >
              <div className="grant" >
                <button className="button is-info is-small">
                  Grant May I
                </button>
              </div>
						  <div
                onClick={takeDiscard}
							  className="pcard discarded"
							  data-card-val={discard}
						  >
							  <img
								  src={toSrc(fromInt(discard))}
							  />
						  </div>
							{renderDeck(deckCount, drawDeck)}
            </div>
          )}
				</div>
        {!isTable && (
          <div className="score-container" >
						<table className="table">
							<thead>
								<th>Hand</th>
								<th>Mitch</th>
								<th>Mom</th>
								<th>Dad</th>
							</thead>
							<tbody>
								<tr><th>1</th><td>10</td><td>5</td><td>0</td></tr>
								<tr><th>2</th><td>10</td><td>5</td><td>0</td></tr>
								<tr><th>3</th><td>10</td><td>5</td><td>0</td></tr>
								<tr><th>4</th><td></td><td></td><td></td></tr>
								<tr><th>5</th><td></td><td></td><td></td></tr>
								<tr><th>6</th><td></td><td></td><td></td></tr>
								<tr><th>7</th><td></td><td></td><td></td></tr>
							</tbody>
							<tfoot>
								<th>Cash</th><td>+0.75</td><td>-0.25</td><td>-0.5</td>
							</tfoot>
						</table>
          </div>
        )}
        {isTable && (
        <div className="players">
          {_.intoArray(players).map(player => {
	          const playerId = _.get(idLookup, player);
            const isTurn = playerId === turnId;
            let pClassName = "player";
            pClassName += isTurn ? ' turn' : '';
            const mayIs = _.getIn(hands, [player, 'mayIs']);
            const isMayI = _.pipeline(
              _.get(state, 'mayIs'),
              _.partial(_.reduce, (has, id) => has || id === playerId, false)
            );
            const renderChip = (i) => {
              const active = isMayI && i === mayIs - 1;
              const used = i >= mayIs;
              let className = "may-i-chip";
              className += active ? " active" : "";
              className += used ? " used" : "";
              return <div className={className}/>;
            };
            return (
              <div key={player} className={pClassName} >
                <div className="text">{player}</div>
								<div key={player} className="player-contents" >
									<div className="board-hand">
										{renderDeck(_.getIn(hands, [player, 'heldCount']))}
                    <div className="may-i-chips">
                      {renderChip(0)}
                      {renderChip(1)}
                      {renderChip(2)}
                    </div>
									</div>
								</div>
              </div>
            );
          })}
          <div className="reserved-space"/>
        </div>
        )}
			</div>
      {isTable && (
        <>
			    <div id="my-hand" className="my-hand">
				    <div id="card-parent" onClick={onCardParent}>
					    {_.intoArray(held).map((card, ind) => (
						    <div
							    key={mkKey(card)}
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
				    <button
              disabled={!canMayI}
              className={mayIClassName}
              onClick={isMayI ? unMayI : mayI}
            >
              {isMayI ? 'Cancel' : (
                <>
					        May I <br />
					        {mayIs}
                </>
              )}
				    </button>
			    </div>
					{(() => {
              const onDiscard = (e) => {
                e.nativeEvent.ignore = true;
                if (!selectedCard) {
                  return;
                }
                setPlays(_.assoc(plays, 'discard', selectedCard));
                setSelectedCard(null);
              };
              const onCancel = () => setPlays(_.hashMap());
              const myDiscard = _.get(plays, 'discard');
            const discardSrc = toSrc(fromInt(myDiscard));
            const [viewTable, setViewTable] = useState(false);
            let transform = 'translateY(100%)';
            if (isTurn && hasDrawn) {
              if (!viewTable) {
                transform = 'translateY(0)';
              } else {
                transform = 'translateY(190px)';
              }
            }
              return (
                <div
                  style={{ transform }}
                  className="play-board"
                >
									<div className="play-controls" >
										<button onClick={onCancel} className="button is-danger is-small">
											Cancel
										</button>
										<div className="discard-space">
											<div onClick={onDiscard} className="pcard">
												<img src={discardSrc} />
											</div>
											<span>Discard</span>
										</div>
										<button className="button is-danger is-small">
											Finish
										</button>
									</div>
                  <div className="play-closer is-size-7" >
										<div />
                    <div
                      onClick={() => setViewTable(!viewTable)}
										>
											View {viewTable ? 'Plays' : 'Table'}
										</div>
										<div />
                  </div>
                  <div className="target" >
                    <div className="target-plays">
											<div className="pcard">
												<img src={toSrc(fromInt(-1))} />
											</div>
											<div className="pcard">
												<img src={toSrc(fromInt(-1))} />
											</div>
											<div className="pcard">
												<img src={toSrc(fromInt(-1))} />
											</div>
                    </div>
                    <span>Set</span>
                  </div>
                  <div className="target" >
                    <div className="target-plays">
											<div className="pcard">
												<img src={toSrc(fromInt(-1))} />
											</div>
											<div className="pcard">
												<img src={toSrc(fromInt(-1))} />
											</div>
											<div className="pcard">
												<img src={toSrc(fromInt(-1))} />
											</div>
											<div className="pcard">
												<img src={toSrc(fromInt(-1))} />
											</div>
                    </div>
                    <span>Run</span>
                  </div>
                  <div className="target" >
                    <div className="target-plays">
											<div className="pcard">
												<img src={toSrc(fromInt(-1))} />
											</div>
											<div className="pcard">
												<img src={toSrc(fromInt(-1))} />
											</div>
											<div className="pcard">
												<img src={toSrc(fromInt(-1))} />
											</div>
											<div className="pcard">
												<img src={toSrc(fromInt(-1))} />
											</div>
                    </div>
                    <span>Run</span>
                  </div>
									<div style={{ height: `${myHandHeight}px` }} />
								</div>
              );
          })()}
        </>
      )}
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
