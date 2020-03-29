import _ from 'mori';
import {
	Enumify
} from 'enumify';

_.update = (src, k, f) => _.updateIn(src, [k], f);

_.Enum = Enumify;

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

_.m = (obj) => _.hashMap(..._.pipeline(
	_.vector(...Object.entries(obj)),
	_.partial(_.mapcat, (pair) => _.vector(...pair)),
	_.curry(_.intoArray),
));

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

export default _;
