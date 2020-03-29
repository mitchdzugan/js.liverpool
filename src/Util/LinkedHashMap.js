import _ from 'Util/Mori';

export const LinkedHashMap = () => _.hashMap(
	'nextInd', 1,
	'hashMap', _.hashMap(),
);

// O(1)
export const isEmpty = (lhm) => !_.get(lhm, 'first');

// O(1)
export const get = (lhm, ind) => (
	_.getIn(lhm, ['hashMap', ind, 'val'])
);

// O(1)
export const set = (lhm, ind, v) => {
	const toSet = _.getIn(lhm, ['hashMap', ind]);
	if (!toSet) {
		return lhm;
	}
	return _.assocIn(lhm, ['hashMap', ind, 'val'], v);
};

// O(1)
const append_unsafe = (lhm, v, id) => {
	if (isEmpty(lhm)) {
		return {
			id,
			lhm: _.pipeline(
				lhm,
				_.curry(_.assocIn, ['hashMap', id], _.hashMap('val', v)),
				_.curry(_.assoc, 'nextInd', id + 1),
				_.curry(_.assoc, 'first', id),
				_.curry(_.assoc, 'last', id),
			)
		};
	}
	const last = _.get(lhm, 'last');
	return {
		id,
		lhm: _.pipeline(
			lhm,
			_.curry(_.assocIn, ['hashMap', last, 'next'], id),
			_.curry(_.assocIn, ['hashMap', id], _.hashMap('val', v, 'prev', last)),
			_.curry(_.assoc, 'nextInd', id + 1),
			_.curry(_.assoc, 'last', id),
		)
	};
};

// O(n)
export const rebuild = (v, getId) => {
	const nextInd = 1 + _.reduce(
		(nextInd, el) => Math.max(nextInd, getId(el)), 0, v
	);
	const lhm = _.reduce(
		(lhm, el) => append_unsafe(lhm, el, getId(el)).lhm, LinkedHashMap(), v
	);
	return _.assoc(lhm, 'nextInd', nextInd);
};

// O(1)
export const append = (lhm, v_raw, addId = _.identity) => {
	const nextInd = _.get(lhm, 'nextInd');
	const v = addId(v_raw, nextInd);
	return append_unsafe(lhm, v, nextInd);
};

// O(1)
export const insert = (lhm, before, v_raw, addId = _.identity) => {
	const toPrepend = _.getIn(lhm, ['hashMap', before]);
	if (!toPrepend) {
		return { lhm };
	}
	const prev = _.get(toPrepend, 'prev');
	const nextInd = _.get(lhm, 'nextInd');
	const v = addId(v_raw, nextInd);
	return {
		id: nextInd,
		lhm: _.pipeline(
			lhm,
			prev ?
				_.curry(_.assocIn, ['hashMap', prev, 'next'], nextInd) :
				_.curry(_.assoc, 'first', nextInd),
			_.curry(_.assocIn, ['hashMap', before, 'prev'], nextInd),
			_.curry(_.assocIn, ['hashMap', nextInd], _.hashMap('val', v, 'prev', prev, 'next', before)),
			_.curry(_.assoc, 'nextInd', nextInd + 1),
		)
	};
};

const getLhm = ({ lhm }) => lhm;

// O(1)
export const insert_ = _.comp(getLhm, insert);

// O(1)
export const append_ = _.comp(getLhm, append);

// O(1)
export const remove = (lhm, ind) => {
	const toRemove = _.getIn(lhm, ['hashMap', ind]);
	if (!toRemove) {
		return lhm;
	}
	const next = _.get(toRemove, 'next');
	const prev = _.get(toRemove, 'prev');
	return _.pipeline(
		lhm,
		prev ?
			_.curry(_.assocIn, ['hashMap', prev, 'next'], next) :
			_.curry(_.assoc, 'first', next),
		next ?
			_.curry(_.assocIn, ['hashMap', next, 'prev'], prev) :
			_.curry(_.assoc, 'last', prev),
		_.curry(_.dissoc, ind),
	);
};

// O(n)
export const takeWhile = (lhm, pred = () => true) => {
	if (isEmpty(lhm)) {
		return _.vector();
	}
	const rec = (node) => {
		const val = _.get(node, 'val');
		const next = _.get(node, 'next');
		if (!pred(val)) {
			return _.list();
		}
		if (!next) {
			return _.list(val);
		}
		return _.conj(rec(_.getIn(lhm, ['hashMap', next])), val);
	};
	const first = _.get(lhm, 'first');
	return _.vec(rec(_.getIn(lhm, ['hashMap', first])));
};

// O(n)
export const toVector = (lhm) => takeWhile(lhm);
