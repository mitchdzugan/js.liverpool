import React from 'react';
import FRP from 'gen-impulse/FRP';
import * as API from 'API';
import { toString, toSrc, fromInt } from 'Card';
import { Goal, getGoal, validatePlay } from 'Liverpool';
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
  const [[selectedPlay, unPlay], setSelectedPlay] = useState([]);
  const hasSelected = selectedCard || selectedCard === 0;
  const hasSelectedPlay = selectedPlay || selectedPlay === 0;
  const [myHandHeight, setMyHandHeight] = useState("0px");
  useEffect(
    () => {
      const f = (e) => setTimeout(
        () => {
          if (e.ignore) {
            return;
          }
          setSelectedCard(null);
          setSelectedPlay([]);
        },
        0
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
  const [viewTable, setViewTable] = useState(false);
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
  const myDown = _.getIn(hands, [player, 'down']);
  const amIDown = myDown && _.count(myDown) > 0;
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
    if (!hasSelected) {
      e.nativeEvent.ignore = true;
      e.stopPropagation();
      if (card === selectedPlay) {
        unPlay();
      } else {
        if (!_.get(inPlay, card)) {
          setSelectedCard(card);
        }
      }
      setSelectedPlay([]);
      return;
    }
  };
  const onCardParent = (e) => {
    if (!hasSelected) {
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
  useEffect(
    () => {
      setViewTable(false);
      setPlays(_.hashMap());
    },
    [turnId]
  );
  const inPlay_raw = _.reduceKV(
    (inPlay, k, v) => _.match({
      discard: () => _.assoc(inPlay, v, true),
      down: () => _.reduceKV(
				(inPlay, k, v) => _.reduceKV(
					(inPlay, k, v) => _.reduce(
						(inPlay, v) => _.assoc(
							inPlay,
							_.isVector(v) ? _.nth(v, 0) : v,
							true
						),
						inPlay,
						v
					),
					inPlay,
					v
				),
				inPlay,
				v
			),
      table: () => _.reduceKV(
        (inPlay, k1, v) => _.reduceKV(
          (inPlay, k2, v) => _.reduceKV(
            (inPlay, k3, v) => _.reduce(
              (inPlay, v) => _.reduce(
                (inPlay, v) => _.assoc(inPlay, v, true),
                inPlay,
                v
              ),
              inPlay,
              v
            ),
            inPlay,
            v
          ),
          inPlay,
          v
        ),
        inPlay,
        v
      )
    })(k),
    _.hashMap(),
    plays,
  );
  const inPlay = _.reduceKV((agg, k, v) => k < 0 ? agg : _.assoc(agg, k, v), _.hashMap(), inPlay_raw);
  const className = card => (
    `${!hasSelected ? 'clickable' : ''}${isSel(card) ? 'selected' : ''}${_.get(inPlay, card) ? ' in-play' : ''}`
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
            const down = _.getIn(hands, [player, 'down']);
            const downPiles = _.pipeline(
              _.keys(down),
              _.partial(_.mapcat, (type) => {
                const mkId = (pileId) => (
                  `pile.${type}.${pileId}`
                );
                const typePiles = _.get(down, type);
                return _.map(
                  (pile, pileId) => {
                    const currTypePlays = _.getIn(
                      plays,
                      ['table', player, type],
                      _.pipeline(
                        _.range(getGoal(state)[type]),
                        _.partial(_.map, () => _.vector(_.vector(), _.vector())),
                        _.vec
                      )
                    );
                    const currL = _.getIn(currTypePlays, [pileId, 0], _.vector());
                    const currR = _.getIn(currTypePlays, [pileId, 1], _.vector());
                    const fullPile = _.vec(_.concat(currL, pile, currR));
                    const guid = `pile.${type}.${pileId}`;
                    const renderExtra = (ind) => {
                      if (ind >= _.count(fullPile)) {
                        return null;
                      }
                      const card = _.nth(fullPile, ind);
                      return (
										    <div className="pcard">
											    <img src={toSrc(fromInt(card))} />
                          {renderExtra(ind + 1)}
										    </div>
                      );
                    };
                    const extraWidth = `${35 + 15 * _.count(fullPile)}px`;
										const onPile = (e) => {
											const { clientX } = e;
											const el = document.getElementById(guid);
											if (!el) {
												return;
											}
											e.nativeEvent.ignore = true;
											const { x, width } = el.getBoundingClientRect();
											const orientation = 2 * (clientX - x) > width ? 'RIGHT' : 'LEFT';
											const oId = _.match({
												RIGHT: () => 1,
												LEFT: () => 0,
											})(orientation);
											const curr = _.match({
                        RIGHT: () => currR,
                        LEFT: () => currL,
                      })(orientation);
											if (hasSelected) {
												const getArgs = v => _.match({
													RIGHT: () => [v, _.vector(selectedCard)],
													LEFT: () => [_.vector(selectedCard), v],
												})(orientation);
												const newPile = _.vec(_.concat(...getArgs(fullPile)));
												if (validatePlay(type, newPile)) {
													setPlays(_.assocIn(
														plays,
														['table', player, type],
														_.assocIn(
															currTypePlays,
															[pileId, oId],
															_.vec(_.concat(...getArgs(curr)))
														)
													));
												}
												setSelectedCard(null);
											}
										};

                    return (
											<div
												key={guid}
												id={guid}
												onClick={onPile}
												style={{ width: extraWidth }}
												className="extra-cards"
											>
												{renderExtra(0)}
											</div>
                    );
                  },
                  typePiles,
                  _.range()
                );
              }),
              _.intoArray
            );
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
                {downPiles}
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
							if (!hasSelected) {
								return;
							}
							setPlays(_.assoc(plays, 'discard', selectedCard));
							setSelectedCard(null);
						};
						const onCancel = () => setPlays(_.hashMap());
						const myDiscard = _.get(plays, 'discard');
            const discardSrc = toSrc(fromInt(myDiscard));
            let transform = 'translateY(100%)';
            if (isTurn && hasDrawn) {
              if (!viewTable) {
                transform = 'translateY(0)';
              } else {
                transform = 'translateY(190px)';
              }
            }
            const renderGoal = (type) => (id) => {
              const label = _.match({
                [Goal.Set]: () => 'Set',
                [Goal.Run]: () => 'Run',
              })(type);
              const req = _.match({
                [Goal.Set]: () => 3,
                [Goal.Run]: () => 4,
              })(type);
              const curr = _.getIn(
                plays,
                ['down', type, id],
                _.vec(_.map(() => -1, _.range(req)))
              );
              const hasAny = _.reduce(
                (has, card) => has || card >= 0,
                false,
                curr,
              );
              const isInvalid = hasAny && !validatePlay(type, curr);
              const hasAll = _.reduce(
                (has, card) => has && card >= 0,
                true,
                curr,
              );
              const targets = _.map(
                (targetId) => {
                  const card = _.nth(curr, targetId);
                  const onClick = (e) => {
							      e.nativeEvent.ignore = true;
							      if (!hasSelected) {
                      if (hasSelectedPlay) {
                        setSelectedPlay([]);
                      } else {
                        if (card > -1) {
                          if (targetId === req - 1 && _.count(curr) > req) {
                            const card = _.last(curr);
                            const filtered = _.vec(_.filter(c => c !== card, curr));
                            const unPlay = () => (
                              setPlays(_.assocIn(plays, ['down', type, id], filtered))
                            );
                            setSelectedPlay([card, unPlay]);
                          } else {
                            const unPlay = () => (
                              setPlays(_.assocIn(plays, ['down', type, id, targetId], -1))
                            );
														setSelectedPlay([card, () => unPlay]);
                          }
                        }
                      }
								      return;
							      }
                    if (hasAll) {
                      let concat = false;
                      let args = [curr, _.vector(selectedCard)];
                      if (targetId === 0) {
                        concat = true;
                        args = [_.vector(selectedCard), curr];
                      }
                      if (targetId === req - 1) {
                        concat = true;
                      }
                      if (concat) {
							          setPlays(_.assocIn(
                          plays,
                          ['down', type, id],
                          _.vec(_.concat(...args))
                        ));
							          setSelectedCard(null);
                        return;
                      }
                    }
                    const currTypePiles = _.getIn(
                      plays,
                      ['down', type],
                      _.vec(_.map(() => _.vec(_.map(() => -1, _.range(req))), _.range(goal[type])))
                    );
							      setPlays(_.assocIn(
                      plays,
                      ['down', type],
                      _.assocIn(currTypePiles, [id, targetId], selectedCard)
                    ));
							      setSelectedCard(null);
                  };
                  const needsExtra = targetId === req - 1 && _.count(curr) > req;
                  const extras = _.subvec(curr, req - 1);
                  const renderExtra = (eId) => {
                    if (eId >= _.count(extras)) {
                      return null;
                    }
                    const card = _.nth(extras, eId);
                    const imgClassName = selectedPlay === card ? "selected" : "";
                    return (
										  <div className="pcard">
											  <img
                          className={imgClassName}
                          src={toSrc(fromInt(_.nth(extras, eId)))}
                        />
                        {renderExtra(eId + 1)}
										  </div>
                    );
                  };
                  const extraWidth = `${15 + 15 * _.count(extras)}px`;
                  const imgClassName = selectedPlay === card ? "selected" : "";
                  return needsExtra ? (
										<div style={{ width: extraWidth }} onClick={onClick} key={targetId} className="extra-cards">
                      {renderExtra(0)}
										</div>
                  ) : (
										<div onClick={onClick} key={targetId} className="pcard">
											<img
                        className={imgClassName}
                        src={toSrc(fromInt(card))}
                      />
										</div>
                  );
                },
                _.range(req)
              );
              return (
								<div key={`${type}.${id}`} className="target" >
									<div className="target-plays">
                    {_.intoArray(targets)}
									</div>
									<span className={isInvalid ? 'invalid' : ''} >{label}</span>
                  {hasAny && (
									  <span
                      className="cancel"
                      onClick={() => (
							          setPlays(_.assocIn(plays, ['down', type, id], _.vec(_.map(() => -1, _.range(req)))))
                      )}
                    >
                      ✗
                    </span>
                  )}
								</div>
              );
            };
            const goal = getGoal(state);
            const goals = [
              ..._.intoArray(_.range(goal[Goal.Set])).map(renderGoal(Goal.Set)),
              ..._.intoArray(_.range(goal[Goal.Run])).map(renderGoal(Goal.Run))
            ];
            const play = () => {
              const modGoals = (goals) => _.m({
                [Goal.Set.toString()]: _.get(goals, Goal.Set),
                [Goal.Run.toString()]: _.get(goals, Goal.Run),
              });
              let useDown = !!_.get(plays, 'down');
              const down = _.get(plays, 'down');
	            _.meach(down, (type, piles) => (
		            _.each(piles, (pile) => {
			            useDown = useDown && validatePlay(type, pile);
		            })
	            ));
              const sendPlays = useDown ? _.update(plays, 'down', modGoals) : (
                _.dissoc(plays, 'down')
              );
              postRequest(API.Play(roomId, sendPlays));
            };
            const discard = _.get(plays, 'discard');
            const hasNonDiscard = _.count(inPlay) > 1 || (
              !_.get(inPlay, discard) && _.count(inPlay) === 1
            );
            const needsDown = hasNonDiscard && !amIDown;
            const hasDiscard = !!discard || discard === 0;
            const allInPlay = _.count(inPlay) === _.count(held);
            const discardOK = (!allInPlay && hasDiscard) || (allInPlay && !hasDiscard);
            const hasRawDown = _.count(_.get(plays, 'down')) > 0;
            const hasDown = hasRawDown && _.reduceKV(
              (has, type, piles) => has || _.reduce(
                (has, pile) => has || _.reduce(
                  (has, card) => has || card > -1, has, pile
                ),
                has,
                piles
              ),
              false,
              _.get(plays, 'down')
            );
            const downOK = !needsDown || (
              hasDown && _.reduceKV(
                (ok, type, piles) => ok && (
                  _.reduce(
                    (ok, pile) => ok && validatePlay(type, pile), ok, piles
                  )
                ),
                true,
                _.get(plays, 'down')
              )
            );
            const canPlay = discardOK && downOK;
						return (
							<div
								style={{ transform }}
								className="play-board"
							>
								<div className="play-controls" >
									<button
                    disabled={_.count(inPlay) === 0}
                    onClick={onCancel}
                    className="button is-danger is-small"
                  >
										Cancel
									</button>
									<div className="discard-space">
										<div onClick={onDiscard} className="pcard">
											<img src={discardSrc} />
										</div>
										<span>Discard</span>
									</div>
									<button
                    disabled={!canPlay}
                    onClick={play}
                    className="button is-danger is-small"
                   >
										End Turn
									</button>
								</div>
                {(!amIDown && (
                  <>
								    <div className="play-closer is-size-7" >
									    <div />
									    <div
										    onClick={() => setViewTable(!viewTable)}
									    >
										    View {viewTable ? 'Plays' : 'Table'}
									    </div>
									    <div />
								    </div>
                    {goals}
                  </>
                ))}
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

let lastError = null;
export const App = ({ e_response, postRequest }) => {
  const [error, setError] = useState(null);
  const [state, setState] = useState(null);
	const e_gameState = _.pipeline(
		e_response,
		_.partial(FRP.filter, _.match({
			[API.Response.GameState]: () => true,
			[_.DEFAULT]: () => false
		})),
		_.partial(FRP.fmap, _.g('gameState'))
	);
	const e_error = _.pipeline(
		e_response,
		_.partial(FRP.filter, _.match({
			[API.Response.Error]: () => true,
			[_.DEFAULT]: () => false
		})),
		_.partial(FRP.fmap, _.g('error'))
	);
  useEffect(() => (FRP.consume(setState, e_gameState)), []);
  useEffect(
    () => FRP.consume(
      (e) => {
        setError(e);
        setTimeout(() => setError(null), 5000);
      },
      e_error
    ),
    []
  );
  const CurrScreen = ScreenComponent(state);
  const context = { postRequest, state };
  lastError = error || lastError;
  return (
    <C.Provider value={context} >
      <div className="container content" >
				<CurrScreen />
      </div>
      <div className={`notification is-danger${error ? '' : ' hidden'}`} >
        <button className="delete" onClick={() => setError(null)} />
        {error || lastError}
      </div>
    </C.Provider>
  );
};
