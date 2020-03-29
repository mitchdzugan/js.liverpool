import _ from 'Util/Mori';
import * as LHM from './LinkedHashMap';

describe('append', () => {
	it('should add to end', () => {
		let lhm = LHM.LinkedHashMap();
		lhm = LHM.append(lhm, 1).lhm;
		lhm = LHM.append(lhm, 2).lhm;
		lhm = LHM.append(lhm, 3).lhm;
		expect(LHM.toVector(lhm)).toMoriEqual([1, 2, 3]);
	});
	it('should support injecting ids', () => {
		let lhm = LHM.LinkedHashMap();
		const addId = (hm, id) => _.assoc(hm, 'id', id);
		lhm = LHM.append(lhm, _.hashMap('base', 'a'), addId).lhm;
		lhm = LHM.append(lhm, _.hashMap('base', 'b'), addId).lhm;
		lhm = LHM.append(lhm, _.hashMap('base', 'c'), addId).lhm;
		expect(LHM.toVector(lhm)).toMoriEqual([
			{ base: 'a', id: 1 },
			{ base: 'b', id: 2 },
			{ base: 'c', id: 3 },
		]);
	});
});

describe('takeWhile', () => {
	it('should add values to a vector into the predicate becomes false', () => {
		let lhm = LHM.LinkedHashMap();
		const addId = (hm, id) => _.assoc(hm, 'id', id);
		lhm = LHM.append(lhm, _.hashMap('base', 'a'), addId).lhm;
		lhm = LHM.append(lhm, _.hashMap('base', 'b'), addId).lhm;
		lhm = LHM.append(lhm, _.hashMap('base', 'c'), addId).lhm;
		lhm = LHM.append(lhm, _.hashMap('base', 'd'), addId).lhm;
		lhm = LHM.append(lhm, _.hashMap('base', 'e'), addId).lhm;
		expect(LHM.takeWhile(lhm, (hm) => _.get(hm, 'base') !== 'd')).toMoriEqual([
			{ base: 'a', id: 1 },
			{ base: 'b', id: 2 },
			{ base: 'c', id: 3 },
		]);
	});
});

describe('insert', () => {
	it('should insert before id', () => {
		let lhm = LHM.LinkedHashMap();
		lhm = LHM.append(lhm, 1).lhm;
		lhm = LHM.append(lhm, 2).lhm;
		const res = LHM.append(lhm, 4);
		lhm = LHM.insert(res.lhm, res.id, 3).lhm;
		expect(LHM.toVector(lhm)).toMoriEqual([1, 2, 3, 4]);
	});
});

describe('remove', () => {
	it('should remove at id', () => {
		let lhm = LHM.LinkedHashMap();
		lhm = LHM.append(lhm, 1).lhm;
		const res = LHM.append(lhm, 2);
		lhm = LHM.append(res.lhm, 3).lhm;
		lhm = LHM.remove(lhm, res.id);
		expect(LHM.toVector(lhm)).toMoriEqual([1, 3]);
	});
});

describe('get', () => {
	it('should retrieve value at id', () => {
		let lhm = LHM.LinkedHashMap();
		lhm = LHM.append(lhm, 1).lhm;
		const res = LHM.append(lhm, 2);
		lhm = LHM.append(res.lhm, 3).lhm;
		expect(LHM.get(lhm, res.id)).toEqual(2);
	});
});

describe('set', () => {
	it('should set value at id', () => {
		let lhm = LHM.LinkedHashMap();
		lhm = LHM.append(lhm, 1).lhm;
		const res = LHM.append(lhm, 2);
		lhm = LHM.append(res.lhm, 3).lhm;
		lhm = LHM.set(lhm, res.id, 47);
		expect(LHM.toVector(lhm)).toMoriEqual([1, 47, 3]);
	});
});


describe('rebuild', () => {
	it('should be able to rebuild LinkedHashMap', () => {
		let lhm1 = LHM.LinkedHashMap();
		const addId = (hm, id) => _.assoc(hm, 'id', id);
		lhm1 = LHM.append_(lhm1, _.hashMap('base', 'a'), addId);
		lhm1 = LHM.append_(lhm1, _.hashMap('base', 'b'), addId);
		lhm1 = LHM.append_(lhm1, _.hashMap('base', 'c'), addId);
		const v = LHM.toVector(lhm1);
		const lhm2 = LHM.rebuild(v, _.g('id'));
		expect(lhm1).toMoriEqual(lhm2);
	});
	it('should be able to rebuild LinkedHashMap when out of order', () => {
		let lhm1 = LHM.LinkedHashMap();
		const addId = (hm, id) => _.assoc(hm, 'id', id);
		lhm1 = LHM.append_(lhm1, _.hashMap('base', 'a'), addId);
		const res = LHM.append(lhm1, _.hashMap('base', 'b'), addId);
		lhm1 = LHM.insert_(res.lhm, res.id, _.hashMap('base', 'c'), addId);
		const v = LHM.toVector(lhm1);
		const lhm2 = LHM.rebuild(v, _.g('id'));
		expect(lhm1).toMoriEqual(lhm2);
	});
});
