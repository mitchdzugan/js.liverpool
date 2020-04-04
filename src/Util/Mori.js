import _ from 'mori';
import * as API from 'API';
import {
	Enumify
} from 'enumify';

_.update = (src, k, f) => _.updateIn(src, [k], f);

_.Enum = class Enum extends Enumify {
	constructor(s) {
		super();
		this.s = s;
	}

	toString() {
		return this.s || (
			this.constructor.name + '.' + this.enumKey
		);
	}
};

_.isFunction = (obj) => (
	!!(obj && obj.constructor && obj.call && obj.apply)
);

_.log = (...args) => (
	console.log(...args.map(arg => _.toJs(_.toClj(arg))))
);

_.vec = (it) => (
	_.vector(..._.intoArray(it))
);

_.g = (k) => (coll) => _.get(coll, k);

const hashMapFromVPairs = (vpairs) => _.hashMap(..._.pipeline(
	vpairs,
	_.partial(_.mapcat, (pair) => _.vector(...pair)),
	_.curry(_.intoArray),
));

_.m = (obj) => _.pipeline(
	_.vector(...Object.entries(obj)),
	hashMapFromVPairs
);

class MatchEnum extends _.Enum {
	static Default = new MatchEnum();
	static _ = this.closeEnum();
};

_.DEFAULT = MatchEnum.Default;

_.type = _.g('__type');

_.isMori = _.isCollection;

_.match = (funcs, ...args) => (hm) => {
	let obj = {};
	let type = hm;
	if (_.isMori(hm)) {
		type = _.type(hm);
		if (_.isMori(type)) {
			type = _.toJs(type);
		}
		_.each(_.keys(hm), (key) => {
			if (key === '__type') {
				return;
			}
			obj[key] = _.get(hm, key);
		});
		obj._src = hm;
	} else {
		obj = hm;
	}
	const f = funcs[type] || funcs[_.DEFAULT];
	const newArgs = args.concat([obj]);
	if (_.isFunction(f)) {
		return f(...newArgs);
	}
	const [drill, drillFuncs] = f;
	const drillF = _.isFunction(drill) ? drill : () => _.g(drill)(hm);
	return _.match(drillFuncs, ...newArgs)(drillF(...newArgs));
};

_.mk = (__type, props = {}) => _.m({ ...props, __type });

_.not = (b) => !b;

_.id = _.g('__id');

_.setId = (hm, id) => _.assoc(hm, '__id', id);

_.decode = (s) => _.toClj(JSON.parse(s));

_.encode = (m) => {
	const js = _.toJs(_.toClj(m));
	const walk = (el, path) => {
		if (Array.isArray(el)) {
			el.forEach((next, i) => walk(next, [...path, i]));
		}
		else if ((typeof el === "object" || typeof el === 'function') && (el !== null)) {
			Object.entries(el).forEach(([key, next]) => {
				if (key === '__type') {
					const raw_enum = _.getIn(m, [...path, key]);
					const encoded_enum = Object.keys({ [raw_enum]: 0 })[0];
					el[key] = encoded_enum;
				} else {
					walk(next, [...path, key]);
				}
			});
		}
	};
	walk(js, []);
	return JSON.stringify(js);
};

_.shuffle = (v) => {
	const shuffleArray = (a) => {
		var j, x, i;
		for (i = a.length - 1; i > 0; i--) {
			j = Math.floor(Math.random() * (i + 1));
			x = a[i];
			a[i] = a[j];
			a[j] = x;
		}
		return a;
	};
	return _.pipeline(
		v,
		_.intoArray,
		shuffleArray,
		a => _.vector(...a)
	);
};

_.mkIdLookup = (v) => hashMapFromVPairs(
	_.map((el, id) => [el, id], v, _.range())
);

_.mapValues = (f, hm) => _.reduceKV(
	(agg, key, val) => _.assoc(agg, key, f(val, key)),
	_.hashMap(),
	hm
);

const extremeBy = (comp) => (f, v) => {
	if (_.count(v) === 0) {
		return null;
	}

	return _.reduce(
		(extreme, curr) => comp(f(curr), f(extreme)) ? curr : extreme,
		_.nth(v, 0),
		v
	);
};
_.minBy = extremeBy((a, b) => a < b);
_.maxBy = extremeBy((a, b) => a > b);

_.meach = (m, f) => _.each(m, (arg) => {
	return f(_.nth(arg, 0), _.nth(arg, 1));
});

export default _;
