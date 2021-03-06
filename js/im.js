
function isUndefined(v)
{
	if (v == undefined)
		return true;
	return false;
}

function pattnNotBelongsTo(pattn, pattns)
{
	for (var i in pattns) {
		var p = pattns[i];
		if (p == pattn)
			return false;
	}
	return true;
}

function pattnBelongsTo(pattn, pattns)
{
	return !pattnNotBelongsTo(pattn, pattns);
}

function isPartial(later)
{
	return later > 1000;
}

function isCodeACount(c)
{
	return c >= '1' && c <= '5';
}

function StrokeIndex()
{
	this.laterIndex = 0;
	this.partIndex = 0;
}

StrokeIndex.prototype.set = function (l_idx, p_idx)
{
	this.laterIndex = l_idx;
	this.partIndex = p_idx;
}

function isStrokeIndexEqual(si1, si2)
{
	if (si1 == null || si2 == null)
		return false;
	return (si1.laterIndex == si2.laterIndex
		&& si1.partIndex == si2.partIndex);
}

function getNextStrokeIndex(later, now)
{
	var ltr;
	var nxt = new StrokeIndex();

	if (now == null) {
		return null;
	}

	ltr = later[now.laterIndex];
	if (isPartial(ltr)) {
		nxt.laterIndex = now.laterIndex;
		nxt.partIndex = now.partIndex + 1;
		var part = getPartialStrokesByIndex(ltr);
		if (isUndefined(part[nxt.partIndex])) {
			nxt.laterIndex = now.laterIndex + 1;
			nxt.partIndex = 0;
		}
	} else {
		nxt.laterIndex = now.laterIndex + 1;
		nxt.partIndex = 0;
	}
	if (isUndefined(later[nxt.laterIndex])) {
		return null;
	}
	return nxt;
}

function getPartialStrokesByIndex(idx)
{
	return partial_strokes[partial_nv[idx]];
}

function getStrokeByIndex(later, idx)
{
	if (idx == null)
		return null;

	var ltr = later[idx.laterIndex];
	if (isUndefined(ltr)) {
		return null;
	}
	if (isPartial(ltr)) {
		var part = getPartialStrokesByIndex(ltr);
		if (isUndefined(part) || isUndefined(part[idx.partIndex])) {
			return null;
		} else {
			return part[idx.partIndex];
		}
	} else {
		return ltr;
	}
}

function isStrokeEqual(s1, s2)
{
	if (s1 == null || s2 == null)
		return false;
	return s1 == s2;
}

function findStrokeInPartial(part, from, strokes)
{
	var idx = (from < 0 ? 0 : from);
	var len = part.length;
	for (; idx < len; idx++) {
		if (pattnBelongsTo(part[idx], strokes)) {
			return idx;
		}
	}
	return -1;
}

function findScodeInLater(later, si_from, strokes)
{
	var l_idx = si_from.laterIndex;
	var p_idx = si_from.partIndex;
	var later_len = later.length;

	/* search from last l_idx+1 */
	for (; l_idx < later_len; l_idx++) {
		var found = false;
		var ltr = later[l_idx];
		if (isPartial(ltr)) {
			var part = getPartialStrokesByIndex(ltr);
			p_idx = findStrokeInPartial(part, p_idx, strokes);
			if (p_idx != -1) {
				found = true;
			} else {
				p_idx = 0;
			}
		} else {
			/* p_idx = 0; */
			if (pattnBelongsTo(ltr, strokes)) {
				found = true;
			}
		}

		if (found) {
			si_from.set(l_idx, p_idx);
			return true;
		}
	}
	si_from = null;
	return false;
}

function add_repeater(repeaters, later_index, partial_index)
{
	var i = repeaters.length;
	var si = new StrokeIndex();
	si.set(later_index, partial_index);

	repeaters[i] = new Object();
	repeaters[i].pos_start = si;
	repeaters[i].pos_now = si;
}

function getRepeaters(later, si_idx, strokes)
{
	var l_idx = si_idx.laterIndex;
	var p_idx = si_idx.partIndex;
	var later_len = later.length;
	var repeaters = new Array();

	for (; l_idx < later_len; l_idx++) {
		var ltr = later[l_idx];
		if (isPartial(ltr)) {
			var part = getPartialStrokesByIndex(ltr);
			var part_len = part.length;
			for (; p_idx < part_len; p_idx++) {
				if (pattnBelongsTo(part[p_idx], strokes)) {
					add_repeater(repeaters, l_idx, p_idx);
				}
			}
			p_idx = 0;
		} else {
			if (pattnBelongsTo(ltr, strokes)) {
				/* p_idx equals to 0; */
				add_repeater(repeaters, l_idx, p_idx);
			}
		}
	}
	return repeaters;
}

/**
 * return value:
 * 0: go on iterate;
 * 1: iterate end succeeded;
 * -1: iterate end failed;
 */
