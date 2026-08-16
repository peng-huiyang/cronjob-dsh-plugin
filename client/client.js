window.__ModuleLoader__.load({ id: "cronjob-dsh-plugin", factory: (require) => {


		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/locales.ts
		/** zh/en dictionaries for the cron settings section. */
		const en = {
			nav: "Cron Jobs",
			subtitle: "Machine-level scheduled tasks fired into the dedicated cron session.",
			loading: "Loading…",
			loadFailed: "Failed to load jobs:",
			empty: "No scheduled tasks yet. Create one below.",
			newJob: "New job",
			editJob: "Edit job",
			cancel: "Cancel",
			save: "Save",
			create: "Create",
			name: "Name",
			schedule: "Cron expression",
			scheduleHint: "5/6/7 fields, e.g. 0 9 * * 1-5",
			presets: "Presets",
			presetCustom: "Custom",
			presetDaily9: "Daily 09:00",
			presetHourly: "Every hour",
			presetEvery5: "Every 5 minutes",
			presetWeekdays9: "Mon–Fri 09:00",
			timeZone: "Time zone",
			timeZoneHint: "IANA zone, e.g. Asia/Shanghai",
			prompt: "Task",
			promptHint: "Text delivered to the cron session when the job fires.",
			enabled: "Enabled",
			nextRun: "Next run",
			lastRun: "Last run",
			never: "never",
			fireNow: "Run now",
			delete: "Delete",
			confirmDelete: "Delete this scheduled task?",
			invalidSchedule: "Invalid cron expression or time zone.",
			requiredFields: "Name, cron expression, time zone, and task are all required.",
			busy: "Working…",
			actions: "Actions",
			status: "Status",
			on: "On",
			off: "Off",
			saved: "Saved.",
			deleted: "Deleted.",
			fired: "Triggered — check the cron session."
		};
		const zh = {
			nav: "定时任务",
			subtitle: "机器级定时任务，到点后自动触发到专用「定时任务」会话。",
			loading: "加载中…",
			loadFailed: "加载失败：",
			empty: "还没有定时任务，先创建一个吧。",
			newJob: "新建任务",
			editJob: "编辑任务",
			cancel: "取消",
			save: "保存",
			create: "创建",
			name: "名称",
			schedule: "Cron 表达式",
			scheduleHint: "5/6/7 段，如 0 9 * * 1-5",
			presets: "常用预设",
			presetCustom: "自定义",
			presetDaily9: "每天 09:00",
			presetHourly: "每小时",
			presetEvery5: "每 5 分钟",
			presetWeekdays9: "工作日 09:00",
			timeZone: "时区",
			timeZoneHint: "IANA 时区，如 Asia/Shanghai",
			prompt: "任务内容",
			promptHint: "触发时注入到定时任务会话的任务文本。",
			enabled: "启用",
			nextRun: "下次运行",
			lastRun: "上次运行",
			never: "从未",
			fireNow: "立即触发",
			delete: "删除",
			confirmDelete: "确定删除该定时任务？",
			invalidSchedule: "Cron 表达式或时区无效。",
			requiredFields: "名称、Cron 表达式、时区和任务内容均为必填。",
			busy: "处理中…",
			actions: "操作",
			status: "状态",
			on: "启用",
			off: "停用",
			saved: "已保存。",
			deleted: "已删除。",
			fired: "已触发 —— 请查看定时任务会话。"
		};
		//#endregion
		//#region src/client/api.ts
		async function request(path, init) {
			const response = await fetch(path, {
				cache: "no-store",
				...init
			});
			let payload = null;
			try {
				payload = await response.json();
			} catch {
				payload = null;
			}
			if (!response.ok) {
				const message = payload?.error ?? `HTTP ${response.status}`;
				throw new Error(message);
			}
			return payload;
		}
		function jsonPost(path, body) {
			return request(path, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(body)
			});
		}
		function listJobs() {
			return request("/cronjob/list");
		}
		function createJob(input) {
			return jsonPost("/cronjob/create", input);
		}
		function updateJob(id, patch) {
			return jsonPost("/cronjob/update", {
				id,
				...patch
			});
		}
		function toggleJob(id, enabled) {
			return jsonPost("/cronjob/toggle", {
				id,
				enabled
			});
		}
		function deleteJob(id) {
			return jsonPost("/cronjob/delete", { id });
		}
		function fireJob(id) {
			return jsonPost("/cronjob/fire", { id });
		}
		//#endregion
		//#region node_modules/.pnpm/croner@10.0.1/node_modules/croner/dist/croner.js
		function T(s) {
			return Date.UTC(s.y, s.m - 1, s.d, s.h, s.i, s.s);
		}
		function D(s, e) {
			return s.y === e.y && s.m === e.m && s.d === e.d && s.h === e.h && s.i === e.i && s.s === e.s;
		}
		function A(s, e) {
			let t = new Date(Date.parse(s));
			if (isNaN(t)) throw new Error("Invalid ISO8601 passed to timezone parser.");
			let r = s.substring(9);
			return r.includes("Z") || r.includes("+") || r.includes("-") ? b(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate(), t.getUTCHours(), t.getUTCMinutes(), t.getUTCSeconds(), "Etc/UTC") : b(t.getFullYear(), t.getMonth() + 1, t.getDate(), t.getHours(), t.getMinutes(), t.getSeconds(), e);
		}
		function v(s, e, t) {
			return k(A(s, e), t);
		}
		function k(s, e) {
			let t = new Date(T(s)), r = g(t, s.tz), a = T(s) - T(r), o = new Date(t.getTime() + a), h = g(o, s.tz);
			if (D(h, s)) {
				let u = /* @__PURE__ */ new Date(o.getTime() - 36e5);
				return D(g(u, s.tz), s) ? u : o;
			}
			let l = new Date(o.getTime() + T(s) - T(h));
			if (D(g(l, s.tz), s)) return l;
			if (e) throw new Error("Invalid date passed to fromTZ()");
			return o.getTime() > l.getTime() ? o : l;
		}
		function g(s, e) {
			let t, r;
			try {
				t = new Intl.DateTimeFormat("en-US", {
					timeZone: e,
					year: "numeric",
					month: "numeric",
					day: "numeric",
					hour: "numeric",
					minute: "numeric",
					second: "numeric",
					hour12: !1
				}), r = t.formatToParts(s);
			} catch (i) {
				let a = i instanceof Error ? i.message : String(i);
				throw new RangeError(`toTZ: Invalid timezone '${e}' or date. Please provide a valid IANA timezone (e.g., 'America/New_York', 'Europe/Stockholm'). Original error: ${a}`);
			}
			let n = {
				year: 0,
				month: 0,
				day: 0,
				hour: 0,
				minute: 0,
				second: 0
			};
			for (let i of r) (i.type === "year" || i.type === "month" || i.type === "day" || i.type === "hour" || i.type === "minute" || i.type === "second") && (n[i.type] = parseInt(i.value, 10));
			if (isNaN(n.year) || isNaN(n.month) || isNaN(n.day) || isNaN(n.hour) || isNaN(n.minute) || isNaN(n.second)) throw new Error(`toTZ: Failed to parse all date components from timezone '${e}'. This may indicate an invalid date or timezone configuration. Parsed components: ${JSON.stringify(n)}`);
			return n.hour === 24 && (n.hour = 0), {
				y: n.year,
				m: n.month,
				d: n.day,
				h: n.hour,
				i: n.minute,
				s: n.second,
				tz: e
			};
		}
		function b(s, e, t, r, n, i, a) {
			return {
				y: s,
				m: e,
				d: t,
				h: r,
				i: n,
				s: i,
				tz: a
			};
		}
		var O = [
			1,
			2,
			4,
			8,
			16
		];
		var C = class {
			pattern;
			timezone;
			mode;
			alternativeWeekdays;
			sloppyRanges;
			second;
			minute;
			hour;
			day;
			month;
			dayOfWeek;
			year;
			lastDayOfMonth;
			lastWeekday;
			nearestWeekdays;
			starDOM;
			starDOW;
			starYear;
			useAndLogic;
			constructor(e, t, r) {
				this.pattern = e, this.timezone = t, this.mode = r?.mode ?? "auto", this.alternativeWeekdays = r?.alternativeWeekdays ?? !1, this.sloppyRanges = r?.sloppyRanges ?? !1, this.second = Array(60).fill(0), this.minute = Array(60).fill(0), this.hour = Array(24).fill(0), this.day = Array(31).fill(0), this.month = Array(12).fill(0), this.dayOfWeek = Array(7).fill(0), this.year = Array(1e4).fill(0), this.lastDayOfMonth = !1, this.lastWeekday = !1, this.nearestWeekdays = Array(31).fill(0), this.starDOM = !1, this.starDOW = !1, this.starYear = !1, this.useAndLogic = !1, this.parse();
			}
			parse() {
				if (!(typeof this.pattern == "string" || this.pattern instanceof String)) throw new TypeError("CronPattern: Pattern has to be of type string.");
				this.pattern.indexOf("@") >= 0 && (this.pattern = this.handleNicknames(this.pattern).trim());
				let e = this.pattern.match(/\S+/g) || [""], t = e.length;
				if (e.length < 5 || e.length > 7) throw new TypeError("CronPattern: invalid configuration format ('" + this.pattern + "'), exactly five, six, or seven space separated parts are required.");
				if (this.mode !== "auto") {
					let n;
					switch (this.mode) {
						case "5-part":
							n = 5;
							break;
						case "6-part":
							n = 6;
							break;
						case "7-part":
							n = 7;
							break;
						case "5-or-6-parts":
							n = [5, 6];
							break;
						case "6-or-7-parts":
							n = [6, 7];
							break;
						default: n = 0;
					}
					if (!(Array.isArray(n) ? n.includes(t) : t === n)) {
						let a = Array.isArray(n) ? n.join(" or ") : n.toString();
						throw new TypeError(`CronPattern: mode '${this.mode}' requires exactly ${a} parts, but pattern '${this.pattern}' has ${t} parts.`);
					}
				}
				if (e.length === 5 && e.unshift("0"), e.length === 6 && e.push("*"), e[3].toUpperCase() === "LW" ? (this.lastWeekday = !0, e[3] = "") : e[3].toUpperCase().indexOf("L") >= 0 && (e[3] = e[3].replace(/L/gi, ""), this.lastDayOfMonth = !0), e[3] == "*" && (this.starDOM = !0), e[6] == "*" && (this.starYear = !0), e[4].length >= 3 && (e[4] = this.replaceAlphaMonths(e[4])), e[5].length >= 3 && (e[5] = this.alternativeWeekdays ? this.replaceAlphaDaysQuartz(e[5]) : this.replaceAlphaDays(e[5])), e[5].startsWith("+") && (this.useAndLogic = !0, e[5] = e[5].substring(1), e[5] === "")) throw new TypeError("CronPattern: Day-of-week field cannot be empty after '+' modifier.");
				switch (e[5] == "*" && (this.starDOW = !0), this.pattern.indexOf("?") >= 0 && (e[0] = e[0].replace(/\?/g, "*"), e[1] = e[1].replace(/\?/g, "*"), e[2] = e[2].replace(/\?/g, "*"), e[3] = e[3].replace(/\?/g, "*"), e[4] = e[4].replace(/\?/g, "*"), e[5] = e[5].replace(/\?/g, "*"), e[6] && (e[6] = e[6].replace(/\?/g, "*"))), this.mode) {
					case "5-part":
						e[0] = "0", e[6] = "*";
						break;
					case "6-part":
						e[6] = "*";
						break;
					case "5-or-6-parts": e[6] = "*";
				}
				this.throwAtIllegalCharacters(e), this.partToArray("second", e[0], 0, 1), this.partToArray("minute", e[1], 0, 1), this.partToArray("hour", e[2], 0, 1), this.partToArray("day", e[3], -1, 1), this.partToArray("month", e[4], -1, 1);
				let r = this.alternativeWeekdays ? -1 : 0;
				this.partToArray("dayOfWeek", e[5], r, 63), this.partToArray("year", e[6], 0, 1), !this.alternativeWeekdays && this.dayOfWeek[7] && (this.dayOfWeek[0] = this.dayOfWeek[7]);
			}
			partToArray(e, t, r, n) {
				let i = this[e], a = e === "day" && this.lastDayOfMonth, o = e === "day" && this.lastWeekday;
				if (t === "" && !a && !o) throw new TypeError("CronPattern: configuration entry " + e + " (" + t + ") is empty, check for trailing spaces.");
				if (t === "*") return i.fill(n);
				let h = t.split(",");
				if (h.length > 1) for (let l = 0; l < h.length; l++) this.partToArray(e, h[l], r, n);
				else t.indexOf("-") !== -1 && t.indexOf("/") !== -1 ? this.handleRangeWithStepping(t, e, r, n) : t.indexOf("-") !== -1 ? this.handleRange(t, e, r, n) : t.indexOf("/") !== -1 ? this.handleStepping(t, e, r, n) : t !== "" && this.handleNumber(t, e, r, n);
			}
			throwAtIllegalCharacters(e) {
				for (let t = 0; t < e.length; t++) if ((t === 3 ? /[^/*0-9,\-WwLl]+/ : t === 5 ? /[^/*0-9,\-#Ll]+/ : /[^/*0-9,\-]+/).test(e[t])) throw new TypeError("CronPattern: configuration entry " + t + " (" + e[t] + ") contains illegal characters.");
			}
			handleNumber(e, t, r, n) {
				let i = this.extractNth(e, t), a = e.toUpperCase().includes("W");
				if (t !== "day" && a) throw new TypeError("CronPattern: Nearest weekday modifier (W) only allowed in day-of-month.");
				a && (t = "nearestWeekdays");
				let o = parseInt(i[0], 10) + r;
				if (isNaN(o)) throw new TypeError("CronPattern: " + t + " is not a number: '" + e + "'");
				this.setPart(t, o, i[1] || n);
			}
			setPart(e, t, r) {
				if (!Object.prototype.hasOwnProperty.call(this, e)) throw new TypeError("CronPattern: Invalid part specified: " + e);
				if (e === "dayOfWeek") {
					if (t === 7 && (t = 0), t < 0 || t > 6) throw new RangeError("CronPattern: Invalid value for dayOfWeek: " + t);
					this.setNthWeekdayOfMonth(t, r);
					return;
				}
				if (e === "second" || e === "minute") {
					if (t < 0 || t >= 60) throw new RangeError("CronPattern: Invalid value for " + e + ": " + t);
				} else if (e === "hour") {
					if (t < 0 || t >= 24) throw new RangeError("CronPattern: Invalid value for " + e + ": " + t);
				} else if (e === "day" || e === "nearestWeekdays") {
					if (t < 0 || t >= 31) throw new RangeError("CronPattern: Invalid value for " + e + ": " + t);
				} else if (e === "month") {
					if (t < 0 || t >= 12) throw new RangeError("CronPattern: Invalid value for " + e + ": " + t);
				} else if (e === "year" && (t < 1 || t >= 1e4)) throw new RangeError("CronPattern: Invalid value for " + e + ": " + t + " (supported range: 1-9999)");
				this[e][t] = r;
			}
			validateNotNaN(e, t) {
				if (isNaN(e)) throw new TypeError(t);
			}
			validateRange(e, t, r, n, i) {
				if (e > t) throw new TypeError("CronPattern: From value is larger than to value: '" + i + "'");
				if (r !== void 0) {
					if (r === 0) throw new TypeError("CronPattern: Syntax error, illegal stepping: 0");
					if (r > this[n].length) throw new TypeError("CronPattern: Syntax error, steps cannot be greater than maximum value of part (" + this[n].length + ")");
				}
			}
			handleRangeWithStepping(e, t, r, n) {
				if (e.toUpperCase().includes("W")) throw new TypeError("CronPattern: Syntax error, W is not allowed in ranges with stepping.");
				let i = this.extractNth(e, t), a = i[0].match(/^(\d+)-(\d+)\/(\d+)$/);
				if (a === null) throw new TypeError("CronPattern: Syntax error, illegal range with stepping: '" + e + "'");
				let [, o, h, l] = a, y = parseInt(o, 10) + r, u = parseInt(h, 10) + r, d = parseInt(l, 10);
				this.validateNotNaN(y, "CronPattern: Syntax error, illegal lower range (NaN)"), this.validateNotNaN(u, "CronPattern: Syntax error, illegal upper range (NaN)"), this.validateNotNaN(d, "CronPattern: Syntax error, illegal stepping: (NaN)"), this.validateRange(y, u, d, t, e);
				for (let c = y; c <= u; c += d) this.setPart(t, c, i[1] || n);
			}
			extractNth(e, t) {
				let r = e, n;
				if (r.includes("#")) {
					if (t !== "dayOfWeek") throw new Error("CronPattern: nth (#) only allowed in day-of-week field");
					n = r.split("#")[1], r = r.split("#")[0];
				} else if (r.toUpperCase().endsWith("L")) {
					if (t !== "dayOfWeek") throw new Error("CronPattern: L modifier only allowed in day-of-week field (use L alone for day-of-month)");
					n = "L", r = r.slice(0, -1);
				}
				return [r, n];
			}
			handleRange(e, t, r, n) {
				if (e.toUpperCase().includes("W")) throw new TypeError("CronPattern: Syntax error, W is not allowed in a range.");
				let i = this.extractNth(e, t), a = i[0].split("-");
				if (a.length !== 2) throw new TypeError("CronPattern: Syntax error, illegal range: '" + e + "'");
				let o = parseInt(a[0], 10) + r, h = parseInt(a[1], 10) + r;
				this.validateNotNaN(o, "CronPattern: Syntax error, illegal lower range (NaN)"), this.validateNotNaN(h, "CronPattern: Syntax error, illegal upper range (NaN)"), this.validateRange(o, h, void 0, t, e);
				for (let l = o; l <= h; l++) this.setPart(t, l, i[1] || n);
			}
			handleStepping(e, t, r, n) {
				if (e.toUpperCase().includes("W")) throw new TypeError("CronPattern: Syntax error, W is not allowed in parts with stepping.");
				let i = this.extractNth(e, t), a = i[0].split("/");
				if (a.length !== 2) throw new TypeError("CronPattern: Syntax error, illegal stepping: '" + e + "'");
				if (this.sloppyRanges) a[0] === "" && (a[0] = "*");
				else {
					if (a[0] === "") throw new TypeError("CronPattern: Syntax error, stepping with missing prefix ('" + e + "') is not allowed. Use wildcard (*/step) or range (min-max/step) instead.");
					if (a[0] !== "*") throw new TypeError("CronPattern: Syntax error, stepping with numeric prefix ('" + e + "') is not allowed. Use wildcard (*/step) or range (min-max/step) instead.");
				}
				let o = 0;
				a[0] !== "*" && (o = parseInt(a[0], 10) + r);
				let h = parseInt(a[1], 10);
				this.validateNotNaN(h, "CronPattern: Syntax error, illegal stepping: (NaN)"), this.validateRange(0, this[t].length - 1, h, t, e);
				for (let l = o; l < this[t].length; l += h) this.setPart(t, l, i[1] || n);
			}
			replaceAlphaDays(e) {
				return e.replace(/-sun/gi, "-7").replace(/sun/gi, "0").replace(/mon/gi, "1").replace(/tue/gi, "2").replace(/wed/gi, "3").replace(/thu/gi, "4").replace(/fri/gi, "5").replace(/sat/gi, "6");
			}
			replaceAlphaDaysQuartz(e) {
				return e.replace(/sun/gi, "1").replace(/mon/gi, "2").replace(/tue/gi, "3").replace(/wed/gi, "4").replace(/thu/gi, "5").replace(/fri/gi, "6").replace(/sat/gi, "7");
			}
			replaceAlphaMonths(e) {
				return e.replace(/jan/gi, "1").replace(/feb/gi, "2").replace(/mar/gi, "3").replace(/apr/gi, "4").replace(/may/gi, "5").replace(/jun/gi, "6").replace(/jul/gi, "7").replace(/aug/gi, "8").replace(/sep/gi, "9").replace(/oct/gi, "10").replace(/nov/gi, "11").replace(/dec/gi, "12");
			}
			handleNicknames(e) {
				let t = e.trim().toLowerCase();
				if (t === "@yearly" || t === "@annually") return "0 0 1 1 *";
				if (t === "@monthly") return "0 0 1 * *";
				if (t === "@weekly") return "0 0 * * 0";
				if (t === "@daily" || t === "@midnight") return "0 0 * * *";
				if (t === "@hourly") return "0 * * * *";
				if (t === "@reboot") throw new TypeError("CronPattern: @reboot is not supported in this environment. This is an event-based trigger that requires system startup detection.");
				return e;
			}
			setNthWeekdayOfMonth(e, t) {
				if (typeof t != "number" && t.toUpperCase() === "L") this.dayOfWeek[e] = this.dayOfWeek[e] | 32;
				else if (t === 63) this.dayOfWeek[e] = 63;
				else if (t < 6 && t > 0) this.dayOfWeek[e] = this.dayOfWeek[e] | O[t - 1];
				else throw new TypeError(`CronPattern: nth weekday out of range, should be 1-5 or L. Value: ${t}, Type: ${typeof t}`);
			}
		};
		var P = [
			31,
			28,
			31,
			30,
			31,
			30,
			31,
			31,
			30,
			31,
			30,
			31
		];
		var f = [
			[
				"month",
				"year",
				0
			],
			[
				"day",
				"month",
				-1
			],
			[
				"hour",
				"day",
				0
			],
			[
				"minute",
				"hour",
				0
			],
			[
				"second",
				"minute",
				0
			]
		];
		var m = class s {
			tz;
			ms;
			second;
			minute;
			hour;
			day;
			month;
			year;
			constructor(e, t) {
				if (this.tz = t, e && e instanceof Date) if (!isNaN(e)) this.fromDate(e);
				else throw new TypeError("CronDate: Invalid date passed to CronDate constructor");
				else if (e == null) this.fromDate(/* @__PURE__ */ new Date());
				else if (e && typeof e == "string") this.fromString(e);
				else if (e instanceof s) this.fromCronDate(e);
				else throw new TypeError("CronDate: Invalid type (" + typeof e + ") passed to CronDate constructor");
			}
			getLastDayOfMonth(e, t) {
				return t !== 1 ? P[t] : new Date(Date.UTC(e, t + 1, 0)).getUTCDate();
			}
			getLastWeekday(e, t) {
				let r = this.getLastDayOfMonth(e, t), i = new Date(Date.UTC(e, t, r)).getUTCDay();
				return i === 0 ? r - 2 : i === 6 ? r - 1 : r;
			}
			getNearestWeekday(e, t, r) {
				let n = this.getLastDayOfMonth(e, t);
				if (r > n) return -1;
				let a = new Date(Date.UTC(e, t, r)).getUTCDay();
				return a === 0 ? r === n ? r - 2 : r + 1 : a === 6 ? r === 1 ? r + 2 : r - 1 : r;
			}
			isNthWeekdayOfMonth(e, t, r, n) {
				let a = new Date(Date.UTC(e, t, r)).getUTCDay(), o = 0;
				for (let h = 1; h <= r; h++) new Date(Date.UTC(e, t, h)).getUTCDay() === a && o++;
				if (n & 63 && O[o - 1] & n) return !0;
				if (n & 32) {
					let h = this.getLastDayOfMonth(e, t);
					for (let l = r + 1; l <= h; l++) if (new Date(Date.UTC(e, t, l)).getUTCDay() === a) return !1;
					return !0;
				}
				return !1;
			}
			fromDate(e) {
				if (this.tz !== void 0) if (typeof this.tz == "number") this.ms = e.getUTCMilliseconds(), this.second = e.getUTCSeconds(), this.minute = e.getUTCMinutes() + this.tz, this.hour = e.getUTCHours(), this.day = e.getUTCDate(), this.month = e.getUTCMonth(), this.year = e.getUTCFullYear(), this.apply();
				else try {
					let t = g(e, this.tz);
					this.ms = e.getMilliseconds(), this.second = t.s, this.minute = t.i, this.hour = t.h, this.day = t.d, this.month = t.m - 1, this.year = t.y;
				} catch (t) {
					let r = t instanceof Error ? t.message : String(t);
					throw new TypeError(`CronDate: Failed to convert date to timezone '${this.tz}'. This may happen with invalid timezone names or dates. Original error: ${r}`);
				}
				else this.ms = e.getMilliseconds(), this.second = e.getSeconds(), this.minute = e.getMinutes(), this.hour = e.getHours(), this.day = e.getDate(), this.month = e.getMonth(), this.year = e.getFullYear();
			}
			fromCronDate(e) {
				this.tz = e.tz, this.year = e.year, this.month = e.month, this.day = e.day, this.hour = e.hour, this.minute = e.minute, this.second = e.second, this.ms = e.ms;
			}
			apply() {
				if (this.month > 11 || this.month < 0 || this.day > P[this.month] || this.day < 1 || this.hour > 59 || this.minute > 59 || this.second > 59 || this.hour < 0 || this.minute < 0 || this.second < 0) {
					let e = new Date(Date.UTC(this.year, this.month, this.day, this.hour, this.minute, this.second, this.ms));
					return this.ms = e.getUTCMilliseconds(), this.second = e.getUTCSeconds(), this.minute = e.getUTCMinutes(), this.hour = e.getUTCHours(), this.day = e.getUTCDate(), this.month = e.getUTCMonth(), this.year = e.getUTCFullYear(), !0;
				} else return !1;
			}
			fromString(e) {
				if (typeof this.tz == "number") {
					let t = v(e);
					this.ms = t.getUTCMilliseconds(), this.second = t.getUTCSeconds(), this.minute = t.getUTCMinutes(), this.hour = t.getUTCHours(), this.day = t.getUTCDate(), this.month = t.getUTCMonth(), this.year = t.getUTCFullYear(), this.apply();
				} else return this.fromDate(v(e, this.tz));
			}
			findNext(e, t, r, n) {
				return this._findMatch(e, t, r, n, 1);
			}
			_findMatch(e, t, r, n, i) {
				let a = this[t], o;
				r.lastDayOfMonth && (o = this.getLastDayOfMonth(this.year, this.month));
				let h = !r.starDOW && t == "day" ? new Date(Date.UTC(this.year, this.month, 1, 0, 0, 0, 0)).getUTCDay() : void 0, l = this[t] + n, y = i === 1 ? (u) => u < r[t].length : (u) => u >= 0;
				for (let u = l; y(u); u += i) {
					let d = r[t][u];
					if (t === "day" && !d) {
						for (let c = 0; c < r.nearestWeekdays.length; c++) if (r.nearestWeekdays[c]) {
							let M = this.getNearestWeekday(this.year, this.month, c - n);
							if (M === -1) continue;
							if (M === u - n) {
								d = 1;
								break;
							}
						}
					}
					if (t === "day" && r.lastWeekday) {
						let c = this.getLastWeekday(this.year, this.month);
						u - n === c && (d = 1);
					}
					if (t === "day" && r.lastDayOfMonth && u - n == o && (d = 1), t === "day" && !r.starDOW) {
						let c = r.dayOfWeek[(h + (u - n - 1)) % 7];
						if (c && c & 63) c = this.isNthWeekdayOfMonth(this.year, this.month, u - n, c) ? 1 : 0;
						else if (c) throw new Error(`CronDate: Invalid value for dayOfWeek encountered. ${c}`);
						r.useAndLogic ? d = d && c : !e.domAndDow && !r.starDOM ? d = d || c : d = d && c;
					}
					if (d) return this[t] = u - n, a !== this[t] ? 2 : 1;
				}
				return 3;
			}
			recurse(e, t, r) {
				if (r === 0 && !e.starYear) {
					if (this.year >= 0 && this.year < e.year.length && e.year[this.year] === 0) {
						let i = -1;
						for (let a = this.year + 1; a < e.year.length && a < 1e4; a++) if (e.year[a] === 1) {
							i = a;
							break;
						}
						if (i === -1) return null;
						this.year = i, this.month = 0, this.day = 1, this.hour = 0, this.minute = 0, this.second = 0, this.ms = 0;
					}
					if (this.year >= 1e4) return null;
				}
				let n = this.findNext(t, f[r][0], e, f[r][2]);
				if (n > 1) {
					let i = r + 1;
					for (; i < f.length;) this[f[i][0]] = -f[i][2], i++;
					if (n === 3) {
						if (this[f[r][1]]++, this[f[r][0]] = -f[r][2], this.apply(), r === 0 && !e.starYear) {
							for (; this.year >= 0 && this.year < e.year.length && e.year[this.year] === 0 && this.year < 1e4;) this.year++;
							if (this.year >= 1e4 || this.year >= e.year.length) return null;
						}
						return this.recurse(e, t, 0);
					} else if (this.apply()) return this.recurse(e, t, r - 1);
				}
				return r += 1, r >= f.length ? this : (e.starYear ? this.year >= 3e3 : this.year >= 1e4) ? null : this.recurse(e, t, r);
			}
			increment(e, t, r) {
				return this.second += t.interval !== void 0 && t.interval > 1 && r ? t.interval : 1, this.ms = 0, this.apply(), this.recurse(e, t, 0);
			}
			decrement(e, t) {
				return this.second -= t.interval !== void 0 && t.interval > 1 ? t.interval : 1, this.ms = 0, this.apply(), this.recurseBackward(e, t, 0, 0);
			}
			recurseBackward(e, t, r, n = 0) {
				if (n > 1e4) return null;
				if (r === 0 && !e.starYear) {
					if (this.year >= 0 && this.year < e.year.length && e.year[this.year] === 0) {
						let a = -1;
						for (let o = this.year - 1; o >= 0; o--) if (e.year[o] === 1) {
							a = o;
							break;
						}
						if (a === -1) return null;
						this.year = a, this.month = 11, this.day = 31, this.hour = 23, this.minute = 59, this.second = 59, this.ms = 0;
					}
					if (this.year < 0) return null;
				}
				let i = this.findPrevious(t, f[r][0], e, f[r][2]);
				if (i > 1) {
					let a = r + 1;
					for (; a < f.length;) {
						let o = f[a][0], h = f[a][2], l = this.getMaxPatternValue(o, e, h);
						this[o] = l, a++;
					}
					if (i === 3) {
						if (this[f[r][1]]--, r === 0) {
							let y = this.getLastDayOfMonth(this.year, this.month);
							this.day > y && (this.day = y);
						}
						if (r === 1) if (this.day <= 0) this.day = 1;
						else {
							let y = this.year, u = this.month;
							for (; u < 0;) u += 12, y--;
							for (; u > 11;) u -= 12, y++;
							let d = u !== 1 ? P[u] : new Date(Date.UTC(y, u + 1, 0)).getUTCDate();
							this.day > d && (this.day = d);
						}
						this.apply();
						let o = f[r][0], h = f[r][2], l = this.getMaxPatternValue(o, e, h);
						if (o === "day") {
							let y = this.getLastDayOfMonth(this.year, this.month);
							this[o] = Math.min(l, y);
						} else this[o] = l;
						if (this.apply(), r === 0) {
							let y = f[1][2], u = this.getMaxPatternValue("day", e, y), d = this.getLastDayOfMonth(this.year, this.month), c = Math.min(u, d);
							c !== this.day && (this.day = c, this.hour = this.getMaxPatternValue("hour", e, f[2][2]), this.minute = this.getMaxPatternValue("minute", e, f[3][2]), this.second = this.getMaxPatternValue("second", e, f[4][2]));
						}
						if (r === 0 && !e.starYear) {
							for (; this.year >= 0 && this.year < e.year.length && e.year[this.year] === 0;) this.year--;
							if (this.year < 0) return null;
						}
						return this.recurseBackward(e, t, 0, n + 1);
					} else if (this.apply()) return this.recurseBackward(e, t, r - 1, n + 1);
				}
				return r += 1, r >= f.length ? this : this.year < 0 ? null : this.recurseBackward(e, t, r, n + 1);
			}
			getMaxPatternValue(e, t, r) {
				if (e === "day" && t.lastDayOfMonth) return this.getLastDayOfMonth(this.year, this.month);
				if (e === "day" && !t.starDOW) return this.getLastDayOfMonth(this.year, this.month);
				for (let n = t[e].length - 1; n >= 0; n--) if (t[e][n]) return n - r;
				return t[e].length - 1 - r;
			}
			findPrevious(e, t, r, n) {
				return this._findMatch(e, t, r, n, -1);
			}
			getDate(e) {
				return e || this.tz === void 0 ? new Date(this.year, this.month, this.day, this.hour, this.minute, this.second, this.ms) : typeof this.tz == "number" ? new Date(Date.UTC(this.year, this.month, this.day, this.hour, this.minute - this.tz, this.second, this.ms)) : k(b(this.year, this.month + 1, this.day, this.hour, this.minute, this.second, this.tz), !1);
			}
			getTime() {
				return this.getDate(!1).getTime();
			}
			match(e, t) {
				if (!e.starYear && (this.year < 0 || this.year >= e.year.length || e.year[this.year] === 0)) return !1;
				for (let r = 0; r < f.length; r++) {
					let n = f[r][0], i = f[r][2], a = this[n];
					if (a + i < 0 || a + i >= e[n].length) return !1;
					let o = e[n][a + i];
					if (n === "day") {
						if (!o) {
							for (let h = 0; h < e.nearestWeekdays.length; h++) if (e.nearestWeekdays[h]) {
								let l = this.getNearestWeekday(this.year, this.month, h - i);
								if (l !== -1 && l === a) {
									o = 1;
									break;
								}
							}
						}
						if (e.lastWeekday) a === this.getLastWeekday(this.year, this.month) && (o = 1);
						if (e.lastDayOfMonth) a === this.getLastDayOfMonth(this.year, this.month) && (o = 1);
						if (!e.starDOW) {
							let h = new Date(Date.UTC(this.year, this.month, 1, 0, 0, 0, 0)).getUTCDay(), l = e.dayOfWeek[(h + (a - 1)) % 7];
							l && l & 63 && (l = this.isNthWeekdayOfMonth(this.year, this.month, a, l) ? 1 : 0), e.useAndLogic ? o = o && l : !t.domAndDow && !e.starDOM ? o = o || l : o = o && l;
						}
					}
					if (!o) return !1;
				}
				return !0;
			}
		};
		function R(s) {
			if (s === void 0 && (s = {}), delete s.name, s.legacyMode !== void 0 && s.domAndDow === void 0 ? s.domAndDow = !s.legacyMode : s.domAndDow === void 0 && (s.domAndDow = !1), s.legacyMode = !s.domAndDow, s.paused = s.paused === void 0 ? !1 : s.paused, s.maxRuns = s.maxRuns === void 0 ? 1 / 0 : s.maxRuns, s.catch = s.catch === void 0 ? !1 : s.catch, s.interval = s.interval === void 0 ? 0 : parseInt(s.interval.toString(), 10), s.utcOffset = s.utcOffset === void 0 ? void 0 : parseInt(s.utcOffset.toString(), 10), s.dayOffset = s.dayOffset === void 0 ? 0 : parseInt(s.dayOffset.toString(), 10), s.unref = s.unref === void 0 ? !1 : s.unref, s.mode = s.mode === void 0 ? "auto" : s.mode, s.alternativeWeekdays = s.alternativeWeekdays === void 0 ? !1 : s.alternativeWeekdays, s.sloppyRanges = s.sloppyRanges === void 0 ? !1 : s.sloppyRanges, ![
				"auto",
				"5-part",
				"6-part",
				"7-part",
				"5-or-6-parts",
				"6-or-7-parts"
			].includes(s.mode)) throw new Error("CronOptions: mode must be one of 'auto', '5-part', '6-part', '7-part', '5-or-6-parts', or '6-or-7-parts'.");
			if (s.startAt && (s.startAt = new m(s.startAt, s.timezone)), s.stopAt && (s.stopAt = new m(s.stopAt, s.timezone)), s.interval !== null) {
				if (isNaN(s.interval)) throw new Error("CronOptions: Supplied value for interval is not a number");
				if (s.interval < 0) throw new Error("CronOptions: Supplied value for interval can not be negative");
			}
			if (s.utcOffset !== void 0) {
				if (isNaN(s.utcOffset)) throw new Error("CronOptions: Invalid value passed for utcOffset, should be number representing minutes offset from UTC.");
				if (s.utcOffset < -870 || s.utcOffset > 870) throw new Error("CronOptions: utcOffset out of bounds.");
				if (s.utcOffset !== void 0 && s.timezone) throw new Error("CronOptions: Combining 'utcOffset' with 'timezone' is not allowed.");
			}
			if (s.unref !== !0 && s.unref !== !1) throw new Error("CronOptions: Unref should be either true, false or undefined(false).");
			if (s.dayOffset !== void 0 && s.dayOffset !== 0 && isNaN(s.dayOffset)) throw new Error("CronOptions: Invalid value passed for dayOffset, should be a number representing days to offset.");
			return s;
		}
		function p(s) {
			return Object.prototype.toString.call(s) === "[object Function]" || typeof s == "function" || s instanceof Function;
		}
		function _(s) {
			return p(s);
		}
		function x(s) {
			typeof Deno < "u" && typeof Deno.unrefTimer < "u" ? Deno.unrefTimer(s) : s && typeof s.unref < "u" && s.unref();
		}
		var W = 3e4;
		var w = [];
		var E = class {
			name;
			options;
			_states;
			fn;
			getTz() {
				return this.options.timezone || this.options.utcOffset;
			}
			applyDayOffset(e) {
				if (this.options.dayOffset !== void 0 && this.options.dayOffset !== 0) {
					let t = this.options.dayOffset * 24 * 60 * 60 * 1e3;
					return new Date(e.getTime() + t);
				}
				return e;
			}
			constructor(e, t, r) {
				let n, i;
				if (p(t)) i = t;
				else if (typeof t == "object") n = t;
				else if (t !== void 0) throw new Error("Cron: Invalid argument passed for optionsIn. Should be one of function, or object (options).");
				if (p(r)) i = r;
				else if (typeof r == "object") n = r;
				else if (r !== void 0) throw new Error("Cron: Invalid argument passed for funcIn. Should be one of function, or object (options).");
				if (this.name = n?.name, this.options = R(n), this._states = {
					kill: !1,
					blocking: !1,
					previousRun: void 0,
					currentRun: void 0,
					once: void 0,
					currentTimeout: void 0,
					maxRuns: n ? n.maxRuns : void 0,
					paused: n ? n.paused : !1,
					pattern: new C("* * * * *", void 0, { mode: "auto" })
				}, e && (e instanceof Date || typeof e == "string" && e.indexOf(":") > 0) ? this._states.once = new m(e, this.getTz()) : this._states.pattern = new C(e, this.options.timezone, {
					mode: this.options.mode,
					alternativeWeekdays: this.options.alternativeWeekdays,
					sloppyRanges: this.options.sloppyRanges
				}), this.name) {
					if (w.find((o) => o.name === this.name)) throw new Error("Cron: Tried to initialize new named job '" + this.name + "', but name already taken.");
					w.push(this);
				}
				return i !== void 0 && _(i) && (this.fn = i, this.schedule()), this;
			}
			nextRun(e) {
				let t = this._next(e);
				return t ? this.applyDayOffset(t.getDate(!1)) : null;
			}
			nextRuns(e, t) {
				this._states.maxRuns !== void 0 && e > this._states.maxRuns && (e = this._states.maxRuns);
				let r = t || this._states.currentRun || void 0;
				return this._enumerateRuns(e, r, "next");
			}
			previousRuns(e, t) {
				return this._enumerateRuns(e, t || void 0, "previous");
			}
			_enumerateRuns(e, t, r) {
				let n = [], i = t ? new m(t, this.getTz()) : null, a = r === "next" ? this._next : this._previous;
				for (; e--;) {
					let o = a.call(this, i);
					if (!o) break;
					let h = o.getDate(!1);
					n.push(this.applyDayOffset(h)), i = o;
				}
				return n;
			}
			match(e) {
				if (this._states.once) {
					let r = new m(e, this.getTz());
					r.ms = 0;
					let n = new m(this._states.once, this.getTz());
					return n.ms = 0, r.getTime() === n.getTime();
				}
				let t = new m(e, this.getTz());
				return t.ms = 0, t.match(this._states.pattern, this.options);
			}
			getPattern() {
				if (!this._states.once) return this._states.pattern ? this._states.pattern.pattern : void 0;
			}
			getOnce() {
				return this._states.once ? this._states.once.getDate() : null;
			}
			isRunning() {
				let e = this.nextRun(this._states.currentRun), t = !this._states.paused, r = this.fn !== void 0, n = !this._states.kill;
				return t && r && n && e !== null;
			}
			isStopped() {
				return this._states.kill;
			}
			isBusy() {
				return this._states.blocking;
			}
			currentRun() {
				return this._states.currentRun ? this._states.currentRun.getDate() : null;
			}
			previousRun() {
				return this._states.previousRun ? this._states.previousRun.getDate() : null;
			}
			msToNext(e) {
				let t = this._next(e);
				return t ? e instanceof m || e instanceof Date ? t.getTime() - e.getTime() : t.getTime() - new m(e).getTime() : null;
			}
			stop() {
				this._states.kill = !0, this._states.currentTimeout && clearTimeout(this._states.currentTimeout);
				let e = w.indexOf(this);
				e >= 0 && w.splice(e, 1);
			}
			pause() {
				return this._states.paused = !0, !this._states.kill;
			}
			resume() {
				return this._states.paused = !1, !this._states.kill;
			}
			schedule(e) {
				if (e && this.fn) throw new Error("Cron: It is not allowed to schedule two functions using the same Croner instance.");
				e && (this.fn = e);
				let t = this.msToNext(), r = this.nextRun(this._states.currentRun);
				return t == null || isNaN(t) || r === null ? this : (t > W && (t = W), this._states.currentTimeout = setTimeout(() => this._checkTrigger(r), t), this._states.currentTimeout && this.options.unref && x(this._states.currentTimeout), this);
			}
			async _trigger(e) {
				this._states.blocking = !0, this._states.currentRun = new m(void 0, this.getTz());
				try {
					if (this.options.catch) try {
						this.fn !== void 0 && await this.fn(this, this.options.context);
					} catch (t) {
						if (p(this.options.catch)) try {
							this.options.catch(t, this);
						} catch {}
					}
					else this.fn !== void 0 && await this.fn(this, this.options.context);
				} finally {
					this._states.previousRun = new m(e, this.getTz()), this._states.blocking = !1;
				}
			}
			async trigger() {
				await this._trigger();
			}
			runsLeft() {
				return this._states.maxRuns;
			}
			_checkTrigger(e) {
				let t = /* @__PURE__ */ new Date(), r = !this._states.paused && t.getTime() >= e.getTime(), n = this._states.blocking && this.options.protect;
				r && !n ? (this._states.maxRuns !== void 0 && this._states.maxRuns--, this._trigger()) : r && n && p(this.options.protect) && setTimeout(() => this.options.protect(this), 0), this.schedule();
			}
			_next(e) {
				let t = !!(e || this._states.currentRun), r = !1;
				!e && this.options.startAt && this.options.interval && ([e, t] = this._calculatePreviousRun(e, t), r = !e), e = new m(e, this.getTz()), this.options.startAt && e && e.getTime() < this.options.startAt.getTime() && (e = this.options.startAt);
				let n = this._states.once || new m(e, this.getTz());
				return !r && n !== this._states.once && (n = n.increment(this._states.pattern, this.options, t)), this._states.once && this._states.once.getTime() <= e.getTime() || n === null || this._states.maxRuns !== void 0 && this._states.maxRuns <= 0 || this._states.kill || this.options.stopAt && n.getTime() >= this.options.stopAt.getTime() ? null : n;
			}
			_previous(e) {
				let t = new m(e, this.getTz());
				this.options.stopAt && t.getTime() > this.options.stopAt.getTime() && (t = this.options.stopAt);
				let r = new m(t, this.getTz());
				return this._states.once ? this._states.once.getTime() < t.getTime() ? this._states.once : null : (r = r.decrement(this._states.pattern, this.options), r === null || this.options.startAt && r.getTime() < this.options.startAt.getTime() ? null : r);
			}
			_calculatePreviousRun(e, t) {
				let r = new m(void 0, this.getTz()), n = e;
				if (this.options.startAt.getTime() <= r.getTime()) {
					n = this.options.startAt;
					let i = n.getTime() + this.options.interval * 1e3;
					for (; i <= r.getTime();) n = new m(n, this.getTz()).increment(this._states.pattern, this.options, !0), i = n.getTime() + this.options.interval * 1e3;
					t = !0;
				}
				return n === null && (n = void 0), [n, t];
			}
		};
		//#endregion
		//#region \0dsh-css:D:\DeskTop\harness-test\cronjob-dsh-plugin\src\client\CronPage.module.css.mjs
		const css = "._5qaa_G_page{flex-direction:column;gap:12px;max-width:720px;padding:8px 0 24px;display:flex}._5qaa_G_subtitle{opacity:.7;margin:0;font-size:13px}._5qaa_G_error{color:#d64545;white-space:pre-wrap;word-break:break-all;font-size:13px}._5qaa_G_notice{color:#2f9e5f;font-size:13px}._5qaa_G_empty{opacity:.6}._5qaa_G_toolbar{gap:8px;display:flex}._5qaa_G_list{flex-direction:column;gap:10px;margin:0;padding:0;list-style:none;display:flex}._5qaa_G_card{border:1px solid var(--dsh-border,#d0d7de);border-radius:8px;flex-direction:column;gap:6px;padding:10px 12px;display:flex}._5qaa_G_cardHeader{justify-content:space-between;align-items:center;gap:8px;display:flex}._5qaa_G_jobName{word-break:break-all;font-weight:600}._5qaa_G_meta{opacity:.75;flex-wrap:wrap;gap:4px 12px;font-size:12px;display:flex}._5qaa_G_meta code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}._5qaa_G_actions{flex-wrap:wrap;gap:8px;display:flex}._5qaa_G_switch{cursor:pointer;align-items:center;gap:6px;font-size:13px;display:inline-flex}._5qaa_G_danger{color:#d64545}._5qaa_G_form{border:1px solid var(--dsh-border,#d0d7de);background:var(--dsh-surface,#f6f8fa);border-radius:8px;flex-direction:column;gap:10px;padding:12px;display:flex}._5qaa_G_formTitle{margin:0;font-size:14px}._5qaa_G_field{flex-direction:column;gap:4px;font-size:13px;display:flex}._5qaa_G_field input,._5qaa_G_field select,._5qaa_G_field textarea{border:1px solid var(--dsh-border,#d0d7de);font:inherit;background:var(--dsh-input-bg,#fff);color:inherit;box-sizing:border-box;border-radius:6px;width:100%;padding:6px 8px}._5qaa_G_checkbox{cursor:pointer;align-items:center;gap:6px;font-size:13px;display:inline-flex}._5qaa_G_formActions{gap:8px;display:flex}._5qaa_G_primary{font-weight:600}._5qaa_G_preview{opacity:.8;margin:0;font-size:12px}";
		const tagId = "cronjob-dsh-plugin/CronPage.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "cronjob-dsh-plugin";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var CronPage_module_css_default = {
			"error": "_5qaa_G_error",
			"primary": "_5qaa_G_primary",
			"formTitle": "_5qaa_G_formTitle",
			"notice": "_5qaa_G_notice",
			"meta": "_5qaa_G_meta",
			"actions": "_5qaa_G_actions",
			"subtitle": "_5qaa_G_subtitle",
			"card": "_5qaa_G_card",
			"jobName": "_5qaa_G_jobName",
			"field": "_5qaa_G_field",
			"checkbox": "_5qaa_G_checkbox",
			"formActions": "_5qaa_G_formActions",
			"danger": "_5qaa_G_danger",
			"preview": "_5qaa_G_preview",
			"page": "_5qaa_G_page",
			"toolbar": "_5qaa_G_toolbar",
			"form": "_5qaa_G_form",
			"list": "_5qaa_G_list",
			"empty": "_5qaa_G_empty",
			"cardHeader": "_5qaa_G_cardHeader",
			"switch": "_5qaa_G_switch"
		};
		//#endregion
		//#region src/client/JobForm.tsx
		/**
		* Create/edit form for one scheduled task. Shows a live next-run preview via
		* croner (bundled into the client artifact), defaults the time zone to the
		* browser's, and submits through the host routes.
		*/
		const PRESETS = [
			{
				key: "presetCustom",
				value: ""
			},
			{
				key: "presetDaily9",
				value: "0 9 * * *"
			},
			{
				key: "presetHourly",
				value: "0 * * * *"
			},
			{
				key: "presetEvery5",
				value: "*/5 * * * *"
			},
			{
				key: "presetWeekdays9",
				value: "0 9 * * 1-5"
			}
		];
		function browserTimeZone() {
			try {
				return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
			} catch {
				return "UTC";
			}
		}
		/** 'ok' | 'invalid' | 'none' | 'future' — the preview verdict. */
		function previewOf(schedule, timeZone) {
			if (schedule.trim() === "" || timeZone.trim() === "") return { kind: "none" };
			try {
				new Intl.DateTimeFormat("en-US", { timeZone });
			} catch {
				return { kind: "invalid" };
			}
			try {
				const next = new E(schedule, { timezone: timeZone }).nextRun();
				if (next === null) return { kind: "none" };
				return {
					kind: "ok",
					at: new Date(next.getTime()).toLocaleString()
				};
			} catch {
				return { kind: "invalid" };
			}
		}
		function JobForm({ t, initial, busy, onSubmit, onCancel }) {
			const [name, setName] = (0, react.useState)(initial?.name ?? "");
			const [schedule, setSchedule] = (0, react.useState)(initial?.schedule ?? "0 9 * * *");
			const [timeZone, setTimeZone] = (0, react.useState)(initial?.timeZone ?? browserTimeZone());
			const [prompt, setPrompt] = (0, react.useState)(initial?.prompt ?? "");
			const [enabled, setEnabled] = (0, react.useState)(initial?.enabled ?? true);
			const [error, setError] = (0, react.useState)(null);
			const preview = (0, react.useMemo)(() => previewOf(schedule, timeZone), [schedule, timeZone]);
			function submit() {
				if (name.trim() === "" || schedule.trim() === "" || timeZone.trim() === "" || prompt.trim() === "") {
					setError(t("requiredFields"));
					return;
				}
				if (preview.kind === "invalid") {
					setError(t("invalidSchedule"));
					return;
				}
				setError(null);
				onSubmit({
					name: name.trim(),
					schedule: schedule.trim(),
					timeZone: timeZone.trim(),
					prompt: prompt.trim(),
					enabled
				});
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: CronPage_module_css_default.form,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
						className: CronPage_module_css_default.formTitle,
						children: initial === null || initial === void 0 ? t("newJob") : t("editJob")
					}),
					error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: CronPage_module_css_default.error,
						children: error
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: CronPage_module_css_default.field,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("name") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							value: name,
							disabled: busy,
							onChange: (event) => setName(event.target.value)
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: CronPage_module_css_default.field,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("presets") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
							disabled: busy,
							defaultValue: "",
							onChange: (event) => {
								const value = event.target.value;
								if (value !== "") setSchedule(value);
							},
							children: PRESETS.map((preset) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: preset.value,
								children: t(preset.key)
							}, preset.key))
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: CronPage_module_css_default.field,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("schedule") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							value: schedule,
							disabled: busy,
							placeholder: t("scheduleHint"),
							onChange: (event) => setSchedule(event.target.value)
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: CronPage_module_css_default.field,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("timeZone") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							value: timeZone,
							disabled: busy,
							placeholder: t("timeZoneHint"),
							onChange: (event) => setTimeZone(event.target.value)
						})]
					}),
					preview.kind === "ok" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: CronPage_module_css_default.preview,
						children: `${t("nextRun")}: ${preview.at}`
					}),
					preview.kind === "invalid" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: CronPage_module_css_default.error,
						children: t("invalidSchedule")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: CronPage_module_css_default.field,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("prompt") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							value: prompt,
							disabled: busy,
							rows: 4,
							placeholder: t("promptHint"),
							onChange: (event) => setPrompt(event.target.value)
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: CronPage_module_css_default.checkbox,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							type: "checkbox",
							checked: enabled,
							disabled: busy,
							onChange: (event) => setEnabled(event.target.checked)
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("enabled") })]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: CronPage_module_css_default.formActions,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: CronPage_module_css_default.primary,
							disabled: busy,
							onClick: submit,
							children: initial === null || initial === void 0 ? t("create") : t("save")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							disabled: busy,
							onClick: onCancel,
							children: t("cancel")
						})]
					})
				]
			});
		}
		//#endregion
		//#region src/client/CronPage.tsx
		/**
		* Cron job management page: lists machine-level scheduled tasks with their
		* next run, enablement, and last-run outcome; creates, edits, toggles,
		* deletes, and fires them through the /cronjob/* host routes.
		*/
		function CronPage({ t }) {
			const [jobs, setJobs] = (0, react.useState)(null);
			const [loadError, setLoadError] = (0, react.useState)(null);
			const [notice, setNotice] = (0, react.useState)(null);
			const [editing, setEditing] = (0, react.useState)(null);
			const [busy, setBusy] = (0, react.useState)(false);
			const refresh = (0, react.useCallback)(async () => {
				try {
					const { jobs: next } = await listJobs();
					setJobs(next);
					setLoadError(null);
				} catch (error) {
					setLoadError(error instanceof Error ? error.message : String(error));
				}
			}, []);
			(0, react.useEffect)(() => {
				refresh();
			}, [refresh]);
			/** Run one mutation, surface errors, and refresh the list on success. */
			async function run(action, okMessage) {
				setBusy(true);
				setNotice(null);
				setLoadError(null);
				try {
					await action();
					setNotice(okMessage);
					await refresh();
					return true;
				} catch (error) {
					setLoadError(error instanceof Error ? error.message : String(error));
					return false;
				} finally {
					setBusy(false);
				}
			}
			const onSubmit = async (input) => {
				if (editing === "new" ? await run(() => createJob(input), t("saved")) : editing !== null ? await run(() => updateJob(editing.id, input), t("saved")) : false) setEditing(null);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: CronPage_module_css_default.page,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: CronPage_module_css_default.subtitle,
						children: t("subtitle")
					}),
					loadError !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: CronPage_module_css_default.error,
						children: loadError
					}),
					notice !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: CronPage_module_css_default.notice,
						children: notice
					}),
					editing !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(JobForm, {
						t,
						initial: editing === "new" ? null : editing,
						busy,
						onSubmit: (input) => void onSubmit(input),
						onCancel: () => setEditing(null)
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: CronPage_module_css_default.toolbar,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: CronPage_module_css_default.primary,
							disabled: busy || editing !== null,
							onClick: () => setEditing("new"),
							children: t("newJob")
						})
					}),
					jobs === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("loading") }) : jobs.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: CronPage_module_css_default.empty,
						children: t("empty")
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
						className: CronPage_module_css_default.list,
						children: jobs.map((job) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
							className: CronPage_module_css_default.card,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: CronPage_module_css_default.cardHeader,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: CronPage_module_css_default.jobName,
										children: job.name
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: CronPage_module_css_default.switch,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											type: "checkbox",
											checked: job.enabled,
											disabled: busy,
											onChange: (event) => void run(() => toggleJob(job.id, event.target.checked), t("saved"))
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: job.enabled ? t("on") : t("off") })]
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: CronPage_module_css_default.meta,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: job.schedule }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: job.timeZone }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: `${t("nextRun")}: ${job.nextRunAt !== null ? new Date(job.nextRunAt).toLocaleString() : t("never")}` }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: `${t("lastRun")}: ${job.lastRunAt !== void 0 ? new Date(job.lastRunAt).toLocaleString() : t("never")}` })
									]
								}),
								job.lastError !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: CronPage_module_css_default.error,
									children: job.lastError
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: CronPage_module_css_default.actions,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											disabled: busy,
											onClick: () => setEditing(job),
											children: t("editJob")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											disabled: busy,
											onClick: () => void run(() => fireJob(job.id), t("fired")),
											children: t("fireNow")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											className: CronPage_module_css_default.danger,
											disabled: busy,
											onClick: () => {
												if (window.confirm(t("confirmDelete"))) run(() => deleteJob(job.id), t("deleted"));
											},
											children: t("delete")
										})
									]
								})
							]
						}, job.id))
					})
				]
			});
		}
		//#endregion
		//#region src/client/index.ts
		/**
		* cronjob-dsh-plugin client: registers a "Cron Jobs" settings section that
		* manages the machine-level scheduled tasks. Built by tsdown into the
		* __ModuleLoader__ factory bundle at client/client.js; the only externals are
		* the loader module table's react entries.
		*/
		const NS = "cronjob";
		const name = "cronjob-dsh-plugin";
		const inject = ["slots", "locale"];
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "cronjob: dictionaries");
			const t = ctx.locale.bind(NS);
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "cronjob",
				order: 50,
				label: () => t("nav"),
				locale: NS,
				inject: () => ({ t })
			}, () => (0, react.createElement)(CronPage, { t })));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map