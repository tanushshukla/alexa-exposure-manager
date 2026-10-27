//#region node_modules/@lit/reactive-element/css-tag.js
var e = globalThis, t = e.ShadowRoot && (e.ShadyCSS === void 0 || e.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, n = Symbol(), r = /* @__PURE__ */ new WeakMap(), i = class {
	constructor(e, t, r) {
		if (this._$cssResult$ = !0, r !== n) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
		this.cssText = e, this.t = t;
	}
	get styleSheet() {
		let e = this.o, n = this.t;
		if (t && e === void 0) {
			let t = n !== void 0 && n.length === 1;
			t && (e = r.get(n)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), t && r.set(n, e));
		}
		return e;
	}
	toString() {
		return this.cssText;
	}
}, a = (e) => new i(typeof e == "string" ? e : e + "", void 0, n), o = (e, ...t) => new i(e.length === 1 ? e[0] : t.reduce((t, n, r) => t + ((e) => {
	if (!0 === e._$cssResult$) return e.cssText;
	if (typeof e == "number") return e;
	throw Error("Value passed to 'css' function must be a 'css' function result: " + e + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
})(n) + e[r + 1], e[0]), e, n), s = (n, r) => {
	if (t) n.adoptedStyleSheets = r.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
	else for (let t of r) {
		let r = document.createElement("style"), i = e.litNonce;
		i !== void 0 && r.setAttribute("nonce", i), r.textContent = t.cssText, n.appendChild(r);
	}
}, c = t ? (e) => e : (e) => e instanceof CSSStyleSheet ? ((e) => {
	let t = "";
	for (let n of e.cssRules) t += n.cssText;
	return a(t);
})(e) : e, { is: l, defineProperty: u, getOwnPropertyDescriptor: d, getOwnPropertyNames: ee, getOwnPropertySymbols: te, getPrototypeOf: ne } = Object, f = globalThis, p = f.trustedTypes, re = p ? p.emptyScript : "", ie = f.reactiveElementPolyfillSupport, m = (e, t) => e, h = {
	toAttribute(e, t) {
		switch (t) {
			case Boolean:
				e = e ? re : null;
				break;
			case Object:
			case Array: e = e == null ? e : JSON.stringify(e);
		}
		return e;
	},
	fromAttribute(e, t) {
		let n = e;
		switch (t) {
			case Boolean:
				n = e !== null;
				break;
			case Number:
				n = e === null ? null : Number(e);
				break;
			case Object:
			case Array: try {
				n = JSON.parse(e);
			} catch {
				n = null;
			}
		}
		return n;
	}
}, g = (e, t) => !l(e, t), _ = {
	attribute: !0,
	type: String,
	converter: h,
	reflect: !1,
	useDefault: !1,
	hasChanged: g
};
Symbol.metadata ??= Symbol("metadata"), f.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var v = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ??= []).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = _) {
		if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
			let n = Symbol(), r = this.getPropertyDescriptor(e, n, t);
			r !== void 0 && u(this.prototype, e, r);
		}
	}
	static getPropertyDescriptor(e, t, n) {
		let { get: r, set: i } = d(this.prototype, e) ?? {
			get() {
				return this[t];
			},
			set(e) {
				this[t] = e;
			}
		};
		return {
			get: r,
			set(t) {
				let a = r?.call(this);
				i?.call(this, t), this.requestUpdate(e, a, n);
			},
			configurable: !0,
			enumerable: !0
		};
	}
	static getPropertyOptions(e) {
		return this.elementProperties.get(e) ?? _;
	}
	static _$Ei() {
		if (this.hasOwnProperty(m("elementProperties"))) return;
		let e = ne(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(m("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(m("properties"))) {
			let e = this.properties, t = [...ee(e), ...te(e)];
			for (let n of t) this.createProperty(n, e[n]);
		}
		let e = this[Symbol.metadata];
		if (e !== null) {
			let t = litPropertyMetadata.get(e);
			if (t !== void 0) for (let [e, n] of t) this.elementProperties.set(e, n);
		}
		this._$Eh = /* @__PURE__ */ new Map();
		for (let [e, t] of this.elementProperties) {
			let n = this._$Eu(e, t);
			n !== void 0 && this._$Eh.set(n, e);
		}
		this.elementStyles = this.finalizeStyles(this.styles);
	}
	static finalizeStyles(e) {
		let t = [];
		if (Array.isArray(e)) {
			let n = new Set(e.flat(1 / 0).reverse());
			for (let e of n) t.unshift(c(e));
		} else e !== void 0 && t.push(c(e));
		return t;
	}
	static _$Eu(e, t) {
		let n = t.attribute;
		return !1 === n ? void 0 : typeof n == "string" ? n : typeof e == "string" ? e.toLowerCase() : void 0;
	}
	constructor() {
		super(), this._$Ep = void 0, this.isUpdatePending = !1, this.hasUpdated = !1, this._$Em = null, this._$Ev();
	}
	_$Ev() {
		this._$ES = new Promise((e) => this.enableUpdating = e), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((e) => e(this));
	}
	addController(e) {
		(this._$EO ??= /* @__PURE__ */ new Set()).add(e), this.renderRoot !== void 0 && this.isConnected && e.hostConnected?.();
	}
	removeController(e) {
		this._$EO?.delete(e);
	}
	_$E_() {
		let e = /* @__PURE__ */ new Map(), t = this.constructor.elementProperties;
		for (let n of t.keys()) this.hasOwnProperty(n) && (e.set(n, this[n]), delete this[n]);
		e.size > 0 && (this._$Ep = e);
	}
	createRenderRoot() {
		let e = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
		return s(e, this.constructor.elementStyles), e;
	}
	connectedCallback() {
		this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(!0), this._$EO?.forEach((e) => e.hostConnected?.());
	}
	enableUpdating(e) {}
	disconnectedCallback() {
		this._$EO?.forEach((e) => e.hostDisconnected?.());
	}
	attributeChangedCallback(e, t, n) {
		this._$AK(e, n);
	}
	_$ET(e, t) {
		let n = this.constructor.elementProperties.get(e), r = this.constructor._$Eu(e, n);
		if (r !== void 0 && !0 === n.reflect) {
			let i = (n.converter?.toAttribute === void 0 ? h : n.converter).toAttribute(t, n.type);
			this._$Em = e, i == null ? this.removeAttribute(r) : this.setAttribute(r, i), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			let e = n.getPropertyOptions(r), i = typeof e.converter == "function" ? { fromAttribute: e.converter } : e.converter?.fromAttribute === void 0 ? h : e.converter;
			this._$Em = r;
			let a = i.fromAttribute(t, e.type);
			this[r] = a ?? this._$Ej?.get(r) ?? a, this._$Em = null;
		}
	}
	requestUpdate(e, t, n, r = !1, i) {
		if (e !== void 0) {
			let a = this.constructor;
			if (!1 === r && (i = this[e]), n ??= a.getPropertyOptions(e), !((n.hasChanged ?? g)(i, t) || n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))) return;
			this.C(e, t, n);
		}
		!1 === this.isUpdatePending && (this._$ES = this._$EP());
	}
	C(e, t, { useDefault: n, reflect: r, wrapped: i }, a) {
		n && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(e) && (this._$Ej.set(e, a ?? t ?? this[e]), !0 !== i || a !== void 0) || (this._$AL.has(e) || (this.hasUpdated || n || (t = void 0), this._$AL.set(e, t)), !0 === r && this._$Em !== e && (this._$Eq ??= /* @__PURE__ */ new Set()).add(e));
	}
	async _$EP() {
		this.isUpdatePending = !0;
		try {
			await this._$ES;
		} catch (e) {
			Promise.reject(e);
		}
		let e = this.scheduleUpdate();
		return e != null && await e, !this.isUpdatePending;
	}
	scheduleUpdate() {
		return this.performUpdate();
	}
	performUpdate() {
		if (!this.isUpdatePending) return;
		if (!this.hasUpdated) {
			if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
				for (let [e, t] of this._$Ep) this[e] = t;
				this._$Ep = void 0;
			}
			let e = this.constructor.elementProperties;
			if (e.size > 0) for (let [t, n] of e) {
				let { wrapped: e } = n, r = this[t];
				!0 !== e || this._$AL.has(t) || r === void 0 || this.C(t, void 0, n, r);
			}
		}
		let e = !1, t = this._$AL;
		try {
			e = this.shouldUpdate(t), e ? (this.willUpdate(t), this._$EO?.forEach((e) => e.hostUpdate?.()), this.update(t)) : this._$EM();
		} catch (t) {
			throw e = !1, this._$EM(), t;
		}
		e && this._$AE(t);
	}
	willUpdate(e) {}
	_$AE(e) {
		this._$EO?.forEach((e) => e.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(e)), this.updated(e);
	}
	_$EM() {
		this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = !1;
	}
	get updateComplete() {
		return this.getUpdateComplete();
	}
	getUpdateComplete() {
		return this._$ES;
	}
	shouldUpdate(e) {
		return !0;
	}
	update(e) {
		this._$Eq &&= this._$Eq.forEach((e) => this._$ET(e, this[e])), this._$EM();
	}
	updated(e) {}
	firstUpdated(e) {}
};
v.elementStyles = [], v.shadowRootOptions = { mode: "open" }, v[m("elementProperties")] = /* @__PURE__ */ new Map(), v[m("finalized")] = /* @__PURE__ */ new Map(), ie?.({ ReactiveElement: v }), (f.reactiveElementVersions ??= []).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
var y = globalThis, b = (e) => e, x = y.trustedTypes, S = x ? x.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, C = "$lit$", w = `lit$${Math.random().toFixed(9).slice(2)}$`, T = "?" + w, ae = `<${T}>`, E = document, D = () => E.createComment(""), O = (e) => e === null || typeof e != "object" && typeof e != "function", k = Array.isArray, oe = (e) => k(e) || typeof e?.[Symbol.iterator] == "function", A = "[ 	\n\f\r]", j = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, M = /-->/g, N = />/g, P = RegExp(`>|${A}(?:([^\\s"'>=/]+)(${A}*=${A}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), F = /'/g, I = /"/g, L = /^(?:script|style|textarea|title)$/i, R = ((e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}))(1), z = Symbol.for("lit-noChange"), B = Symbol.for("lit-nothing"), V = /* @__PURE__ */ new WeakMap(), H = E.createTreeWalker(E, 129);
function U(e, t) {
	if (!k(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return S === void 0 ? t : S.createHTML(t);
}
var se = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = j;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === j ? c[1] === "!--" ? o = M : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = P) : (L.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = P) : o = N : o === P ? c[0] === ">" ? (o = i ?? j, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? P : c[3] === "\"" ? I : F) : o === I || o === F ? o = P : o === M || o === N ? o = j : (o = P, i = void 0);
		let d = o === P && e[t + 1].startsWith("/>") ? " " : "";
		a += o === j ? n + ae : l >= 0 ? (r.push(s), n.slice(0, l) + C + n.slice(l) + w + d) : n + w + (l === -2 ? t : d);
	}
	return [U(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, W = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = se(t, n);
		if (this.el = e.createElement(l, r), H.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = H.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(C)) {
					let t = u[o++], n = i.getAttribute(e).split(w), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? ce : r[1] === "?" ? le : r[1] === "@" ? ue : J
					}), i.removeAttribute(e);
				} else e.startsWith(w) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (L.test(i.tagName)) {
					let e = i.textContent.split(w), t = e.length - 1;
					if (t > 0) {
						i.textContent = x ? x.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], D()), H.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], D());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === T) c.push({
					type: 2,
					index: a
				});
				else {
					let e = -1;
					for (; (e = i.data.indexOf(w, e + 1)) !== -1;) c.push({
						type: 7,
						index: a
					}), e += w.length - 1;
				}
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = E.createElement("template");
		return n.innerHTML = e, n;
	}
};
function G(e, t, n = e, r) {
	if (t === z) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = O(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = G(e, i._$AS(e, t.values), i, r)), t;
}
var K = class {
	constructor(e, t) {
		this._$AV = [], this._$AN = void 0, this._$AD = e, this._$AM = t;
	}
	get parentNode() {
		return this._$AM.parentNode;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	u(e) {
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? E).importNode(t, !0);
		H.currentNode = r;
		let i = H.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new q(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new de(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = H.nextNode(), a++);
		}
		return H.currentNode = E, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, q = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = B, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
	}
	get parentNode() {
		let e = this._$AA.parentNode, t = this._$AM;
		return t !== void 0 && e?.nodeType === 11 && (e = t.parentNode), e;
	}
	get startNode() {
		return this._$AA;
	}
	get endNode() {
		return this._$AB;
	}
	_$AI(e, t = this) {
		e = G(this, e, t), O(e) ? e === B || e == null || e === "" ? (this._$AH !== B && this._$AR(), this._$AH = B) : e !== this._$AH && e !== z && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? oe(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== B && O(this._$AH) ? this._$AA.nextSibling.data = e : this.T(E.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = W.createElement(U(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new K(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = V.get(e.strings);
		return t === void 0 && V.set(e.strings, t = new W(e)), t;
	}
	k(t) {
		k(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(D()), this.O(D()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = b(e).nextSibling;
			b(e).remove(), e = t;
		}
	}
	setConnected(e) {
		this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
	}
}, J = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = B, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = B;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = G(this, e, t, 0), a = !O(e) || e !== this._$AH && e !== z, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = G(this, r[n + o], t, o), s === z && (s = this._$AH[o]), a ||= !O(s) || s !== this._$AH[o], s === B ? e = B : e !== B && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === B ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, ce = class extends J {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === B ? void 0 : e;
	}
}, le = class extends J {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== B);
	}
}, ue = class extends J {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = G(this, e, t, 0) ?? B) === z) return;
		let n = this._$AH, r = e === B && n !== B || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== B && (n === B || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, de = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		G(this, e);
	}
}, fe = y.litHtmlPolyfillSupport;
fe?.(W, q), (y.litHtmlVersions ??= []).push("3.3.3");
var pe = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new q(t.insertBefore(D(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, Y = globalThis, X = class extends v {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		let e = super.createRenderRoot();
		return this.renderOptions.renderBefore ??= e.firstChild, e;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = pe(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return z;
	}
};
X._$litElement$ = !0, X.finalized = !0, Y.litElementHydrateSupport?.({ LitElement: X });
var me = Y.litElementPolyfillSupport;
me?.({ LitElement: X }), (Y.litElementVersions ??= []).push("4.2.2");
//#endregion
//#region src/translations.ts
var he = /* @__PURE__ */ "ACTIVITY_TRIGGER.AIR_CONDITIONER.AIR_FRESHENER.AIR_PURIFIER.AUTO_ACCESSORY.CAMERA.CHRISTMAS_TREE.COFFEE_MAKER.COMPUTER.CONTACT_SENSOR.DOOR.DOORBELL.EXTERIOR_BLIND.FAN.GAME_CONSOLE.GARAGE_DOOR.HEADPHONES.HUB.INTERIOR_BLIND.LAPTOP.LIGHT.MICROWAVE.MOBILE_PHONE.MOTION_SENSOR.MUSIC_SYSTEM.NETWORK_HARDWARE.OTHER.OVEN.PHONE.PRINTER.REMOTE.ROUTER.SCENE_TRIGGER.SCREEN.SECURITY_PANEL.SECURITY_SYSTEM.SLOW_COOKER.SMARTLOCK.SMARTPLUG.SPEAKER.STREAMING_DEVICE.SWITCH.TABLET.TEMPERATURE_SENSOR.THERMOSTAT.TV.VACUUM_CLEANER.WATER_HEATER.WEARABLE".split("."), ge = {
	appTitle: "Alexa Exposure Manager",
	loading: "Loading Alexa exposure configuration...",
	loadErrorTitle: "Alexa exposure data could not be loaded",
	retry: "Retry",
	setupEyebrow: "Setup required",
	setupTitle: "One-time Alexa setup required",
	setupBody: "Use these exact includes, then restart Home Assistant.",
	setupConfigurationLabel: "In configuration.yaml:",
	setupConfigurationInclude: "alexa: !include alexa.yaml",
	setupAlexaLabel: "In alexa.yaml:",
	setupSmartHome: "smart_home:",
	setupFilter: "filter: !include alexa_exposure_filter.yaml",
	setupEntityConfig: "entity_config: !include alexa_entity_config.yaml",
	setupSafety: "The manager owns only these two include files. It never writes Alexa credentials or the rest of configuration.yaml.",
	recoveryEyebrow: "Migration ready",
	recoveryTitle: "The managed files now exist",
	recoveryBody: "They are intentionally empty until you import your existing Alexa configuration. Retry does not migrate your existing Alexa configuration. Complete these steps once, in order.",
	recoveryKeepInline: "Keep your current inline filter in alexa.yaml.",
	recoveryPreview: "Select Preview existing Alexa configuration and review the counts.",
	recoveryImport: "Select Import existing Alexa configuration and confirm the migration.",
	recoveryReplace: "Replace the inline filter with the two managed includes shown below.",
	recoveryRestart: "Check configuration and restart Home Assistant.",
	recoveryDiscover: "Ask Alexa to discover devices after Home Assistant returns.",
	emptyTitle: "No entities available",
	emptyBody: "Home Assistant did not return any entities to manage.",
	entitySearchLabel: "Entity search",
	entitySearchPlaceholder: "Search entities, devices, or areas",
	headerEyebrow: "Home Assistant custom panel",
	entitiesTitle: "Alexa exposure",
	entitiesBody: "Choose exactly which Home Assistant entities Alexa can discover.",
	save: "Save changes",
	saving: "Saving...",
	pendingOne: "1 pending change",
	pendingMany: "{count} pending changes",
	entityColumn: "Entity",
	contextColumn: "Device and area",
	statusColumn: "Availability",
	exposureColumn: "Alexa exposure",
	exposed: "Exposed",
	hidden: "Not exposed",
	unsupported: "Unsupported",
	missing: "Missing from Home Assistant",
	available: "Available",
	noDevice: "No device",
	noArea: "No area",
	hideEntity: "Hide {name}",
	exposeEntity: "Expose {name}",
	filteredEmptyTitle: "No matching entities",
	filteredEmptyBody: "Try a different search or visibility filter.",
	restartTitle: "Restart required",
	restartBody: "Restart Home Assistant to apply the saved Alexa configuration.",
	restartButton: "Restart Home Assistant",
	restartLater: "Later",
	discoveryBody: "After Home Assistant is running again, ask: Alexa, discover my devices.",
	saveConflictTitle: "Configuration changed elsewhere",
	saveConflictBody: "Reload the panel before saving again so newer changes are not overwritten.",
	validationTitle: "Some changes need attention",
	saveErrorTitle: "Changes could not be saved",
	addEntities: "Add entities",
	exposeNewLabel: "Expose new entities automatically",
	exposeNewHelp: "Future supported entities will be exposed without changing current staged choices.",
	ruleBasedStrategy: "Rule-based",
	ruleBasedLabel: "Native Alexa filter rules",
	ruleBasedHelp: "Domain and glob rules stay intact. Entity changes are saved only as explicit exceptions.",
	registryDefaultStrategy: "Registry defaults",
	registryDefaultLabel: "Home Assistant default exposure",
	registryDefaultHelp: "Exposure follows each entity's Home Assistant registry settings until an explicit filter strategy is chosen.",
	addDialogTitle: "Add entities to Alexa",
	addDialogBody: "Search entities that are not currently exposed. Unsupported entities stay visible but cannot be selected.",
	addSearchLabel: "Search entities to add",
	addSearchPlaceholder: "Search by entity, device, or area",
	selectEntity: "Select {name}",
	unsupportedCandidate: "Unsupported: {reason}",
	exposeSelected: "Expose selected entities",
	cancel: "Cancel",
	closeDialog: "Close dialog",
	candidateCount: "Showing {shown} of {total} candidates",
	noCandidatesTitle: "No entities to add",
	noCandidatesBody: "No available entities match this search.",
	haNameLabel: "Home Assistant name: {name}",
	deviceLabel: "Device: {device}",
	areaLabel: "Area: {area}",
	exposureStateLabel: "Alexa exposure: {state}",
	selectForBulk: "Select {name} for bulk action",
	selectedCount: "{count} selected",
	exposeSelectedBulk: "Expose selected entities",
	unexposeSelected: "Unexpose selected entities",
	clearSelection: "Clear selection",
	bulkExposeConfirmTitle: "Expose {count} entities?",
	bulkUnexposeConfirmTitle: "Unexpose {count} entities?",
	bulkExposeConfirmBody: "These entities will become discoverable by Alexa after you save and restart Home Assistant.",
	bulkUnexposeConfirmBody: "These entities will stop being discoverable by Alexa after you save and restart Home Assistant.",
	confirmExpose: "Confirm expose",
	confirmUnexpose: "Confirm unexpose",
	removeMissing: "Remove missing entity {name}",
	editMetadata: "Edit Alexa metadata for {name}",
	metadataTitle: "Alexa entity metadata",
	metadataBody: "Customize how this entity appears to Alexa without changing its Home Assistant name.",
	alexaName: "Alexa name",
	alexaNamePlaceholder: "Use the Home Assistant name",
	alexaDescription: "Alexa description",
	alexaDescriptionPlaceholder: "Optional description",
	displayCategoriesLabel: "Display category",
	displayCategoriesHelp: "Home Assistant's Alexa configuration accepts one display category. Leave empty to use the inferred default.",
	inferredCategory: "Inferred category: {category}",
	displayCategory: "Display category {category}",
	noDisplayCategory: "Use inferred category",
	applyMetadata: "Apply Alexa metadata",
	visibilityFilter: "Filter by visibility",
	visibilityAll: "All entities",
	visibilityExposed: "Exposed",
	visibilityHidden: "Not exposed",
	visibilityUnsupported: "Unsupported",
	visibilityMissing: "Missing",
	advancedTools: "Advanced tools",
	advancedBody: "Preview generated YAML, inspect system status, and manage recovery tools.",
	advancedLoading: "Loading advanced data...",
	yamlPreview: "Generated YAML preview",
	filterYaml: "alexa_exposure_filter.yaml",
	entityConfigYaml: "alexa_entity_config.yaml",
	noPreview: "No YAML preview is available.",
	backupsTitle: "Configuration backups",
	backupsBody: "Restore a previously saved manager configuration.",
	noBackups: "No backups are available.",
	restoreBackup: "Restore backup {id}",
	restoreTitle: "Restore backup {id}?",
	restoreBody: "Restoring replaces the saved Alexa include files. Current unsaved changes remain staged until the panel reloads.",
	confirmRestore: "Confirm restore",
	systemStatus: "System status",
	configuredStatus: "Include files configured",
	activeConfigStatus: "Active configuration: {value}",
	savedConfigStatus: "Saved managed files: {value}",
	managedFilesActive: "managed includes loaded in memory",
	legacyConfigActive: "legacy or incomplete configuration loaded in memory",
	activeMatchesSaved: "matches the active configuration",
	activeDiffersSaved: "differs from the active configuration; restart may be required",
	revisionStatus: "Configuration revision: {revision}",
	restartStatus: "Restart required: {value}",
	validationStatusOk: "Last validation: passed at {at}",
	validationStatusFailed: "Last validation: failed at {at} — {error}",
	validationStatusRolledBack: "Last validation: failed at {at}, changes rolled back — {error}",
	validationStatusRollbackFailed: "Last validation: failed at {at} and rollback did not complete — {error}",
	validationStatusNone: "Last validation: none recorded",
	migrationStatus: "Migration: {value}",
	migrationNotStarted: "not started",
	migrationPreviewed: "previewed",
	migrationComplete: "complete",
	yes: "Yes",
	no: "No",
	diagnosticsTitle: "Diagnostics",
	diagnosticsBody: "Run read-only checks for include files, revisions, and Alexa configuration health.",
	runDiagnostics: "Run diagnostics",
	supportExport: "Create support export",
	supportWarningTitle: "Create a support export?",
	supportWarningBody: "The export can contain entity IDs, device and area names, configuration metadata, and diagnostics. Review it before sharing.",
	confirmSupportExport: "Confirm support export",
	supportReady: "Support export is ready.",
	supportFilename: "alexa-exposure-support.json",
	restartConfirmTitle: "Restart Home Assistant now?",
	restartConfirmBody: "Home Assistant will be briefly unavailable. When it is running again, ask: Alexa, discover my devices.",
	confirmRestart: "Confirm restart",
	restartRequested: "Restart requested. Keep this page open and wait for Home Assistant to return.",
	migrationPreview: "Preview existing Alexa configuration",
	migrationBody: "If Alexa is already configured in YAML, preview a safe import into the manager-owned include files.",
	migrationReadyTitle: "Existing Alexa configuration is ready to import",
	migrationReadyBody: "A copy captured before the managed includes became active is still available.",
	migrationMissingTitle: "No previous Alexa configuration was captured",
	migrationMissingSetupBody: "Alexa cannot reconstruct previous YAML rules from its device list. If you had old domain, glob, entity, or metadata rules, restore the old inline filter from a backup and restart Home Assistant. Otherwise, activate the managed includes shown above, restart Home Assistant, then configure exposure in the manager.",
	migrationMissingBody: "Alexa cannot reconstruct previous YAML rules from its device list. If you had old domain, glob, entity, or metadata rules, restore the old inline filter from a backup and restart Home Assistant. Otherwise, activate the managed includes if needed, restart Home Assistant, then configure exposure in the manager.",
	migrationUnavailable: "No existing Alexa configuration is available to import.",
	migrationSummary: "Current evaluation: {exposed} exposed, {hidden} hidden, {unsupported} unsupported, and {missing} missing. The source rules will be copied without flattening.",
	migrationInventory: "Rules found: {includeEntities} entity includes, {includeDomains} domain includes, {includeGlobs} include globs, {excludeEntities} entity excludes, {excludeDomains} domain excludes, {excludeGlobs} exclude globs, and {metadata} metadata entries.",
	migrationSourceSnapshot: "Read from the Alexa configuration captured on {captured}, before the managed include files were activated.",
	migrationSourceLive: "Read from your current Alexa configuration.",
	migrationImport: "Import existing Alexa configuration",
	migrationConfirmTitle: "Import existing Alexa configuration?",
	migrationConfirmBody: "The manager will populate its dedicated include files from the preview. Alexa credentials and unrelated YAML are not changed.",
	migrationPreviewAgain: "Create a new preview before retrying the import.",
	confirmMigration: "Confirm migration",
	validationIssue: "{entity}: {message}",
	readOnlyTitle: "Editing is disabled",
	readOnlyBody: "The managed YAML contains values this panel cannot safely preserve. Resolve these issues in YAML, restart Home Assistant, and reload the panel.",
	registryDefaultTitle: "Choose an explicit filter strategy before editing",
	registryDefaultBody: "This empty Alexa filter follows Home Assistant registry defaults. Converting it implicitly would change current or future exposure, so entity editing remains disabled."
};
function Z(e, t = {}) {
	return Object.entries(t).reduce((e, [t, n]) => e.replaceAll(`{${t}}`, String(n)), ge[e]);
}
//#endregion
//#region src/filter-rules.ts
var Q = [
	["include_entities", "Included entities"],
	["exclude_entities", "Excluded entities"],
	["include_domains", "Included domains"],
	["exclude_domains", "Excluded domains"],
	["include_entity_globs", "Included glob patterns"],
	["exclude_entity_globs", "Excluded glob patterns"]
], $ = class e extends X {
	static properties = {
		hass: { attribute: !1 },
		narrow: { type: Boolean },
		route: { attribute: !1 },
		panel: { attribute: !1 },
		loading: { state: !0 },
		error: { state: !0 },
		status: { state: !0 },
		entitiesResponse: { state: !0 },
		query: { state: !0 },
		staged: { state: !0 },
		saving: { state: !0 },
		saveError: { state: !0 },
		exposeNewEntities: { state: !0 },
		addDialogOpen: { state: !0 },
		addQuery: { state: !0 },
		addSelection: { state: !0 },
		selectedEntities: { state: !0 },
		bulkConfirmOpen: { state: !0 },
		bulkAction: { state: !0 },
		metadataEntityId: { state: !0 },
		metadataDraft: { state: !0 },
		visibility: { state: !0 },
		advancedOpen: { state: !0 },
		advancedLoading: { state: !0 },
		advancedError: { state: !0 },
		previewResponse: { state: !0 },
		backupsResponse: { state: !0 },
		diagnosticsResponse: { state: !0 },
		confirmation: { state: !0 },
		confirmationTarget: { state: !0 },
		operationMessage: { state: !0 },
		migrationPreviewResponse: { state: !0 },
		migrationLoading: { state: !0 },
		migrationError: { state: !0 },
		validationIssues: { state: !0 },
		restartBannerDismissed: { state: !0 },
		candidateWindowStart: { state: !0 },
		section: { state: !0 },
		rulesDraft: { state: !0 },
		draftPreview: { state: !0 },
		previewLoading: { state: !0 },
		reviewOpen: { state: !0 },
		cleanupFindings: { state: !0 },
		cleanupSelection: { state: !0 },
		cleanupBusy: { state: !0 },
		cleanupNotice: { state: !0 }
	};
	baseExposeNewEntities = !1;
	previewFingerprint = "";
	previewSequence = 0;
	cleanupFingerprint = "";
	cleanupChecks = [];
	cleanupMissing = [];
	dialogTrigger;
	loadedConnection;
	static CANDIDATE_WINDOW = 40;
	constructor() {
		super(), this.narrow = !1, this.loading = !0, this.error = "", this.query = "", this.staged = {}, this.saving = !1, this.saveError = "", this.exposeNewEntities = !1, this.addDialogOpen = !1, this.addQuery = "", this.addSelection = [], this.selectedEntities = [], this.bulkConfirmOpen = !1, this.bulkAction = "unexpose", this.visibility = "all", this.advancedOpen = !1, this.advancedLoading = !1, this.advancedError = "", this.operationMessage = "", this.migrationLoading = !1, this.migrationError = "", this.validationIssues = [], this.restartBannerDismissed = !1, this.candidateWindowStart = 0, this.section = "entities", this.previewLoading = !1, this.reviewOpen = !1, this.cleanupSelection = [], this.cleanupBusy = !1, this.cleanupNotice = "";
	}
	updated(e) {
		if ((e.has("staged") || e.has("rulesDraft") || e.has("exposeNewEntities")) && (this.draftPreview = void 0, this.previewFingerprint = "", this.previewSequence++, this.previewLoading = !1, this.previewResponse = void 0), e.has("hass") && this.hass && this.hass.connection !== this.loadedConnection && (this.loadedConnection = this.hass.connection, this.load()), e.has("confirmation") && this.confirmation || e.has("bulkConfirmOpen") && this.bulkConfirmOpen) {
			let e = this.renderRoot.activeElement;
			e instanceof HTMLElement && (this.dialogTrigger = e), queueMicrotask(() => {
				this.renderRoot.querySelector("[role='alertdialog'] footer button:last-child")?.focus();
			});
		}
		if ((e.has("confirmation") && e.get("confirmation") && !this.confirmation || e.has("bulkConfirmOpen") && e.get("bulkConfirmOpen") && !this.bulkConfirmOpen) && queueMicrotask(() => this.dialogTrigger?.focus()), e.has("reviewOpen")) {
			if (this.reviewOpen) {
				let e = this.renderRoot.activeElement;
				e instanceof HTMLElement && (this.dialogTrigger = e), queueMicrotask(() => this.renderRoot.querySelector("[aria-label=\"Back to editing\"]")?.focus());
			} else e.get("reviewOpen") && queueMicrotask(() => this.dialogTrigger?.focus());
		}
		if (this.reviewOpen && (e.has("previewLoading") || e.has("saving"))) {
			let e = this.renderRoot.querySelector(".draft-review"), t = this.renderRoot.activeElement;
			(!e?.contains(t) || t?.matches(":disabled")) && (e?.querySelector("footer button:not(:disabled)") ?? e)?.focus();
		}
	}
	async load() {
		if (this.hass) {
			this.loading = !0, this.error = "";
			try {
				let [e, t] = await Promise.all([this.hass.connection.sendMessagePromise({ type: "alexa_exposure_manager/status" }), this.hass.connection.sendMessagePromise({ type: "alexa_exposure_manager/entities" })]);
				this.status = e ?? {}, this.entitiesResponse = Array.isArray(t) ? { entities: t } : t ?? {}, this.baseExposeNewEntities = this.entitiesResponse.expose_new_entities ?? this.status.expose_new_entities ?? !1, this.exposeNewEntities = this.baseExposeNewEntities;
			} catch (e) {
				this.error = this.errorMessage(e);
			} finally {
				this.loading = !1;
			}
		}
	}
	render() {
		return R`
      <main class=${this.narrow ? "narrow" : ""}>
        ${this.loading ? R`<section class="state" role="status"><div class="spinner"></div>${Z("loading")}</section>` : B}
        ${!this.loading && this.error ? R`<section class="state error" role="alert">
              <h1>${Z("loadErrorTitle")}</h1>
              <p>${this.error}</p>
              <button type="button" @click=${this.load}>${Z("retry")}</button>
            </section>` : B}
        ${!this.loading && !this.error && !this.isConfigured() ? this.renderSetup() : B}
        ${!this.loading && !this.error && this.isConfigured() ? this.renderManager() : B}
        ${this.addDialogOpen ? this.renderAddDialog() : B}
        ${this.bulkConfirmOpen ? this.renderBulkConfirmation() : B}
        ${this.metadataEntityId && this.metadataDraft ? this.renderMetadataDialog() : B}
        ${this.confirmation ? this.renderOperationConfirmation() : B}
        ${this.reviewOpen ? this.renderDraftReview() : B}
      </main>
    `;
	}
	isConfigured() {
		return this.status?.configured ?? this.status?.setup_complete ?? !1;
	}
	get entityCount() {
		return Array.isArray(this.entitiesResponse?.entities) ? this.entitiesResponse.entities.length : 0;
	}
	renderSetup() {
		let e = this.status?.managed_files?.safe_defaults === !0 && this.status?.migration_available === !0;
		return R`
      <section class="setup">
        <span class="eyebrow">${Z(e ? "recoveryEyebrow" : "setupEyebrow")}</span>
        <h1>${Z(e ? "recoveryTitle" : "setupTitle")}</h1>
        <p>${Z(e ? "recoveryBody" : "setupBody")}</p>
        ${e ? R`<ol class="recovery-steps">
              <li>${Z("recoveryKeepInline")}</li>
              <li>${Z("recoveryPreview")}</li>
              <li>${Z("recoveryImport")}</li>
              <li>${Z("recoveryReplace")}</li>
              <li>${Z("recoveryRestart")}</li>
              <li>${Z("recoveryDiscover")}</li>
            </ol>` : B}
        <strong class="setup-label">${Z("setupConfigurationLabel")}</strong>
        <pre><code>${Z("setupConfigurationInclude")}</code></pre>
        <strong class="setup-label">${Z("setupAlexaLabel")}</strong>
        <pre><code>${Z("setupSmartHome")}\n  ${Z("setupFilter")}\n  ${Z("setupEntityConfig")}</code></pre>
        <p class="safety">${Z("setupSafety")}</p>
        ${this.status?.migration_available === !1 ? R`<div class="setup-source-note">
              <strong>${Z("migrationMissingTitle")}</strong>
              <span>${Z("migrationMissingSetupBody")}</span>
            </div>` : B}
        ${this.status?.migration_available === !1 ? B : R`<div class="migration">
              <p>${Z("migrationBody")}</p>
              ${this.renderMigrationActions()}
            </div>`}
      </section>
    `;
	}
	renderMigrationActions() {
		return R`
      <button type="button" aria-label=${Z("migrationPreview")} ?disabled=${this.migrationLoading} @click=${this.previewMigration}>${Z("migrationPreview")}</button>
      ${this.migrationPreviewResponse ? R`<div class="migration-result" role="status">
            <div>
              <span>${this.migrationSummary()}</span>
              <span class="migration-inventory">${this.migrationInventory()}</span>
              <span class="migration-source">${this.migrationSource()}</span>
            </div>
            ${typeof this.migrationPreviewResponse.token == "string" ? R`<button class="secondary" type="button" aria-label=${Z("migrationImport")} @click=${() => {
			this.confirmation = "migration";
		}}>${Z("migrationImport")}</button>` : B}
          </div>` : B}
      ${this.migrationError ? R`<p class="migration-error" role="alert">${this.migrationError}</p>` : B}
    `;
	}
	renderConfiguredMigration() {
		return this.status?.migration_state === "complete" ? B : this.status?.migration_available ? R`<section class="migration-notice">
        <div>
          <strong>${Z("migrationReadyTitle")}</strong>
          <span>${Z("migrationReadyBody")}</span>
        </div>
        ${this.renderMigrationActions()}
      </section>` : R`<section class="migration-notice missing-source">
      <div>
        <strong>${Z("migrationMissingTitle")}</strong>
        <span>${Z("migrationMissingBody")}</span>
      </div>
    </section>`;
	}
	renderManager() {
		let e = this.normalizedEntities, t = this.query.trim().toLocaleLowerCase(), n = e.filter((e) => {
			let n = this.staged[e.entityId]?.exposed ?? e.exposed, r = !t || [
				e.name,
				e.entityId,
				e.deviceName,
				e.areaName
			].join(" ").toLocaleLowerCase().includes(t), i = this.visibility === "all" || this.visibility === "exposed" && n || this.visibility === "hidden" && !n || this.visibility === "unsupported" && !e.supported || this.visibility === "missing" && e.missing;
			return r && i;
		});
		return R`
      <div class="manager" ?inert=${this.reviewOpen}>
        <header class="page-header">
          <div>
            <span class="eyebrow">${Z("headerEyebrow")}</span>
            <h1>${Z("entitiesTitle")}</h1>
            <p>${Z("entitiesBody")}</p>
          </div>
          <div class="save-group">
            ${this.pendingCount ? R`<span class="pending" role="status">${this.pendingCount === 1 ? Z("pendingOne") : Z("pendingMany", { count: this.pendingCount })}</span>` : B}
            <button
              type="button"
              aria-label="Preview changes"
              ?disabled=${this.pendingCount === 0 || this.saving || this.previewLoading || !this.editingEnabled}
              @click=${this.openDraftReview}
            >${this.previewLoading ? "Loading preview…" : "Preview changes"}</button>
          </div>
        </header>

        <nav class="section-nav" aria-label="Exposure manager sections">
          <button class="secondary" type="button" aria-label="Entities" aria-current=${this.section === "entities" ? "page" : B} @click=${() => {
			this.section = "entities";
		}}>Entities</button>
          <button class="secondary" type="button" aria-label="Filter rules" aria-current=${this.section === "rules" ? "page" : B} @click=${this.openRules}>Filter rules</button>
          <button class="secondary" type="button" aria-label="Settings" aria-current=${this.section === "settings" ? "page" : B} @click=${() => {
			this.section = "settings", this.loadAdvanced();
		}}>Settings</button>
          ${this.pendingCount ? R`<button class="text-button" type="button" aria-label="Discard changes" ?disabled=${this.saving} @click=${this.discard}>Discard changes</button>` : B}
        </nav>

        ${this.renderConfiguredMigration()}
        ${this.status?.restart_required ? this.renderRestartBanner() : B}
        ${!this.saving && !this.editingEnabled ? R`<section class="message error" role="alert"><strong>${Z(this.strategy === "registry_default" ? "registryDefaultTitle" : "readOnlyTitle")}</strong><span>${this.strategy === "registry_default" ? Z("registryDefaultBody") : `${Z("readOnlyBody")} ${(this.status?.read_only_reasons ?? []).join(" ")}`}</span></section>` : B}
        ${this.saveError ? R`<section class="message error" role="alert"><strong>${Z("saveErrorTitle")}</strong><span>${this.saveError}</span></section>` : B}
        ${this.validationIssues.length ? R`<section class="message error validation" role="alert"><strong>${Z("validationTitle")}</strong><ul>${this.validationIssues.map((e) => R`<li>${Z("validationIssue", {
			entity: e.entity_id ?? e.field ?? Z("entitiesTitle"),
			message: e.message
		})}</li>`)}</ul></section>` : B}

        ${this.section === "rules" ? this.renderRules() : B}
        ${this.section === "settings" ? this.renderCleanup() : B}
        <section class="workspace" ?hidden=${this.section !== "entities"}>
          <div class="toolbar">
            <label>
              <span class="sr-only">${Z("entitySearchLabel")}</span>
              <input
                type="search"
                aria-label=${Z("entitySearchLabel")}
                placeholder=${Z("entitySearchPlaceholder")}
                .value=${this.query}
                @input=${(e) => {
			this.query = e.currentTarget.value;
		}}
              />
            </label>
            <label class="visibility-filter">
              <span class="sr-only">${Z("visibilityFilter")}</span>
              <select aria-label=${Z("visibilityFilter")} .value=${this.visibility} @change=${(e) => {
			this.visibility = e.currentTarget.value;
		}}>
                <option value="all">${Z("visibilityAll")}</option>
                <option value="exposed">${Z("visibilityExposed")}</option>
                <option value="hidden">${Z("visibilityHidden")}</option>
                <option value="unsupported">${Z("visibilityUnsupported")}</option>
                <option value="missing">${Z("visibilityMissing")}</option>
              </select>
            </label>
            <div class="toolbar-actions">
              ${this.strategy === "registry_default" ? R`<div class="mode-control rule-mode">
                    <span class="strategy-chip">${Z("registryDefaultStrategy")}</span>
                    <span><strong>${Z("registryDefaultLabel")}</strong><small>${Z("registryDefaultHelp")}</small></span>
                  </div>` : this.strategy === "rule_based" ? R`<div class="mode-control rule-mode">
                    <span class="strategy-chip">${Z("ruleBasedStrategy")}</span>
                    <span><strong>${Z("ruleBasedLabel")}</strong><small>${Z("ruleBasedHelp")}</small></span>
                  </div>` : R`<div class="mode-control">
                    <button
                      class="toggle"
                      type="button"
                      role="switch"
                      aria-checked=${String(this.exposeNewEntities)}
                      aria-label=${Z("exposeNewLabel")}
                      ?disabled=${!this.editingEnabled}
                      @click=${() => {
			this.editingEnabled && (this.exposeNewEntities = !this.exposeNewEntities, this.saveError = "");
		}}
                    ><span></span></button>
                    <span><strong>${Z("exposeNewLabel")}</strong><small>${Z("exposeNewHelp")}</small></span>
                  </div>`}
              <button class="secondary" type="button" aria-label=${Z("addEntities")} ?disabled=${!this.editingEnabled} @click=${this.openAddDialog}>
                <ha-icon icon="mdi:plus"></ha-icon>${Z("addEntities")}
              </button>
            </div>
          </div>
          ${this.selectedEntities.length ? R`<div class="bulk-bar">
                <strong>${Z("selectedCount", { count: this.selectedEntities.length })}</strong>
                <button class="secondary" type="button" aria-label=${Z("exposeSelectedBulk")} ?disabled=${!this.editingEnabled} @click=${() => this.openBulkConfirm("expose")}>${Z("exposeSelectedBulk")}</button>
                <button class="danger-secondary" type="button" aria-label=${Z("unexposeSelected")} ?disabled=${!this.editingEnabled} @click=${() => this.openBulkConfirm("unexpose")}>${Z("unexposeSelected")}</button>
                <button class="text-button" type="button" @click=${() => {
			this.selectedEntities = [];
		}}>${Z("clearSelection")}</button>
              </div>` : B}
          ${n.length ? R`
                <div class="entity-table" role="table">
                  <div class="table-head" role="row">
                    <span role="columnheader"></span>
                    <span role="columnheader">${Z("entityColumn")}</span>
                    <span role="columnheader">${Z("contextColumn")}</span>
                    <span role="columnheader">${Z("statusColumn")}</span>
                    <span role="columnheader">${Z("exposureColumn")}</span>
                    <span role="columnheader"></span>
                  </div>
                  ${n.map((e) => this.renderEntity(e))}
                </div>
              ` : R`<div class="empty"><strong>${Z(this.entityCount === 0 ? "emptyTitle" : "filteredEmptyTitle")}</strong><span>${Z(this.entityCount === 0 ? "emptyBody" : "filteredEmptyBody")}</span></div>`}
        </section>
        ${this.section === "rules" ? B : this.renderAdvanced()}
      </div>
    `;
	}
	discard() {
		this.cleanupMissing = [], this.staged = {}, this.rulesDraft = void 0, this.exposeNewEntities = this.baseExposeNewEntities, this.saveError = "", this.validationIssues = [], this.cleanupFindings = void 0, this.cleanupSelection = [], this.cleanupNotice = "";
	}
	async materializeFilter() {
		if (this.saving) return !1;
		if (!this.rulesDraft && this.exposeNewEntities !== this.baseExposeNewEntities && this.hass) {
			let e = this.draftFingerprint();
			try {
				let t = await this.hass.connection.sendMessagePromise(this.previewMessage());
				if (this.saving || e !== this.draftFingerprint()) return !1;
				this.rulesDraft = t.filter ?? {};
			} catch (e) {
				return this.saveError = this.errorMessage(e), !1;
			}
		}
		return !0;
	}
	async openRules() {
		await this.materializeFilter() && (this.section = "rules");
	}
	async checkCleanup(e) {
		if (!this.hass || this.saving || this.status?.read_only) return;
		this.cleanupBusy = !0, this.cleanupNotice = "", this.cleanupFindings = void 0, this.cleanupSelection = [];
		let t = this.draftFingerprint();
		try {
			let n = await this.hass.connection.sendMessagePromise({
				...this.previewMessage(),
				cleanup_checks: e
			});
			if (t !== this.draftFingerprint()) return;
			this.cleanupFindings = n.cleanup_findings ?? [], this.cleanupChecks = e, this.cleanupFingerprint = t;
		} catch (e) {
			this.saveError = this.errorMessage(e);
		} finally {
			this.cleanupBusy = !1;
		}
	}
	async stageCleanup() {
		if (!(!this.hass || this.saving || this.status?.read_only || this.cleanupFingerprint !== this.draftFingerprint())) {
			this.cleanupBusy = !0;
			try {
				let e = await this.hass.connection.sendMessagePromise({
					...this.previewMessage(),
					cleanup_checks: this.cleanupChecks,
					cleanup_selected: this.cleanupSelection
				});
				if (this.saving || this.cleanupFingerprint !== this.draftFingerprint()) return;
				this.rulesDraft = e.filter ?? {};
				let t = e.cleanup_missing ?? [];
				this.cleanupMissing = [.../* @__PURE__ */ new Set([...this.cleanupMissing, ...t])];
				let n = { ...this.staged };
				for (let e of t) n[e] = {
					exposed: !1,
					name: "",
					description: "",
					displayCategories: [],
					remove: !0
				};
				this.staged = n, this.cleanupFindings = void 0, this.cleanupSelection = [], this.cleanupNotice = "Cleanup staged. Preview exposure changes, then Save to commit or Discard to cancel.", await this.updateComplete, await this.previewDraft();
			} catch (e) {
				this.saveError = this.errorMessage(e);
			} finally {
				this.cleanupBusy = !1;
			}
		}
	}
	renderCleanup() {
		let e = this.cleanupFingerprint !== this.draftFingerprint();
		return R`<section class="workspace rules-editor" aria-label="Cleanup">
      <h2>Cleanup</h2>
      <p>Preview safe changes to the managed files only. Devices in Home Assistant and Amazon are never deleted. Select findings to stage them in the shared draft.</p>
      <button type="button" aria-label="Run all cleanup checks" ?disabled=${this.cleanupBusy || this.saving || this.status?.read_only} @click=${() => this.checkCleanup(["duplicates", "missing"])}>Run all cleanup checks</button>
      <button type="button" aria-label="Check duplicate rules" ?disabled=${this.cleanupBusy || this.saving || this.status?.read_only} @click=${() => this.checkCleanup(["duplicates"])}>Check duplicate rules</button>
      <button type="button" aria-label="Check missing references" ?disabled=${this.cleanupBusy || this.saving || this.status?.read_only} @click=${() => this.checkCleanup(["missing"])}>Check missing references</button>
      ${this.cleanupBusy ? R`<p role="status">Checking cleanup…</p>` : B}
      ${this.cleanupNotice ? R`<p role="status">${this.cleanupNotice}</p>` : B}
      ${this.cleanupFindings ? R`
        <p>${this.cleanupFindings.length} findings · ${new Set(this.cleanupFindings.filter((e) => e.kind === "missing" || e.section?.endsWith("_entities")).map((e) => e.value)).size} affected entities (counted once)</p>
        ${e ? R`<p role="status">Draft changed. Run cleanup checks again.</p>` : B}
        ${this.cleanupFindings.length ? R`<ul>${this.cleanupFindings.map((t) => R`<li><label>
          <input type="checkbox" aria-label=${`Select cleanup ${t.id}`} ?disabled=${e || this.cleanupBusy} .checked=${this.cleanupSelection.includes(t.id)} @change=${(e) => {
			this.cleanupSelection = e.currentTarget.checked ? [...this.cleanupSelection, t.id] : this.cleanupSelection.filter((e) => e !== t.id);
		}} /> <code>${t.value}</code> — ${t.kind === "missing" ? "Missing from registry and current states; remove explicit references and metadata" : `${t.section}: ${t.count} extra occurrence(s)`}
        </label></li>`)}</ul>` : R`<p role="status">No cleanup findings.</p>`}
        <button type="button" aria-label="Stage selected cleanup" ?disabled=${this.saving || this.status?.read_only || e || this.cleanupBusy || !this.cleanupSelection.length} @click=${this.stageCleanup}>Stage selected cleanup</button>
      ` : B}
    </section>`;
	}
	draftFingerprint() {
		return JSON.stringify(this.previewMessage());
	}
	async previewDraft() {
		if (!this.hass) return;
		let e = this.draftFingerprint(), t = ++this.previewSequence;
		this.previewLoading = !0, this.draftPreview = void 0, this.previewFingerprint = "", this.saveError = "";
		try {
			let n = await this.hass.connection.sendMessagePromise(this.previewMessage());
			if (t !== this.previewSequence || e !== this.draftFingerprint()) return;
			this.draftPreview = n, this.previewFingerprint = e;
		} catch (e) {
			t === this.previewSequence && (this.saveError = this.errorMessage(e));
		} finally {
			t === this.previewSequence && (this.previewLoading = !1);
		}
	}
	async openDraftReview(e) {
		this.pendingCount && this.editingEnabled && (e?.currentTarget instanceof HTMLElement && (this.dialogTrigger = e.currentTarget), this.reviewOpen = !0, await this.updateComplete, await this.previewDraft());
	}
	closeDraftReview() {
		this.saving || (this.reviewOpen = !1);
	}
	renderDraftReview() {
		let e = this.draftPreview && this.previewFingerprint === this.draftFingerprint(), t = e ? this.draftPreview : void 0, n = t?.impact, r = this.entitiesResponse?.filter ?? {}, i = t?.filter ?? this.rulesDraft ?? r, a = (e, t) => {
			let n = [...t];
			return e.filter((e) => {
				let t = n.indexOf(e);
				return t < 0 || (n.splice(t, 1), !1);
			});
		};
		return R`<div class="dialog-backdrop"><section class="dialog draft-review" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="draft-preview-title"
      @keydown=${(e) => {
			if (e.key === "Escape" && (e.preventDefault(), this.closeDraftReview()), e.key === "Tab") {
				let t = e.currentTarget.querySelectorAll("button:not(:disabled), summary"), n = t[0], r = t[t.length - 1], i = this.renderRoot.activeElement;
				e.shiftKey && i === n ? (e.preventDefault(), r?.focus()) : !e.shiftKey && i === r ? (e.preventDefault(), n?.focus()) : t.length || e.preventDefault();
			}
		}}>
      <header><h2 id="draft-preview-title">Preview changes</h2><p>Review all pending edits across Entities, Filter rules and Settings. Nothing is written until you Save changes.</p></header>
      <div class="review-body" aria-busy=${String(this.previewLoading || this.saving)}>
        ${this.previewLoading ? R`<p role="status">Loading preview…</p>` : B}
        ${this.saveError ? R`<p role="alert">${this.saveError}</p>` : B}
        ${this.validationIssues.length ? R`<div role="alert">${this.validationIssues.map((e) => R`<p>${e.message}</p>`)}</div>` : B}
        ${t ? R`
          <h3>Exposure changes</h3>
          <p>${n?.exposed.length ?? 0} newly exposed · ${n?.hidden.length ?? 0} newly hidden</p>
          <h4>Newly exposed</h4><ul>${(n?.exposed ?? []).map((e) => R`<li><code>${e}</code></li>`)}</ul>
          <h4>Newly hidden</h4><ul>${(n?.hidden ?? []).map((e) => R`<li><code>${e}</code></li>`)}</ul>
          <p>${t.future_behavior}</p>
          <h3>Rule changes</h3>
          ${Q.map(([e, t]) => {
			let n = r[e] ?? [], o = i[e] ?? [];
			if (JSON.stringify(n) === JSON.stringify(o)) return B;
			let s = a(o, n), c = a(n, o);
			return R`<section><h4>${t}</h4>
              ${s.length ? R`<p>Added</p><ul>${s.map((e) => R`<li><code>${e}</code></li>`)}</ul>` : B}
              ${c.length ? R`<p>Removed</p><ul>${c.map((e) => R`<li><code>${e}</code></li>`)}</ul>` : B}
              ${!s.length && !c.length ? R`<p>Rule order changed.</p>` : B}
            </section>`;
		})}
          ${this.exposeNewEntities === this.baseExposeNewEntities ? B : R`<p>Expose new entities automatically: ${this.baseExposeNewEntities ? "On" : "Off"} → ${this.exposeNewEntities ? "On" : "Off"}</p>`}
          ${Object.keys(this.staged).length ? R`<h3>Entity edits and cleanup</h3><ul>${Object.entries(this.staged).map(([e, t]) => {
			let n = this.normalizedEntities.find((t) => t.entityId === e);
			return R`<li><code>${e}</code>
              ${t.remove ? R`<p>Remove explicit references and Alexa metadata${this.cleanupMissing.includes(e) ? " (missing-reference cleanup)" : ""}.</p>` : R`
                ${t.useRules ? R`<p>Use rules: remove individual include/exclude overrides.</p>` : t.exposureChanged || !this.rulesDraft ? R`<p>${t.exposed ? "Explicitly expose" : "Explicitly hide"}.</p>` : B}
                ${t.name === n?.alexaName ? B : R`<p>Alexa name: ${n?.alexaName || "(default)"} → ${t.name || "(default)"}</p>`}
                ${t.description === n?.description ? B : R`<p>Description: ${n?.description || "(none)"} → ${t.description || "(none)"}</p>`}
                ${t.displayCategories.join() === n?.displayCategories.join() ? B : R`<p>Category: ${n?.displayCategories.join() || "(default)"} → ${t.displayCategories.join() || "(default)"}</p>`}
              `}
            </li>`;
		})}</ul>` : B}
          <details><summary>Resulting managed YAML</summary><h4>alexa_exposure_filter.yaml</h4><pre>${t.filter_yaml}</pre><h4>alexa_entity_config.yaml</h4><pre>${t.entity_config_yaml}</pre></details>
        ` : !this.previewLoading && !this.saveError ? R`<p role="status">Preview is out of date. Preview again before saving.</p>` : B}
      </div>
      <footer><button type="button" class="secondary" aria-label="Back to editing" ?disabled=${this.saving} @click=${this.closeDraftReview}>Back to editing</button>
        ${e && !this.previewLoading ? R`<button type="button" aria-label=${Z("save")} ?disabled=${this.saving || !this.editingEnabled} @click=${this.save}>${this.saving ? Z("saving") : Z("save")}</button>` : R`<button type="button" aria-label="Retry preview" ?disabled=${this.previewLoading || this.saving} @click=${this.previewDraft}>Retry preview</button>`}
      </footer>
    </section></div>`;
	}
	renderRules() {
		let e = this.rulesDraft ?? this.entitiesResponse?.filter ?? {}, t = !this.saving && !this.status?.read_only && this.isConfigured();
		return R`<section class="workspace rules-editor" aria-label="Native filter rules">
      <h2>Filter rules</h2>
      <p>Home Assistant native filters. Enter one entity ID, domain, or glob pattern per line. Glob patterns are not regular expressions. Explicit entities, globs and domains use Home Assistant’s native precedence.</p>
      <div class="rules-grid">${Q.map(([n, r]) => R`<label>
        <span>${r}</span>
        <textarea data-filter-key=${n} aria-label=${r} rows="5" spellcheck="false" ?disabled=${!t}
          .value=${(e[n] ?? []).join("\n")}
          @input=${(t) => {
			let r = { ...e }, i = t.currentTarget.value.split("\n").map((e) => e.trim()).filter(Boolean);
			i.length ? r[n] = i : delete r[n], this.rulesDraft = r;
		}}></textarea>
      </label>`)}</div>
      <p>Use Preview changes at the top to review the complete draft before saving.</p>
    </section>`;
	}
	renderEntity(e) {
		let t = this.staged[e.entityId], n = this.draftPreview?.exposure?.[e.entityId] ?? t?.exposed ?? e.exposed, r = Z(n ? "hideEntity" : "exposeEntity", { name: e.name });
		return R`
      <div class=${`entity-row${e.supported ? "" : " unsupported"}${e.missing ? " missing" : ""}`} role="row">
        <div role="cell">
          <input
            class="row-checkbox"
            type="checkbox"
            aria-label=${Z("selectForBulk", { name: e.name })}
            .checked=${this.selectedEntities.includes(e.entityId)}
            @change=${() => this.toggleSelectedEntity(e.entityId)}
          />
        </div>
        <div class="entity-main" role="cell">
          <ha-icon icon=${this.iconFor(e.domain)}></ha-icon>
          <span><strong>${e.name}</strong><code>${e.entityId}</code></span>
        </div>
        <div class="context" role="cell">
          <span>${e.deviceName || Z("noDevice")}</span>
          <small>${e.areaName || Z("noArea")}</small>
        </div>
        <div class="availability" role="cell">
          <span class=${e.missing || !e.supported ? "warning" : "ok"}>
            ${e.missing ? Z("missing") : e.supported ? Z("available") : Z("unsupported")}
          </span>
          ${!e.supported && e.unsupportedReason ? R`<small>${e.unsupportedReason}</small>` : B}
        </div>
        <div class="exposure" role="cell">
          <span class=${n ? "exposed" : "hidden"}>${Z(n ? "exposed" : "hidden")}</span>
          <small>${this.draftPreview?.reasons?.[e.entityId] ?? (this.pendingCount ? "Draft exposure preview required" : e.exposureReason)}</small>
          <button
            class="toggle"
            type="button"
            role="switch"
            aria-checked=${String(n)}
            aria-label=${r}
            ?disabled=${e.missing || !e.supported || !this.editingEnabled}
            @click=${() => this.stageExposure(e, !n)}
          ><span></span></button>
        </div>
        <div role="cell" class="row-actions">
          ${e.missing ? B : R`<button class="text-button" type="button" aria-label=${`Use rules for ${e.name}`} ?disabled=${this.saving || this.status?.read_only} @click=${() => this.useRules(e)}>Use rules</button>`}
          ${e.missing ? R`<button class="icon" type="button" aria-label=${Z("removeMissing", { name: e.name })} ?disabled=${!this.editingEnabled} @click=${() => this.stageRemove(e)}><ha-icon icon="mdi:delete-outline"></ha-icon></button>` : R`<button class="icon" type="button" aria-label=${Z("editMetadata", { name: e.name })} ?disabled=${!this.editingEnabled} @click=${(t) => this.openMetadataDialog(e, t)}><ha-icon icon="mdi:pencil"></ha-icon></button>`}
        </div>
      </div>
    `;
	}
	async stageRemove(e) {
		this.section = "settings", await this.checkCleanup(["missing"]);
		let t = `missing:${e.entityId}`;
		this.cleanupFindings?.some((e) => e.id === t) && (this.cleanupSelection = [t]);
	}
	async useRules(e) {
		this.editingEnabled && await this.materializeFilter() && this.editingEnabled && (this.rulesDraft = this.rulesDraft ?? structuredClone(this.entitiesResponse?.filter ?? {}), this.staged = {
			...this.staged,
			[e.entityId]: {
				...this.staged[e.entityId] ?? this.draftFrom(e),
				useRules: !0
			}
		}, await this.updateComplete, await this.previewDraft());
	}
	stageExposure(e, t) {
		if (!this.editingEnabled) return;
		let n = {
			...this.staged[e.entityId] ?? this.draftFrom(e),
			exposed: t,
			useRules: !1,
			exposureChanged: !0
		}, r = !this.rulesDraft && n.exposed === e.exposed && n.name === e.alexaName && n.description === e.description && n.displayCategories.join("|") === e.displayCategories.join("|"), i = { ...this.staged };
		r ? delete i[e.entityId] : i[e.entityId] = n, this.staged = i, this.saveError = "", this.validationIssues = [];
	}
	async save() {
		if (this.hass && this.pendingCount && this.editingEnabled) {
			if (!this.reviewOpen || !this.draftPreview || this.previewFingerprint !== this.draftFingerprint()) this.saveError = "Preview required. Review exposure changes before saving filter rules.";
			else {
				this.saving = !0, this.saveError = "";
				try {
					let e = await this.hass.connection.sendMessagePromise(this.configurationMessage("alexa_exposure_manager/save"));
					if (Array.isArray(e.validation_errors) && e.validation_errors.length > 0) {
						this.validationIssues = e.validation_errors;
						return;
					}
					this.staged = {}, this.cleanupMissing = [], this.rulesDraft = void 0, await this.load(), this.status = {
						...this.status,
						...e
					}, this.previewResponse = void 0, this.backupsResponse = void 0, this.reviewOpen = !1;
				} catch (e) {
					let t = this.errorMessage(e), n = this.errorCode(e);
					this.saveError = /conflict|revision/i.test(`${n} ${t}`) ? `${Z("saveConflictTitle")}. ${Z("saveConflictBody")}` : t;
				} finally {
					this.saving = !1;
				}
			}
		}
	}
	renderRestartBanner() {
		return this.restartBannerDismissed ? B : R`
      <section class="restart" role="status">
        <ha-icon icon="mdi:restart-alert"></ha-icon>
        <div><strong>${Z("restartTitle")}</strong><span>${Z("restartBody")} ${Z("discoveryBody")}</span></div>
        <div class="restart-actions">
          <button class="secondary" type="button" aria-label=${Z("restartLater")} @click=${() => {
			this.restartBannerDismissed = !0;
		}}>${Z("restartLater")}</button>
          <button type="button" aria-label=${Z("restartButton")} @click=${() => {
			this.confirmation = "restart";
		}}>${Z("restartButton")}</button>
        </div>
      </section>
    `;
	}
	configurationMessage(e) {
		return {
			type: e,
			expected_revision: this.status?.revision ?? "",
			...this.cleanupMissing.length ? { cleanup_missing: this.cleanupMissing } : {},
			expected_entities_revision: this.entitiesResponse?.entities_revision ?? this.status?.entities_revision ?? "",
			expose_new_entities: this.exposeNewEntities,
			entities: this.entityUpdates(),
			...this.rulesDraft ? { filter_config: this.rulesDraft } : {}
		};
	}
	previewMessage() {
		return {
			type: "alexa_exposure_manager/preview",
			expected_revision: this.status?.revision ?? "",
			expected_entities_revision: this.entitiesResponse?.entities_revision ?? this.status?.entities_revision ?? "",
			expose_new_entities: this.exposeNewEntities,
			entities: this.entityUpdates(),
			...this.rulesDraft ? { filter_config: this.rulesDraft } : {}
		};
	}
	entityUpdates() {
		return Object.entries(this.staged).map(([e, t]) => t.remove ? {
			entity_id: e,
			remove: !0
		} : {
			entity_id: e,
			...t.useRules ? { use_rules: !0 } : t.exposureChanged || !this.rulesDraft ? { exposed: t.exposed } : {},
			name: t.name,
			description: t.description,
			display_categories: t.displayCategories.slice(0, 1)
		});
	}
	get pendingCount() {
		return Object.keys(this.staged).length + +!!this.rulesDraft + (this.strategy === "rule_based" || this.exposeNewEntities === this.baseExposeNewEntities ? 0 : 1);
	}
	get strategy() {
		return this.rulesDraft ? "rule_based" : this.entitiesResponse?.strategy ?? this.status?.strategy ?? (this.exposeNewEntities ? "blocklist" : "allowlist");
	}
	get editingEnabled() {
		return this.saving ? !1 : this.rulesDraft && this.isConfigured() && !this.status?.read_only ? !0 : this.status?.editing_enabled !== !1 && this.status?.read_only !== !0;
	}
	async openAddDialog(e) {
		this.dialogTrigger = e.currentTarget, this.addQuery = "", this.addSelection = [], this.candidateWindowStart = 0, this.addDialogOpen = !0, await this.updateComplete, this.renderRoot.querySelector(`[aria-label="${Z("addSearchLabel")}"]`)?.focus();
	}
	closeAddDialog() {
		this.addDialogOpen = !1, this.addSelection = [], this.candidateWindowStart = 0, this.updateComplete.then(() => this.dialogTrigger?.focus());
	}
	renderAddDialog() {
		let t = this.addQuery.trim().toLocaleLowerCase(), n = this.normalizedEntities.filter((e) => {
			let n = this.staged[e.entityId]?.exposed ?? e.exposed, r = !t || [
				e.name,
				e.entityId,
				e.deviceName,
				e.areaName
			].join(" ").toLocaleLowerCase().includes(t);
			return !n && !e.missing && r;
		}), r = e.CANDIDATE_WINDOW, i = Math.min(this.candidateWindowStart, Math.max(0, n.length - r)), a = n.slice(i, i + r);
		return R`
      <div class="dialog-backdrop" @mousedown=${(e) => {
			e.target === e.currentTarget && this.closeAddDialog();
		}}>
        <section class="dialog" role="dialog" aria-modal="true" aria-labelledby="add-dialog-title" @keydown=${this.dialogKeydown}>
          <header>
            <div><h2 id="add-dialog-title">${Z("addDialogTitle")}</h2><p>${Z("addDialogBody")}</p></div>
            <button class="icon" type="button" aria-label=${Z("closeDialog")} @click=${this.closeAddDialog}><ha-icon icon="mdi:close"></ha-icon></button>
          </header>
          <label class="dialog-search">
            <span class="sr-only">${Z("addSearchLabel")}</span>
            <input
              type="search"
              aria-label=${Z("addSearchLabel")}
              placeholder=${Z("addSearchPlaceholder")}
              .value=${this.addQuery}
              @input=${(e) => {
			this.addQuery = e.currentTarget.value, this.candidateWindowStart = 0;
		}}
            />
          </label>
          <div class="candidate-list" @scroll=${(e) => this.onCandidateScroll(e, n.length)}>
            ${i > 0 ? R`<div class="virtual-spacer" style=${`height:${i * 56}px`}></div>` : B}
            ${a.length ? a.map((e) => {
			let t = !e.supported;
			return R`
                  <label class=${`candidate-row${t ? " disabled" : ""}`}>
                    <input
                      type="checkbox"
                      aria-label=${Z("selectEntity", { name: e.name })}
                      .checked=${this.addSelection.includes(e.entityId)}
                      ?disabled=${t}
                      @change=${() => {
				t || this.toggleAddSelection(e.entityId);
			}}
                    />
                    <span class="candidate-main">
                      <ha-icon icon=${this.iconFor(e.domain)}></ha-icon>
                      <span><strong>${e.name}</strong><code>${e.entityId}</code></span>
                    </span>
                    <small>
                      ${e.deviceName || Z("noDevice")} · ${e.areaName || Z("noArea")}
                      ${t ? R`<span class="unsupported-reason">${Z("unsupportedCandidate", { reason: e.unsupportedReason || Z("unsupported") })}</span>` : B}
                    </small>
                  </label>
                `;
		}) : R`<div class="empty compact"><strong>${Z("noCandidatesTitle")}</strong><span>${Z("noCandidatesBody")}</span></div>`}
            ${i + a.length < n.length ? R`<div class="virtual-spacer" style=${`height:${(n.length - i - a.length) * 56}px`}></div>` : B}
          </div>
          <footer>
            <span>${Z("candidateCount", {
			shown: a.length,
			total: n.length
		})}</span>
            <button class="secondary" type="button" @click=${this.closeAddDialog}>${Z("cancel")}</button>
            <button
              type="button"
              aria-label=${Z("exposeSelected")}
              ?disabled=${this.addSelection.length === 0}
              @click=${this.requestAddExposeConfirmation}
            >${Z("exposeSelected")}</button>
          </footer>
        </section>
      </div>
    `;
	}
	onCandidateScroll(t, n) {
		let r = t.currentTarget, i = Math.floor(r.scrollTop / 56), a = Math.max(0, n - e.CANDIDATE_WINDOW);
		this.candidateWindowStart = Math.min(Math.max(0, i), a);
	}
	requestAddExposeConfirmation() {
		this.addSelection.length && (this.selectedEntities = [...this.addSelection], this.bulkAction = "expose", this.bulkConfirmOpen = !0, this.addDialogOpen = !1);
	}
	dialogKeydown(e) {
		e.key === "Escape" && this.closeAddDialog();
	}
	toggleAddSelection(e) {
		this.addSelection = this.addSelection.includes(e) ? this.addSelection.filter((t) => t !== e) : [...this.addSelection, e];
	}
	exposeSelectedCandidates() {
		let e = new Map(this.normalizedEntities.map((e) => [e.entityId, e])), t = { ...this.staged };
		for (let n of this.addSelection) {
			let r = e.get(n);
			r && (t[n] = {
				...this.draftFrom(r),
				exposed: !0
			});
		}
		this.staged = t, this.saveError = "", this.validationIssues = [], this.closeAddDialog();
	}
	toggleSelectedEntity(e) {
		this.selectedEntities = this.selectedEntities.includes(e) ? this.selectedEntities.filter((t) => t !== e) : [...this.selectedEntities, e];
	}
	openBulkConfirm(e) {
		this.bulkAction = e, this.bulkConfirmOpen = !0;
	}
	renderBulkConfirmation() {
		let e = this.bulkAction === "expose", t = Z(e ? "bulkExposeConfirmTitle" : "bulkUnexposeConfirmTitle", { count: this.selectedEntities.length }), n = Z(e ? "bulkExposeConfirmBody" : "bulkUnexposeConfirmBody"), r = Z(e ? "confirmExpose" : "confirmUnexpose");
		return R`
      <div class="dialog-backdrop">
        <section class="dialog confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="bulk-confirm-title" @keydown=${(e) => {
			e.key === "Escape" && (this.bulkConfirmOpen = !1);
		}}>
          <header><div><h2 id="bulk-confirm-title">${t}</h2><p>${n}</p></div></header>
          <footer>
            <button class="secondary" type="button" @click=${() => {
			this.bulkConfirmOpen = !1;
		}}>${Z("cancel")}</button>
            <button class=${e ? "" : "danger"} type="button" aria-label=${r} @click=${this.confirmBulkAction}>${r}</button>
          </footer>
        </section>
      </div>
    `;
	}
	confirmBulkAction() {
		if (!this.editingEnabled) return;
		let e = new Map(this.normalizedEntities.map((e) => [e.entityId, e])), t = { ...this.staged }, n = this.bulkAction === "expose";
		for (let r of this.selectedEntities) {
			let i = e.get(r);
			if (!i || !i.supported && n) continue;
			let a = {
				...t[r] ?? this.draftFrom(i),
				exposed: n,
				remove: void 0,
				useRules: !1,
				exposureChanged: !0
			};
			!this.rulesDraft && i.exposed === n && a.name === i.alexaName && a.description === i.description && a.displayCategories.join("|") === i.displayCategories.join("|") ? delete t[r] : t[r] = a;
		}
		this.staged = t, this.selectedEntities = [], this.addSelection = [], this.bulkConfirmOpen = !1, this.saveError = "", this.validationIssues = [];
	}
	async openMetadataDialog(e, t) {
		this.dialogTrigger = t.currentTarget, this.metadataEntityId = e.entityId, this.metadataDraft = {
			...this.staged[e.entityId] ?? this.draftFrom(e),
			displayCategories: [...this.staged[e.entityId]?.displayCategories ?? e.displayCategories]
		}, await this.updateComplete, this.renderRoot.querySelector(`[aria-label="${Z("alexaName")}"]`)?.focus();
	}
	closeMetadataDialog() {
		this.metadataEntityId = void 0, this.metadataDraft = void 0, this.updateComplete.then(() => this.dialogTrigger?.focus());
	}
	renderMetadataDialog() {
		let e = this.normalizedEntities.find((e) => e.entityId === this.metadataEntityId), t = this.metadataDraft;
		if (!e || !t) return B;
		let n = t.exposed;
		return R`
      <div class="dialog-backdrop">
        <section class="dialog metadata-dialog" role="dialog" aria-modal="true" aria-labelledby="metadata-dialog-title" @keydown=${(e) => {
			e.key === "Escape" && this.closeMetadataDialog();
		}}>
          <header>
            <div>
              <h2 id="metadata-dialog-title">${Z("metadataTitle")}</h2>
              <p>${Z("metadataBody")}</p>
              <div class="metadata-context">
                <strong>${Z("haNameLabel", { name: e.name })}</strong>
                <code>${e.entityId}</code>
                <span>${Z("deviceLabel", { device: e.deviceName || Z("noDevice") })}</span>
                <span>${Z("areaLabel", { area: e.areaName || Z("noArea") })}</span>
                <span class=${n ? "exposed" : "hidden"}>${Z("exposureStateLabel", { state: Z(n ? "exposed" : "hidden") })}</span>
              </div>
            </div>
            <button class="icon" type="button" aria-label=${Z("closeDialog")} @click=${this.closeMetadataDialog}><ha-icon icon="mdi:close"></ha-icon></button>
          </header>
          <div class="metadata-content">
            <label class="field"><span>${Z("alexaName")}</span><input aria-label=${Z("alexaName")} placeholder=${Z("alexaNamePlaceholder")} .value=${t.name} @input=${(e) => {
			this.metadataDraft &&= {
				...this.metadataDraft,
				name: e.currentTarget.value
			};
		}} /></label>
            <label class="field"><span>${Z("alexaDescription")}</span><textarea aria-label=${Z("alexaDescription")} placeholder=${Z("alexaDescriptionPlaceholder")} .value=${t.description} @input=${(e) => {
			this.metadataDraft &&= {
				...this.metadataDraft,
				description: e.currentTarget.value
			};
		}}></textarea></label>
            <fieldset>
              <legend>${Z("displayCategoriesLabel")}</legend>
              <p>${Z("displayCategoriesHelp")}</p>
              <div class="inferred">${Z("inferredCategory", { category: e.inferredDisplayCategory })}</div>
              <label class="field">
                <span class="sr-only">${Z("displayCategoriesLabel")}</span>
                <select
                  aria-label=${Z("displayCategoriesLabel")}
                  .value=${t.displayCategories[0] ?? ""}
                  @change=${(e) => {
			if (!this.metadataDraft) return;
			let t = e.currentTarget.value;
			this.metadataDraft = {
				...this.metadataDraft,
				displayCategories: t ? [t] : []
			};
		}}
                >
                  <option value="">${Z("noDisplayCategory")}</option>
                  ${he.map((e) => R`<option value=${e}>${e}</option>`)}
                </select>
              </label>
            </fieldset>
          </div>
          <footer>
            <button class="secondary" type="button" @click=${this.closeMetadataDialog}>${Z("cancel")}</button>
            <button type="button" aria-label=${Z("applyMetadata")} ?disabled=${!this.editingEnabled} @click=${this.applyMetadata}>${Z("applyMetadata")}</button>
          </footer>
        </section>
      </div>
    `;
	}
	applyMetadata() {
		if (!this.editingEnabled || !this.metadataEntityId || !this.metadataDraft) return;
		let e = this.normalizedEntities.find((e) => e.entityId === this.metadataEntityId);
		if (!e) return;
		let t = !this.metadataDraft.useRules && !this.metadataDraft.exposureChanged && this.metadataDraft.exposed === e.exposed && this.metadataDraft.name === e.alexaName && this.metadataDraft.description === e.description && this.metadataDraft.displayCategories.join("|") === e.displayCategories.join("|"), n = { ...this.staged };
		t ? delete n[e.entityId] : n[e.entityId] = {
			...this.metadataDraft,
			displayCategories: [...this.metadataDraft.displayCategories]
		}, this.staged = n, this.saveError = "", this.validationIssues = [], this.closeMetadataDialog();
	}
	errorMessage(e) {
		return e instanceof Error ? e.message : e && typeof e == "object" && "message" in e ? String(e.message) : String(e);
	}
	errorCode(e) {
		return e && typeof e == "object" && "code" in e ? String(e.code) : "";
	}
	renderAdvanced() {
		return this.section === "settings" ? R`<section aria-label="Recovery and diagnostics">
      <h2>Recovery and diagnostics</h2>
      ${this.advancedLoading ? R`<p role="status">${Z("advancedLoading")}</p>` : B}
      ${this.advancedError ? R`<p role="alert">${this.advancedError}</p>` : B}
      ${this.renderAdvancedGrid()}
    </section>` : R`
      <section class="advanced">
        <button class="advanced-toggle" type="button" aria-label=${Z("advancedTools")} aria-expanded=${String(this.advancedOpen)} @click=${this.toggleAdvanced}>
          <span><strong>${Z("advancedTools")}</strong><small>${Z("advancedBody")}</small></span>
          <ha-icon icon=${this.advancedOpen ? "mdi:chevron-up" : "mdi:chevron-down"}></ha-icon>
        </button>
        ${this.advancedOpen ? R`<div class="advanced-content">
              ${this.advancedLoading ? R`<div class="advanced-state" role="status">${Z("advancedLoading")}</div>` : B}
              ${this.advancedError ? R`<div class="message error" role="alert">${this.advancedError}</div>` : B}
              ${this.advancedLoading ? B : this.renderAdvancedGrid()}
            </div>` : B}
      </section>
    `;
	}
	async toggleAdvanced() {
		this.advancedOpen = !this.advancedOpen, !(!this.advancedOpen || this.previewResponse && this.backupsResponse) && await this.loadAdvanced();
	}
	async loadAdvanced() {
		if (!this.hass) return;
		this.advancedLoading = !0, this.advancedError = "";
		let [e, t] = await Promise.allSettled([this.hass.connection.sendMessagePromise(this.previewMessage()), this.hass.connection.sendMessagePromise({ type: "alexa_exposure_manager/backups" })]);
		e.status === "fulfilled" ? this.previewResponse = e.value ?? {} : this.advancedError = this.errorMessage(e.reason), t.status === "fulfilled" ? this.backupsResponse = t.value ?? {} : this.advancedError = [this.advancedError, this.errorMessage(t.reason)].filter(Boolean).join(" "), this.advancedLoading = !1;
	}
	renderAdvancedGrid() {
		let e = String(this.previewResponse?.filter_yaml ?? this.previewResponse?.filter ?? ""), t = String(this.previewResponse?.entity_config_yaml ?? this.previewResponse?.entity_config ?? ""), n = (Array.isArray(this.backupsResponse?.backups) ? this.backupsResponse.backups : []).filter((e) => !!(e && typeof e == "object"));
		return R`
      <div class="advanced-grid">
        <section class="advanced-card yaml-card">
          <h3>${Z("yamlPreview")}</h3>
          <label>${Z("filterYaml")}<pre><code>${e || Z("noPreview")}</code></pre></label>
          <label>${Z("entityConfigYaml")}<pre><code>${t || Z("noPreview")}</code></pre></label>
        </section>
        <section class="advanced-card">
          <h3>${Z("backupsTitle")}</h3><p>${Z("backupsBody")}</p>
          ${this.pendingCount ? R`<p role="status">Save or Discard pending changes before restoring a backup.</p>` : B}
          <div class="backup-list">
            ${n.length ? n.map((e) => {
			let t = String(e.id ?? e.backup_id ?? "");
			return R`<div><span><strong>${t}</strong><small>${this.backupTimestamp(e)} · ${e.healthy === !1 ? "Unhealthy" : "Backup pair"}</small><small>${String(e.health_reason ?? "")}</small></span><button class="secondary" type="button" aria-label=${Z("restoreBackup", { id: t })} ?disabled=${e.healthy === !1 || !!this.pendingCount || this.saving} @click=${() => {
				this.confirmationTarget = t, this.confirmation = "restore";
			}}>${Z("restoreBackup", { id: t })}</button></div>`;
		}) : R`<span class="muted">${Z("noBackups")}</span>`}
          </div>
        </section>
        <section class="advanced-card">
          <h3>${Z("systemStatus")}</h3>
          <ul><li>${Z("configuredStatus")}</li><li>${Z("activeConfigStatus", { value: this.status?.configuration_state?.active_uses_managed_files ? Z("managedFilesActive") : Z("legacyConfigActive") })}</li><li>${Z("savedConfigStatus", { value: this.status?.configuration_state?.active_matches_saved ? Z("activeMatchesSaved") : Z("activeDiffersSaved") })}</li><li>${Z("revisionStatus", { revision: this.status?.revision ?? "-" })}</li><li>${Z("restartStatus", { value: this.status?.restart_required ? Z("yes") : Z("no") })}</li><li>${this.renderValidationStatus()}</li><li>${Z("migrationStatus", { value: this.migrationStateLabel() })}</li></ul>
        </section>
        <section class="advanced-card">
          <h3>${Z("diagnosticsTitle")}</h3><p>${Z("diagnosticsBody")}</p>
          <div class="card-actions"><button class="secondary" type="button" aria-label=${Z("runDiagnostics")} @click=${this.runDiagnostics}>${Z("runDiagnostics")}</button><button class="secondary" type="button" aria-label=${Z("supportExport")} @click=${() => {
			this.confirmation = "support";
		}}>${Z("supportExport")}</button></div>
          ${this.diagnosticsResponse ? R`<pre class="diagnostics"><code>${JSON.stringify(this.diagnosticsResponse, null, 2)}</code></pre>` : B}
          ${this.operationMessage ? R`<p class="operation-message" role="status">${this.operationMessage}</p>` : B}
        </section>
      </div>
    `;
	}
	renderValidationStatus() {
		let e = this.status?.last_validation;
		if (!e || !e.at) return Z("validationStatusNone");
		let t = e.at;
		if (e.ok) return Z("validationStatusOk", { at: t });
		let n = e.error ?? "";
		return e.rollback === "failed" ? Z("validationStatusRollbackFailed", {
			at: t,
			error: n
		}) : e.rollback === "complete" ? Z("validationStatusRolledBack", {
			at: t,
			error: n
		}) : Z("validationStatusFailed", {
			at: t,
			error: n
		});
	}
	backupTimestamp(e) {
		let t = String(e.created_at ?? e.created ?? e.timestamp ?? ""), n = t.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(\.\d+)?Z$/, "$1-$2-$3T$4:$5:$6$7Z"), r = new Date(n);
		return Number.isNaN(r.getTime()) ? t : r.toLocaleString();
	}
	migrationStateLabel() {
		switch (this.status?.migration_state) {
			case "complete": return Z("migrationComplete");
			case "previewed": return Z("migrationPreviewed");
			default: return Z("migrationNotStarted");
		}
	}
	async runDiagnostics() {
		if (this.hass) try {
			this.diagnosticsResponse = await this.hass.connection.sendMessagePromise({ type: "alexa_exposure_manager/diagnostics" });
		} catch (e) {
			this.advancedError = this.errorMessage(e);
		}
	}
	renderOperationConfirmation() {
		let e = this.confirmation, t = e === "restore" ? Z("restoreTitle", { id: this.confirmationTarget ?? "" }) : Z(e === "support" ? "supportWarningTitle" : e === "restart" ? "restartConfirmTitle" : "migrationConfirmTitle"), n = Z(e === "restore" ? "restoreBody" : e === "support" ? "supportWarningBody" : e === "restart" ? "restartConfirmBody" : "migrationConfirmBody"), r = Z(e === "restore" ? "confirmRestore" : e === "support" ? "confirmSupportExport" : e === "restart" ? "confirmRestart" : "confirmMigration");
		return R`
      <div class="dialog-backdrop">
        <section class="dialog confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="operation-confirm-title" @keydown=${(e) => {
			if (e.key === "Escape" && this.closeOperationConfirmation(), e.key === "Tab") {
				let t = e.currentTarget.querySelectorAll("button:not(:disabled)"), n = t[0], r = t[t.length - 1], i = this.renderRoot.activeElement;
				e.shiftKey && i === n ? (e.preventDefault(), r?.focus()) : !e.shiftKey && i === r && (e.preventDefault(), n?.focus());
			}
		}}>
          <header><div><h2 id="operation-confirm-title">${t}</h2><p>${n}</p></div></header>
          <footer><button class="secondary" type="button" @click=${this.closeOperationConfirmation}>${Z("cancel")}</button><button class=${e === "restore" ? "danger" : ""} type="button" aria-label=${r} @click=${this.confirmOperation}>${r}</button></footer>
        </section>
      </div>
    `;
	}
	closeOperationConfirmation() {
		this.confirmation = void 0, this.confirmationTarget = void 0;
	}
	async confirmOperation() {
		if (!this.hass || !this.confirmation) return;
		let e = this.confirmation, t = this.confirmationTarget, n = !1;
		this.closeOperationConfirmation();
		try {
			if (e === "restore") {
				if (this.pendingCount || this.saving) {
					this.advancedError = "Save or Discard pending changes before restoring a backup.";
					return;
				}
				this.saving = !0, n = !0;
				let e = await this.hass.connection.sendMessagePromise({
					type: "alexa_exposure_manager/restore",
					backup_id: t ?? "",
					expected_revision: this.status?.revision ?? "",
					expected_entities_revision: this.entitiesResponse?.entities_revision ?? this.status?.entities_revision ?? ""
				});
				this.status = {
					...this.status,
					...e
				}, this.discard(), this.previewResponse = void 0, this.backupsResponse = void 0, await this.load(), this.status = {
					...this.status,
					...e
				}, await this.loadAdvanced();
			} else if (e === "restart") await this.hass.connection.sendMessagePromise({
				type: "alexa_exposure_manager/restart",
				confirmed: !0
			}), this.operationMessage = Z("restartRequested");
			else if (e === "support") {
				let e = await this.hass.connection.sendMessagePromise({
					type: "alexa_exposure_manager/support_export",
					confirmed: !0
				});
				this.operationMessage = Z("supportReady"), this.downloadSupportExport(e);
			} else await this.hass.connection.sendMessagePromise({
				type: "alexa_exposure_manager/migration/confirm",
				token: String(this.migrationPreviewResponse?.token ?? ""),
				expected_revision: String(this.migrationPreviewResponse?.revision ?? this.status?.revision ?? ""),
				expected_entities_revision: String(this.migrationPreviewResponse?.entities_revision ?? this.status?.entities_revision ?? "")
			}), this.migrationError = "", this.migrationPreviewResponse = void 0, this.staged = {}, await this.load();
		} catch (t) {
			let n = this.errorMessage(t);
			e === "migration" ? (this.migrationError = `${n} ${Z("migrationPreviewAgain")}`, this.migrationPreviewResponse = void 0) : this.isConfigured() ? this.advancedError = n : this.error = n;
		} finally {
			n && (this.saving = !1);
		}
	}
	downloadSupportExport(e) {
		let t = typeof e.content == "string" ? e.content : JSON.stringify(e, null, 2);
		if (typeof URL.createObjectURL != "function") return;
		let n = URL.createObjectURL(new Blob([t], { type: "application/json" })), r = document.createElement("a");
		r.href = n, r.download = String(e.filename ?? Z("supportFilename")), r.click(), URL.revokeObjectURL(n);
	}
	async previewMigration() {
		if (this.hass) {
			this.migrationLoading = !0, this.migrationError = "";
			try {
				this.migrationPreviewResponse = await this.hass.connection.sendMessagePromise({ type: "alexa_exposure_manager/migration/preview" });
			} catch (e) {
				this.migrationError = this.errorMessage(e);
			} finally {
				this.migrationLoading = !1;
			}
		}
	}
	migrationSummary() {
		let e = this.migrationPreviewResponse?.counts;
		if (!e || typeof e != "object") return Z("migrationUnavailable");
		let t = e;
		return Z("migrationSummary", {
			exposed: Number(t.exposed ?? 0),
			hidden: Number(t.hidden ?? 0),
			unsupported: Number(t.unsupported ?? 0),
			missing: Number(t.missing ?? 0)
		});
	}
	migrationSource() {
		let e = this.migrationPreviewResponse?.legacy_source;
		if (!e || typeof e != "object") return B;
		let t = e;
		return t.from_snapshot === !0 ? Z("migrationSourceSnapshot", { captured: String(t.captured_at ?? "") }) : Z("migrationSourceLive");
	}
	migrationInventory() {
		let e = this.migrationPreviewResponse?.source_inventory ?? {};
		return Z("migrationInventory", {
			includeEntities: Number(e.include_entities ?? 0),
			includeDomains: Number(e.include_domains ?? 0),
			includeGlobs: Number(e.include_entity_globs ?? 0),
			excludeEntities: Number(e.exclude_entities ?? 0),
			excludeDomains: Number(e.exclude_domains ?? 0),
			excludeGlobs: Number(e.exclude_entity_globs ?? 0),
			metadata: Number(e.entity_config ?? 0)
		});
	}
	get normalizedEntities() {
		return (Array.isArray(this.entitiesResponse?.entities) ? this.entitiesResponse.entities : []).map((e) => this.normalizeEntity(e));
	}
	normalizeEntity(e) {
		let t = e && typeof e == "object" ? e : {}, n = String(t.entity_id ?? t.id ?? ""), r = t.entity_config && typeof t.entity_config == "object" ? t.entity_config : this.entitiesResponse?.entity_config?.[n] ?? {}, i = t.display_categories ?? r.display_categories, a = Array.isArray(i) ? i.map(String) : i ? [String(i)] : [], o = String(t.inferred_display_category ?? t.inferred_category ?? "OTHER"), s = this.entitiesResponse?.exposure?.[n], c = typeof t.exposed == "boolean" ? t.exposed : s ?? !1, l = t.missing === !0 || this.entitiesResponse?.missing_entity_ids?.includes(n) === !0;
		return {
			entityId: n,
			name: String(t.name ?? t.friendly_name ?? n),
			domain: String(t.domain ?? n.split(".")[0] ?? ""),
			state: String(t.state ?? ""),
			areaName: String(t.area_name ?? t.area ?? ""),
			deviceName: String(t.device_name ?? t.device ?? ""),
			integration: String(t.integration ?? t.platform ?? ""),
			supported: t.supported !== !1,
			missing: l,
			unsupportedReason: String(t.unsupported_reason ?? ""),
			exposed: c,
			exposureReason: String(t.exposure_reason ?? ""),
			exposure: t.exposure === "include" || t.exposure === "exclude" || t.exposure === "inherited" || t.exposure === "new" ? t.exposure : c ? "include" : "exclude",
			alexaName: String(t.alexa_name ?? t.name_override ?? r.name ?? ""),
			description: String(t.description ?? r.description ?? ""),
			displayCategories: a.length ? a : [o],
			inferredDisplayCategory: o
		};
	}
	draftFrom(e) {
		return {
			exposed: e.exposed,
			name: e.alexaName,
			description: e.description,
			displayCategories: [...e.displayCategories]
		};
	}
	iconFor(e) {
		return {
			light: "mdi:lightbulb",
			switch: "mdi:toggle-switch",
			climate: "mdi:thermostat",
			cover: "mdi:window-shutter",
			lock: "mdi:lock",
			camera: "mdi:camera",
			fan: "mdi:fan"
		}[e] ?? "mdi:home-assistant";
	}
	static styles = o`
    [hidden] { display: none !important; }
    .section-nav { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
    .section-nav [aria-current="page"] { border-color: var(--primary-color, #03a9f4); color: var(--primary-color, #03a9f4); }
    button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible, summary:focus-visible { outline: 2px solid var(--primary-color, #03a9f4); outline-offset: 3px; }
    .exposure small { display: block; max-width: 26ch; color: var(--secondary-text-color, #616161); font-size: 12px; }
    .rules-editor li { margin: 12px 0; overflow-wrap: anywhere; }
    .rules-editor > button { margin: 4px 8px 4px 0; }
    .rules-editor { padding: 20px; }
    .rules-editor p { max-width: 75ch; line-height: 1.5; }
    .rules-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin: 20px 0; }
    .rules-grid label { display: grid; gap: 8px; }
    .rules-grid textarea { box-sizing: border-box; width: 100%; resize: vertical; font: inherit; color: var(--primary-text-color, #212121); background: var(--card-background-color, #fff); border: 1px solid var(--divider-color, #ccc); border-radius: 4px; padding: 10px; }
    .impact { margin-top: 16px; padding: 16px; border-left: 3px solid var(--primary-color, #03a9f4); }
    @media (max-width: 600px) { .rules-grid { grid-template-columns: 1fr; } }
    :host {
      display: block;
      min-height: 100%;
      color: var(--primary-text-color, #212121);
      background: var(--primary-background-color, #fafafa);
      font-family: var(--paper-font-body1_-_font-family, system-ui, sans-serif);
    }

    * { box-sizing: border-box; }

    main {
      min-height: 100vh;
      padding: clamp(20px, 4vw, 48px);
    }

    .manager { max-width: 1440px; margin: 0 auto; }
    .page-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
    .page-header h1 { margin-bottom: 4px; }
    .page-header p { margin: 0; }
    .save-group { display: flex; align-items: center; gap: 12px; flex: none; }
    .pending { color: var(--warning-color, #f57c00); font-size: 13px; font-weight: 600; }
    button:disabled { opacity: .48; cursor: not-allowed; }
    .workspace { overflow: hidden; border: 1px solid var(--divider-color, #e0e0e0); border-radius: var(--ha-card-border-radius, 12px); background: var(--card-background-color, #fff); }
    .toolbar { padding: 16px; display: flex; align-items: center; justify-content: space-between; gap: 18px; border-bottom: 1px solid var(--divider-color, #e0e0e0); }
    .toolbar > label:first-child { display: block; flex: 1; max-width: 640px; }
    .visibility-filter { display: block; flex: none; }
    select { min-height: 44px; border: 1px solid var(--input-idle-line-color, var(--divider-color, #ccc)); border-radius: 8px; padding: 0 34px 0 12px; color: var(--primary-text-color, #212121); background: var(--card-background-color, #fff); font: inherit; }
    .toolbar-actions, .mode-control { display: flex; align-items: center; gap: 12px; }
    .mode-control > span strong, .mode-control > span small { display: block; }
    .mode-control > span strong { font-size: 12px; }
    .mode-control > span small { max-width: 250px; margin-top: 3px; color: var(--secondary-text-color, #616161); font-size: 10px; }
    .strategy-chip { flex: 0 0 auto; padding: 5px 8px; border: 1px solid var(--divider-color, #ddd); border-radius: 999px; background: var(--secondary-background-color, #f5f5f5); color: var(--primary-text-color, #212121); font-size: 10px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
    button.secondary { display: inline-flex; align-items: center; gap: 7px; color: var(--primary-color, #03a9f4); background: transparent; border: 1px solid var(--primary-color, #03a9f4); }
    input { width: 100%; min-height: 44px; border: 1px solid var(--input-idle-line-color, var(--divider-color, #ccc)); border-radius: 8px; padding: 0 14px; color: var(--primary-text-color, #212121); background: var(--input-fill-color, transparent); font: inherit; }
    input:focus-visible { outline: 2px solid var(--primary-color, #03a9f4); outline-offset: 1px; }
    .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }
    .bulk-bar { min-height: 52px; display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 8px 16px; color: var(--primary-color, #03a9f4); background: color-mix(in srgb, var(--primary-color, #03a9f4) 8%, transparent); border-bottom: 1px solid var(--divider-color, #e0e0e0); }
    .bulk-bar .secondary { min-height: 34px; padding-inline: 12px; }
    .bulk-bar .danger-secondary { min-height: 34px; padding-inline: 12px; color: var(--error-color, #db4437); background: var(--card-background-color, #fff); border: 1px solid var(--error-color, #db4437); }
    .bulk-bar .text-button { min-height: 34px; padding-inline: 8px; color: var(--primary-text-color, #212121); background: transparent; }
    .row-actions { display: flex; justify-content: flex-end; gap: 4px; }
    .virtual-spacer { pointer-events: none; }
    .restart-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .table-head, .entity-row { display: grid; grid-template-columns: 24px minmax(220px, 1.35fr) minmax(150px, .9fr) minmax(150px, .9fr) minmax(170px, .7fr) 130px; align-items: center; gap: 18px; padding: 0 20px; }
    .table-head { min-height: 44px; color: var(--secondary-text-color, #616161); background: var(--secondary-background-color, #f5f5f5); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
    .entity-row { min-height: 76px; border-top: 1px solid var(--divider-color, #e0e0e0); }
    .row-checkbox { width: 18px; min-height: 18px; }
    .entity-row.unsupported, .entity-row.missing { background: color-mix(in srgb, var(--warning-color, #f57c00) 5%, transparent); }
    .entity-main { min-width: 0; display: flex; align-items: center; gap: 12px; }
    .entity-main ha-icon { color: var(--state-icon-color, var(--secondary-text-color, #616161)); }
    .entity-main strong, .entity-main code, .context span, .context small, .availability span, .availability small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .entity-main code { margin-top: 5px; color: var(--secondary-text-color, #616161); font-size: 12px; }
    .context small, .availability small { margin-top: 5px; color: var(--secondary-text-color, #616161); font-size: 12px; }
    .availability .ok { color: var(--success-color, #2e7d32); }
    .availability .warning { color: var(--warning-color, #f57c00); font-weight: 600; }
    .entity-row .exposure { display: grid; grid-template-columns: minmax(0, 1fr) 44px; align-items: center; gap: 4px 12px; }
    .exposure small { grid-column: 1; grid-row: 2; overflow-wrap: anywhere; }
    .exposure .toggle { grid-column: 2; grid-row: 1 / 3; }
    .exposure > span { font-size: 13px; font-weight: 600; }
    .exposure .exposed { color: var(--primary-color, #03a9f4); }
    .toggle { position: relative; width: 44px; min-width: 44px; min-height: 40px; height: 40px; padding: 0; border-radius: 999px; background: transparent; }
    .toggle::before { content: ""; position: absolute; inset: 8px 0; border-radius: 999px; background: var(--switch-unchecked-track-color, #9e9e9e); }
    .toggle[aria-checked="true"]::before { background: var(--switch-checked-color, var(--primary-color, #03a9f4)); }
    .toggle span { position: absolute; top: 11px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: var(--switch-unchecked-button-color, #fff); transition: transform .16s ease; }
    .toggle[aria-checked="true"] span { transform: translateX(20px); }
    .empty { min-height: 240px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7px; color: var(--secondary-text-color, #616161); }
    .empty.compact { min-height: 180px; }
    .dialog-backdrop { position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; padding: 20px; background: rgb(0 0 0 / 48%); }
    .dialog { width: min(720px, 100%); max-height: min(760px, calc(100vh - 40px)); display: flex; flex-direction: column; overflow: hidden; border-radius: var(--ha-card-border-radius, 12px); background: var(--card-background-color, #fff); box-shadow: 0 20px 70px rgb(0 0 0 / 30%); }
    .dialog header { display: flex; justify-content: space-between; gap: 20px; padding: 22px 22px 14px; }
    .dialog h2 { margin: 0; font-size: 22px; }
    .dialog p { margin: 5px 0 0; }
    button.icon { width: 40px; min-width: 40px; padding: 0; display: grid; place-items: center; color: var(--primary-text-color, #212121); background: transparent; }
    .dialog-search { padding: 0 22px 16px; }
    .candidate-list { min-height: 180px; overflow-y: auto; border-block: 1px solid var(--divider-color, #e0e0e0); }
    .candidate-row { min-height: 64px; display: grid; grid-template-columns: 24px minmax(190px, 1fr) minmax(150px, .8fr); align-items: center; gap: 12px; padding: 10px 22px; border-bottom: 1px solid var(--divider-color, #e0e0e0); }
    .candidate-row:last-child { border-bottom: 0; }
    .candidate-row.disabled { opacity: .72; }
    .candidate-row input { width: 18px; min-height: 18px; }
    .candidate-main { min-width: 0; display: flex; align-items: center; gap: 10px; }
    .candidate-main ha-icon { color: var(--state-icon-color, var(--secondary-text-color, #616161)); flex: none; }
    .candidate-row strong, .candidate-row code { display: block; }
    .candidate-row code, .candidate-row small { margin-top: 4px; color: var(--secondary-text-color, #616161); font-size: 11px; }
    .unsupported-reason { display: block; margin-top: 4px; color: var(--warning-color, #f57c00); font-weight: 600; }
    .metadata-context { display: grid; gap: 4px; margin-top: 10px; }
    .metadata-context strong, .metadata-context code, .metadata-context span { display: block; font-size: 13px; }
    .metadata-context .exposed { color: var(--primary-color, #03a9f4); font-weight: 600; }
    .metadata-context .hidden { color: var(--secondary-text-color, #616161); font-weight: 600; }
    .dialog footer { display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding: 16px 22px; }
    .dialog footer > span { margin-right: auto; color: var(--secondary-text-color, #616161); font-size: 12px; }
    .confirm-dialog { max-width: 510px; }
    .draft-review { width: min(920px, 100%); }
    .draft-review header { display: block; flex-shrink: 0; }
    .draft-review header p { max-width: 75ch; }
    .draft-review footer { flex-shrink: 0; border-top: 1px solid var(--divider-color, #e0e0e0); }
    .review-body { padding: 0 24px 24px; overflow-y: auto; min-height: 0; overflow-wrap: anywhere; }
    .review-body pre { white-space: pre-wrap; overflow-wrap: anywhere; }
    .metadata-dialog { max-width: 760px; }
    .metadata-content { overflow-y: auto; padding: 4px 22px 20px; }
    .field { display: block; margin-top: 16px; }
    .field > span, fieldset legend { display: block; margin-bottom: 7px; font-size: 13px; font-weight: 700; }
    textarea { width: 100%; min-height: 88px; resize: vertical; border: 1px solid var(--input-idle-line-color, var(--divider-color, #ccc)); border-radius: 8px; padding: 12px 14px; color: var(--primary-text-color, #212121); background: var(--input-fill-color, transparent); font: inherit; }
    textarea:focus-visible { outline: 2px solid var(--primary-color, #03a9f4); outline-offset: 1px; }
    fieldset { margin: 20px 0 0; padding: 0; border: 0; }
    fieldset p { margin: 0 0 9px; font-size: 12px; }
    .inferred { display: inline-block; margin-bottom: 12px; padding: 5px 8px; border-radius: 5px; color: var(--primary-color, #03a9f4); background: color-mix(in srgb, var(--primary-color, #03a9f4) 9%, transparent); font-size: 12px; font-weight: 600; }
    .category-options { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; }
    .category-options label { min-width: 0; display: flex; align-items: center; gap: 7px; padding: 8px; border: 1px solid var(--divider-color, #e0e0e0); border-radius: 6px; font-size: 11px; }
    .category-options input { width: 16px; min-height: 16px; }
    .category-options span { overflow: hidden; text-overflow: ellipsis; }
    .category-order { margin-top: 18px; padding: 14px; border-radius: 8px; background: var(--secondary-background-color, #f5f5f5); }
    .category-order > strong { display: block; margin-bottom: 9px; font-size: 12px; }
    .category-order > div { min-height: 40px; display: grid; grid-template-columns: 24px 1fr repeat(3, 32px); align-items: center; gap: 6px; border-top: 1px solid var(--divider-color, #e0e0e0); }
    button.icon.small { width: 30px; min-width: 30px; min-height: 30px; }
    button.danger { background: var(--error-color, #db4437); }
    .restart, .message { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; padding: 16px; border: 1px solid var(--warning-color, #f57c00); border-radius: var(--ha-card-border-radius, 12px); background: color-mix(in srgb, var(--warning-color, #f57c00) 8%, var(--card-background-color, #fff)); }
    .restart div, .message span { flex: 1; }
    .restart strong, .restart span, .message strong, .message span { display: block; }
    .restart span, .message span { margin-top: 4px; color: var(--secondary-text-color, #616161); font-size: 13px; line-height: 1.5; }
    .restart button { color: var(--primary-text-color, #212121); background: var(--card-background-color, #fff); border: 1px solid var(--divider-color, #ddd); }
    .message.error { border-color: var(--error-color, #db4437); }
    .validation { align-items: flex-start; }
    .validation ul { flex: 1; margin: 0; padding-left: 20px; line-height: 1.6; }
    .migration { margin-top: 22px; padding-top: 18px; border-top: 1px solid var(--divider-color, #e0e0e0); }
    .migration-notice { margin-bottom: 18px; padding: 16px; border: 1px solid var(--primary-color, #03a9f4); border-radius: var(--ha-card-border-radius, 12px); background: color-mix(in srgb, var(--primary-color, #03a9f4) 7%, var(--card-background-color, #fff)); }
    .migration-notice > div { margin-bottom: 12px; }
    .migration-notice strong, .migration-notice span { display: block; }
    .migration-notice span { margin-top: 5px; color: var(--secondary-text-color, #616161); line-height: 1.5; }
    .migration-notice.missing-source { border-color: var(--warning-color, #f57c00); background: color-mix(in srgb, var(--warning-color, #f57c00) 7%, var(--card-background-color, #fff)); }
    .migration-notice.missing-source > div { margin-bottom: 0; }
    .migration-error { margin: 12px 0 0; color: var(--error-color, #db4437); font-weight: 600; }
    .migration-result { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 14px; padding: 12px; border-radius: 8px; background: var(--secondary-background-color, #f5f5f5); }
    .migration-result > div { display: grid; gap: 4px; }
    .migration-inventory, .migration-source { display: block; color: var(--secondary-text-color, #616161); font-size: 12px; }
    .advanced { margin-top: 20px; overflow: hidden; border: 1px solid var(--divider-color, #e0e0e0); border-radius: var(--ha-card-border-radius, 12px); background: var(--card-background-color, #fff); }
    .advanced-toggle { width: 100%; min-height: 70px; display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 14px 20px; color: var(--primary-text-color, #212121); background: transparent; text-align: left; }
    .advanced-toggle strong, .advanced-toggle small { display: block; }
    .advanced-toggle small { margin-top: 5px; color: var(--secondary-text-color, #616161); font-weight: 400; }
    .advanced-content { padding: 20px; border-top: 1px solid var(--divider-color, #e0e0e0); }
    .advanced-state { padding: 30px; text-align: center; color: var(--secondary-text-color, #616161); }
    .advanced-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
    .advanced-card { min-width: 0; max-width: 100%; overflow: hidden; padding: 18px; border: 1px solid var(--divider-color, #e0e0e0); border-radius: 9px; }
    .advanced-card h3 { margin: 0 0 8px; }
    .advanced-card p { margin: 0 0 14px; font-size: 13px; }
    .yaml-card { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    .yaml-card h3 { grid-column: 1 / -1; }
    .yaml-card label { min-width: 0; font-size: 12px; font-weight: 700; }
    .yaml-card pre, .diagnostics { max-height: 300px; margin: 8px 0 0; padding: 14px; overflow: auto; border-radius: 7px; background: var(--code-editor-background-color, #1f2933); color: var(--text-primary-color, #fff); font-weight: 400; }
    .backup-list > div { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 0; border-top: 1px solid var(--divider-color, #e0e0e0); }
    .backup-list strong, .backup-list small { display: block; }
    .backup-list small { margin-top: 4px; color: var(--secondary-text-color, #616161); }
    .backup-list button { font-size: 11px; }
    .advanced-card ul { margin: 0; padding-left: 20px; color: var(--secondary-text-color, #616161); line-height: 1.9; }
    .card-actions { display: flex; flex-wrap: wrap; gap: 8px; }
    .operation-message { color: var(--success-color, #2e7d32) !important; font-weight: 600; }
    .muted { color: var(--secondary-text-color, #616161); }

    .state,
    .setup {
      max-width: 760px;
      margin: 8vh auto 0;
      padding: clamp(24px, 5vw, 48px);
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: var(--ha-card-border-radius, 12px);
      background: var(--card-background-color, #fff);
      box-shadow: var(--ha-card-box-shadow, 0 2px 8px rgb(0 0 0 / 10%));
    }

    .state { text-align: center; }
    h1 { margin: 8px 0 12px; font-size: clamp(24px, 4vw, 34px); }
    p { color: var(--secondary-text-color, #616161); line-height: 1.6; }
    .eyebrow { color: var(--primary-color, #03a9f4); font-weight: 700; text-transform: uppercase; letter-spacing: .08em; font-size: 12px; }
    pre { overflow: auto; padding: 18px; border-radius: 8px; background: var(--code-editor-background-color, #1f2933); color: var(--text-primary-color, #fff); line-height: 1.7; }
    code { font-family: var(--ha-font-family-code, ui-monospace, SFMono-Regular, Menlo, monospace); }
    .safety { border-left: 3px solid var(--primary-color, #03a9f4); padding-left: 14px; }
    .recovery-steps { margin: 20px 0; padding-left: 24px; line-height: 1.7; }
    .recovery-steps li { margin-top: 8px; padding-left: 5px; }
    .setup-source-note { margin-top: 18px; padding: 14px; border-left: 3px solid var(--warning-color, #f57c00); background: color-mix(in srgb, var(--warning-color, #f57c00) 7%, transparent); }
    .setup-source-note strong, .setup-source-note span { display: block; }
    .setup-source-note span { margin-top: 5px; color: var(--secondary-text-color, #616161); line-height: 1.5; }
    .setup-label { display: block; margin-top: 18px; font-size: 13px; }
    button { min-height: 40px; border: 0; border-radius: 8px; padding: 0 18px; color: var(--text-primary-color, #fff); background: var(--primary-color, #03a9f4); font: inherit; font-weight: 600; cursor: pointer; }
    button:focus-visible { outline: 3px solid var(--primary-color, #03a9f4); outline-offset: 3px; }
    .spinner { width: 30px; height: 30px; margin: 0 auto 16px; border: 3px solid var(--divider-color, #ddd); border-top-color: var(--primary-color, #03a9f4); border-radius: 50%; animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (max-width: 900px) {
      main { padding: 20px; }
      .table-head, .entity-row { grid-template-columns: 24px minmax(190px, 1.2fr) minmax(150px, .8fr) minmax(170px, .8fr) 130px; }
      .table-head > :nth-child(3), .entity-row > :nth-child(3) { display: none; }
    }
    @media (max-width: 620px) {
      main { padding: 12px; }
      .page-header { align-items: flex-start; flex-direction: column; }
      .save-group { width: 100%; justify-content: space-between; }
      .toolbar, .toolbar-actions { align-items: stretch; flex-direction: column; }
      .toolbar > label { width: 100%; max-width: none; }
      .mode-control { align-items: flex-start; }
      .table-head { display: none; }
      .entity-row { grid-template-columns: 24px 1fr; gap: 12px; padding: 16px; }
      .entity-row > * { display: flex; }
      .entity-row > :not(:first-child) { grid-column: 2; }
      .context, .availability { flex-direction: column; align-items: flex-start; }
      .exposure { padding-top: 10px; border-top: 1px solid var(--divider-color, #e0e0e0); }
      .restart { align-items: flex-start; flex-wrap: wrap; }
      .restart div { min-width: calc(100% - 40px); }
      .dialog-backdrop { padding: 0; place-items: end stretch; }
      .dialog { width: 100%; max-height: 92vh; border-radius: 14px 14px 0 0; }
      .candidate-row { grid-template-columns: 24px 1fr; }
      .candidate-row small { grid-column: 2; }
      .dialog footer { flex-wrap: wrap; }
      .dialog footer > span { width: 100%; }
      .category-options { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .advanced-grid, .yaml-card { grid-template-columns: 1fr; }
      .yaml-card h3 { grid-column: 1; }
      .migration-result { align-items: flex-start; flex-direction: column; }
      .backup-list > div { align-items: flex-start; flex-direction: column; }
      .backup-list button { width: 100%; justify-content: center; white-space: normal; }
    }
  `;
};
customElements.get("alexa-exposure-manager-panel") || customElements.define("alexa-exposure-manager-panel", $);
//#endregion
export { $ as AlexaExposureManagerPanel };

//# sourceMappingURL=entrypoint.js.map