function getRepeaterStatus(later, si_idx, repeaters, count)
{
	var c = 0;
	var len = repeaters.length;

	if (len < count)
		return -1;

	/* length == 1 */
	if (len == 1 && count == 1) {
		var si = repeaters[0].pos_now;
		si_idx.set(si.laterIndex, si.partIndex);
		return 1;
	}

	/* length > 1 */
	for (var i = 1; i < len; i++) {
		var rprv = repeaters[i-1];
		var rnow = repeaters[i];
		var si_prvnxt = getNextStrokeIndex(later, rprv.pos_now);
		var si_nowstart = rnow.pos_start;
		if (isStrokeIndexEqual(si_prvnxt, si_nowstart)) {
			c++;
			si_idx.set(rnow.pos_now.laterIndex, rnow.pos_now.partIndex);
		} else {
			c = 0;
		}

		if ((c+1) >= count) {
			return 1;
		}
	}
	si_idx = null;
	return 0;
}

function getSameNextRepNumber(later, r_idx, repeaters)
{
	var c = 0;
	var r_this, r_cmp;
	var si_this, si_cmp;
	var s_this, s_cmp;

	r_this = repeaters[r_idx];
	si_this = getNextStrokeIndex(later, r_this.pos_now);
	s_this = getStrokeByIndex(later, si_this);
	if (r_this == null || si_this == null || s_this == null) {
		return c;
	}
	for (var i = 0; i < repeaters.length; i++) {
		if (i == r_idx)
			continue;
		r_cmp = repeaters[i];
		si_cmp = getNextStrokeIndex(later, r_cmp.pos_now);
		s_cmp = getStrokeByIndex(later, si_cmp);
		if (isStrokeEqual(s_this, s_cmp)) {
			c++;
		}
	}
	return c;
}

function setRepeatersNext(later, repeaters)
{
	var rpt;
	var si;
	for (var i in repeaters) {
		rpt = repeaters[i];
		si = getNextStrokeIndex(later, rpt.pos_now);
		rpt.pos_now = si;
	}
}

function iterateRepeaters(later, repeaters, count)
{
	var rfirst, rnxt;
	var si_first, si_nxt;
	var s_first, s_nxt;

	if (repeaters.length <= 1)
		return;

	for (var i = 0; i < repeaters.length; ) {
		var c = getSameNextRepNumber(later, i, repeaters);
		if ((c+1) >= count) {
			i++;
		} else {
			repeaters.splice(i, 1);
		}
	}
	//forward every repeaters
	setRepeatersNext(later, repeaters);
}

function checkForCountScode(later, si_idx, repeaters, count)
{
	var stat = 0;
	while (true) {
		stat = getRepeaterStatus(later, si_idx, repeaters, count);
		if (stat == 1) {
			return true;
		} else if (stat == -1) {
			return false;
		}
		iterateRepeaters(later, repeaters, count);
	}
}

function findCountScodeInLater(later, si_idx, strokes, count)
{
	/* 1. search for all cnow */
	var repeaters = getRepeaters(later, si_idx, strokes);;

	/* 2. check for later strokes */
	var isOk = checkForCountScode(later, si_idx, repeaters, count);

	/* 3. set back l_idx & p_idx */
	if (isOk) {
		return true;
	} else {
		si_idx = null;
		return false;
	}
}

function scodeMatchesLater(later, scode)
{
	var cnow = 0;
	var cprv = 0;
	var scode_len = scode.length;
	var si_idx = new StrokeIndex();

	for (var s_idx = 0; s_idx < scode_len; s_idx++) {
		cprv = cnow;
		cnow = scode.charAt(s_idx).toUpperCase();
		if (isCodeACount(cnow)) {
			continue;
		} else {
			/* strokes is asured to be exist */
			var strokes = stroke_maps[cnow];
			var found = false;

			if (si_idx == null) {
				return false;
			}
			if (isCodeACount(cprv)) {
				/* search for count cnow in later */
				/* it's been asured that
	   				cnow is not a number */
				found = findCountScodeInLater(later, si_idx, strokes, cprv); 
			} else {
				/* search for cnow in later */
				found = findScodeInLater(later, si_idx, strokes);
			}
			if (!found) {
				return false;
			}
			/* search from next stroke next time */
			si_idx = getNextStrokeIndex(later, si_idx);
		}
	}
	return true;
}

function scodeNotInLaterMap(scode)
{
	var cnow = 0;
	var cprv = 0;
	for (var i = scode.length-1; i >= 0; i--) {
		cprv = cnow;
		cnow = scode.charAt(i).toUpperCase();
		if (isCodeACount(cnow)) {
			if (isCodeACount(cprv)) {
				return true;
			} else {
				continue;
			}
		}
		if (isUndefined(stroke_maps[cnow])) {
			return true;
		}
	}
	return false;
}

