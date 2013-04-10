(function() {
    // Types
    var isNumber = function(o) {
	return (o instanceof Number || typeof(o) == 'number');
    };
    var isString = function(o) {
	return (o instanceof String || typeof(o) == 'string');
    };
    var isFunction = function(o) {
	return (o instanceof Function || typeof(o) == 'function');
    };
    var isArray = function(o) {
	return (o instanceof Array);
    };
    // General
    var add = function(x, y) {return x + y};
    var addLeft = function(x, y) {return y + x};
    // Functions
    var curry = function(f) {
	var args = Array.prototype.slice.call(arguments, 1);
	return function() {
	    return f.apply(this, args.concat(Array.prototype.slice.call(arguments)));
	};
    };
    var apply = function(f, args) {
	if (args === undefined) args = [];
	if (f) return f.apply(this, args);
    };
    var call = function(f) {
	return apply(f, Array.prototype.slice.call(arguments, 1));
    };
    var delay = function(f) {
	setTimeout(f, 0);
    }
    // Iterations
    var range = function(start, length) {
	return function(f) {
	    for (var i = start; i < length; ++i) if (f(i, i) === false) break;
	};
    };
    var times = function(n) {
	return range(0, n);
    };
    var eachAsArray = function(target) {
	return function(f) {
	    times(target.length)(function(i) {return f(target[i], i)});
	};
    };
    var each = function(target) {
	if (isArray(target)) {
	    return eachAsArray(target);
	} else {
	    return function(f) {
		for (var name in target) if (f(target[name], name) === false) break;
	    };
	}
    };
    var find = function(iterator, condition) {
	var result = undefined;
	each(iterator)(function(v, k) {
	    if (condition(v, k)) {
		result = v;
		return false;
	    }
	});
	return result;
    };
    var reduce = function(iterator, f, initialValue) {
	var result = initialValue;
	var assign = function(value, key) {
	    result = f(result, value, key);
	};
	var callback = (initialValue === undefined) ? function(value, key) {
	    result = value;
	    callback = assign;
	} : assign;
	(isFunction(iterator) ? iterator : each(iterator))(function(value, key) {callback(value, key)});
	return result;
    };
    var join = function(iterator, delimiter) {
	delimiter = String(delimiter);
	return reduce(iterator, function(acc, value) {
	    return String(acc) + delimiter + String(value);
	}) || '';
    };
    var map = function(iterator, f, keyFilter, initialValue) {
	var i = 0;
	return reduce(iterator, function(acc, value, key) {
	    acc[keyFilter ? keyFilter(key, value) : i++] = f(value, key);
	    return acc;
	}, initialValue || []);
    };
    var mapToObject = function(iterator, f, keyFilter) {
	return map(iterator, f, keyFilter || function(k){return k}, {});
    };
    var Objects = {
	isEmpty: function(o) {
	    for (var name in o) {return false}
	    return true;
	}
    };
    var clone = function(o) {
	var r = function() {};
	r.prototype = o;
	return new r;
    };
    var update = function(dest, src) {
	each(src)(function(value, name) {dest[name] = value});
    };
    var merge = function(dest, src) {
	var r = clone(dest);
	update(r, src);
	return r;
    };
    var Arrays = {
	make: function(o) {
	    if (isArray(o)) return o;
	    if (isString(o)) return [o];
	    if (o.slice == undefined) return [o];
	    return Array.prototype.slice.call(o);
	},
	remove: function(a, i) {
	    a.splice(i, 1);
	},
	removeIf: function(a, f) {
	    for (var i = a.length - 1; i >= 0; i--) if (f(a[i])) Arrays.remove(a, i);
	},
	exists: function(a, v) {
	    for (var len = a.length, i = 0; i < len; ++i) if (v == a[i]) return true;
	    return false;
	}
    };
    var Strings = {
	startsWith: function(s, st) {
	    return s.slice(0, st.length) == st;
	},
	trim: function(s) {return s.replace(/^[\s]+|[\s]+$/, '')},
	zeropad: function(s, n) {
	    s = String(s);
	    return reduce(times(n - s.length), curry(addLeft, '0'), '') + s;
	},
	splitOnce: function(s, d) {
	    var p = s.search(d);
	    if (p == -1) return [s];
	    return [s.slice(0, p), s.slice(p + 1)];
	},
	isEmpty: function(s) {return s == ''}
    };
    var Regexps = {
	leftContext: function(m) {
	    return m.input.slice(0, m.index);
	},
	rightContext: function(m) {
	    return m.input.slice(m.index + m[0].length);
	}
    };
    var Times = {
	addMilliseconds: function(d, ms) {
	    var r = new Date();
	    r.setTime(d.getTime() + ms);
	    return r;
	},
	add: function(d, h, min, sec, ms) {
	    return Times.addMilliseconds(d, (ms || 0) + ((sec || 0) + ((min || 0) + h * 60) * 60) * 1000);
	}
    };
    var Cookies = {
	get: function(name) {
	    var pairs = document.cookie.split(';');
	    for (var l = pairs.length, i = 0; i < l; ++i) {
		var nameValue = pairs[i].split('=');
		if (nameValue.length < 2) continue;
		if (Strings.trim(nameValue[0]) == name) return Strings.trim(nameValue[1]);
	    }
	    return undefined;
	},
	expires: function(date) {
	    return 'expires=' + date.toUTCString();
	},
	expiresFromNow: function() {
	    var date = new Date();
	    date.setYear(date.getYear() + 1900 + 10);
	    return Cookies.expires(date);
	}
    };
    var QueryStrings = {
	fromPair: function(n, v) {
	    return String(n) + '=' + String(v);
	},
	fromPairs: function(pairs) {
	    return join(map(pairs, function(v, n) {return QueryStrings.fromPair(n, v)}), '&');
	},
	addToURL: function(url, s) {
	    if (Strings.isEmpty(s)) return url;
	    return url + ((url.indexOf('?') == -1) ? '?' : '&') + s;
	},
	addPairToURL: function(url, n, v) {
	    return QueryStrings.addToURL(url, QueryStrings.fromPair(n, v));
	},
	addPairsToURL: function(url, pairs) {
	    return QueryStrings.addToURL(url, QueryStrings.fromPairs(pairs));
	},
	parse: function(s) {
	    var r = {};
	    each(s.replace(/^\?/, '').split('&'))(function(pair) {
		var nameAndValue = Strings.splitOnce(pair, '=');
		if (nameAndValue.length == 2) r[nameAndValue[0]] = nameAndValue[1];
	    });
	    return r;
	}
    };
    $query = QueryStrings.parse(location.search);
    var XHR = {
	create: (function() {
	    if (window.XMLHttpRequest != undefined) {
		return function() {return new XMLHttpRequest()};
	    } else if (window.ActiveXObject != undefined) {
		return function() {
		    try {
			return new ActiveXObject('Microsoft.XMLHTTP');
		    } catch (e) {
			return false;
		    }
		};
	    } else {
		return function() {return false};
	    }
	})(),
	post: function(url, headers, body, cb) {
	    var xhr = XHR.create();
	    xhr.onreadystatechange = function() {if (xhr.readyState == 4) cb(xhr)};
	    xhr.open('POST', url);
	    each(headers)(function(v, n) {xhr.setRequestHeader(n, v)});
	    xhr.send(body);
	},
	postURLEncoded: function(url, headers, values, cb) {
	    headers['Content-Type'] = 'application/x-www-form-urlencoded';
	    return XHR.post(url, headers, join(map(values, function(v, n) {return n + '=' + encodeURIComponent(v)}), '&'), cb);
	}
    };
    initialize = function() {
	var $ = function(id){return document.getElementById(id)};
	var $body = document.body;
	var toElement = function(src) {
	    if (isArray(src)) {
		return map(src, toElement);
	    } else if (src) {
		return (isString(src) || isNumber(src)) ? document.createTextNode(src) : src;
	    } else {
		return undefined;
	    }
	};
	var append = function(n, c) {
	    if (isArray(c)) {
		each(c)(curry(append, n));
	    } else if (c) {
		n.appendChild(toElement(c));
	    }
	};
	var $e = (function() {
	    var cache = {};
	    return function(tag, attrs, cls, children) {
		if (!(tag in cache)) cache[tag] = document.createElement(tag);
		var e = cache[tag].cloneNode(false);
		for (var n in attrs) e.setAttribute(n, attrs[n]);
		if (cls) e.className = cls;
		append(e, children);
		return e;
	    };
	})();
	var $a = function(n, url, attrs, cls) {
	    return $e('a', merge(attrs || {}, {href: url}), cls, n);
	};
	var $h = function(html) {
	    var d = $e('div');
	    d.innerHTML = html;
	    return d.firstChild;
	};
	var hasClass = function(n, cls) {
	    return n.className && Arrays.exists(n.className.split(' '), cls);
	};
	var setTopToCenter = function(e) {
	    e.style.top = (getWindowYOffset() + (getWindowInnerHeight() - e.scrollHeight) / 2) + 'px';
	};
	var setRightMarginForCSSWidth = function(e) {
	    // set right margin for i-Phone
	    var w = e.scrollWidth;
	    if (!w) {
		var c = e.cloneNode(true);
		c.style.visibility = 'hidden';
		append($body, c);
		w = c.scrollWidth;
		deleteChild($body, c);
	    }
	    if (w) {
		var dummy = $e('div', {}, e.className);
		append($body, dummy);
		var dummyWidth = dummy.scrollWidth;
		deleteChild($body, dummy);
		if (w > dummyWidth) e.style.marginRight = dummyWidth - w + 'px';
	    }
	};
	var setText, textContent;
	if ($body.innerText != undefined) {
	    setText = function(n, t) {n.innerText = t}
	    textContent = function(n) {return n.innerText};
	} else {
	    setText = function(n, t) {n.textContent = t};
	    textContent = function(n) {return n.textContent};
	}
	var deleteChild = ($body.removeNode)
	    ? function(p, n) {n.removeNode(true)}
	: function(p, n) {p.removeChild(n)};
	var deleteNode = function(n) {
	    deleteChild(n.parentNode, n);
	};
	var getDocumentHeight = (function() {
	    if (document.height) return function() {return document.height};
	    if (document.documentElement && document.documentElement.scrollHeight !== undefined) {
		return function() {return document.documentElement.scrollHeight};
	    }
	})();
	var getWindowInnerHeight = (function() {
	    if (window.innerHeight != undefined) return function() {return window.innerHeight};
	    var html = document.getElementsByTagName('html')[0];
	    return function() {return html.clientHeight};
	})();
	var getWindowXOffset = function() {
	    var x = 0;
	    if (document.documentElement != undefined && document.documentElement.scrollLeft) {
		x = document.documentElement.scrollLeft;
	    }
	    if (window.pageXOffset != undefined && window.pageXOffset > x) {
		x = window.pageXOffset;
	    }
	    return x;
	};
	var getWindowYOffset = function() {
	    var y = 0;
	    if (document.documentElement != undefined && document.documentElement.scrollTop) {
		y = document.documentElement.scrollTop;
	    }
	    if (window.pageYOffset != undefined && window.pageYOffset > y) {
		y = window.pageYOffset;
	    }
	    return y;
	};
	var addEventListener = (function() {
	    if (document.addEventListener != undefined) return function(t, e, f) {t.addEventListener(e, f, false)};
	    return function(t, e, f) {t.attachEvent('on' + e, f)};
	})();
	var removeEventListener = (function() {
	    if (document.removeEventListener != undefined) return function(t, e, f) {t.removeEventListener(e, f, false)};
	    return function(t, e, f) {t.detachEvent('on' + e, f)};
	})();
	var preventingDefault = function(func) {
	    return function(event) {
		if (event.preventDefault) event.preventDefault();
		func(event);
		return false;
	    };
	};
	var addEventListenerWithPreventDefault = function(target, event, func) {
	    addEventListener(target, event, preventingDefault(func));
	};
	var setFocusListener = function(e) {
	    addEventListener(e, 'focus', function() {e.hasFocus = true});
	    addEventListener(e, 'blur', function() {e.hasFocus = false});
	    e.hasFocus = false;
	};
	var setIframeOnload = function(iframe, f) {
	    if (iframe.readyState) {
		iframe.onreadystatechange = function() {
		    if (iframe.readyState == 'complete' && f != undefined) f();
		};
	    } else {
		iframe.onload = f;
	    }
	};
	var removeAllChildren = function(e) {
	    while (e.firstChild) deleteChild(e, e.firstChild);
	};
	var hide = function(e) {
	    e.style.display = 'none';
	};
	var isHidden = function(e) {
	    return e.style.display == 'none';
	};
	var show = function(e, display) {
	    e.style.display = display || 'block';
	};
	var isShown = function(e) {
	    return !isHidden(e);
	};
	var loadJSONP = function(url, cb, onError, after) {
	    url = QueryStrings.addPairToURL(url, 'callback', 'callback');
	    var f = $e('iframe');
	    hide(f);
	    append($body, f);
	    var load = function() {
		var d = f.contentWindow.document;
		setIframeOnload(f, function() {
		    if (d['xJSONPLoadedObject'] != undefined) {
			cb(d['xJSONPLoadedObject']);
		    } else if (onError) {
			onError();
		    }
		    setTimeout(function() {deleteChild($body, f)}, 100);
		    if (after) after();
		});
		d.open();
		d.write('<' + 'script type="text/javascript">function callback(v) {document["xJSONPLoadedObject"] = v};</' + 'script><' + 'script type="text/javascript" src="' + url + '"></' + 'script>');
		d.close();
	    };
	    if (f.contentWindow == null) {
		setIframeOnload(f, load);
		f.src = 'dummy.html';
	    } else {
		load();
	    }
	};
	var makeDummyIframe = function(n) {
	    var f = $e('iframe', {id: n, name: n});
	    hide(f);
	    append($body, f);
	    f.contentWindow.name = n;
	    return f;
	};
	var formValues = function(form) {
	    return mapToObject(eachAsArray(form.elements), function(e) {return e.value}, function(k, e) {return e.name});
	};
	var postByForm = (function() {
	    var dummyIframeName = (function() {
		var baseName = 'dummy-iframe-for-post';
		var sequenceNumber = 0;
		return function() {
		    return baseName + '-' + sequenceNumber++;
		}
	    })();
	    return function(form, cb) {
		var f = makeDummyIframe(dummyIframeName());
		if (!cb) cb = function() {};
		setIframeOnload(f, function() {
		    setTimeout(function() {
			deleteNode(f);
			cb();
		    }, 100)});
		form.target = f.name;
		form.submit();
	    };
	})();
	var post = function(url, cb) {
	    var form = $e('form', {method: 'post', action: url});
	    append($body, form);
	    postByForm(form, function() {apply(cb); deleteChild($body, form)});
	};
	var refresh = function() {location.replace(document.location)};
	var setHistoryHook = (function() {
	    var DUMMY_IFRAME_NAME_FOR_HISTORY = 'dummy-iframe-for-history';
	    var currentX, currentY;
	    var storeScroll = function() {
		currentX = getWindowXOffset();
		currentY = getWindowYOffset();
	    };
	    var getSubHash = function(main) {
		return (Strings.isEmpty(main) ? '#' : main) + 'sub';
	    };
	    if (navigator.appName == 'Microsoft Internet Explorer') {
		var iframe = makeDummyIframe(DUMMY_IFRAME_NAME_FOR_HISTORY);
		iframe.src = 'dummy.html';
		return function(body, returnCb) {
		    setIframeOnload(iframe, undefined);
		    var hash = getSubHash(location.hash);
		    var goSub = function() {
			storeScroll();
			body();
			setIframeOnload(iframe, function() {
			    returnCb(currentX, currentY);
			    setIframeOnload(iframe, goSub);
			});
		    };
		    delay(function() {
			iframe.contentWindow.document.open();
			iframe.contentWindow.document.close();
			iframe.contentWindow.location.hash = hash;
			goSub();
		    });
		};
	    } else {
		var timer;
		return function(body, returnCb) {
		    if (timer) clearInterval(timer);
		    var main = location.hash;
		    var sub = getSubHash(main);
		    var current = sub;
		    location.hash = sub;
		    storeScroll();
		    body();
		    timer = setInterval(
			function() {
			    if (location.hash != current) {
				if (location.hash == sub) {
				    current = sub;
				    body();
				} else if (location.hash == main) {
				    current = main;
				    returnCb(currentX, currentY);
				}
			    } else if (current != sub) {
				storeScroll();
			    }
			}, 100);
		};
	    }
	})();
	var Asin = {
	    ICON: '_AA100_',
	    imageURL: function(code, size) {
		return 'http://images-jp.amazon.com/images/P/' + code + '.09.' + size + '.jpg';
	    }
	};
	var Keyword = {
	    cache: {},
	    loadQueue: {},
	    callLoadQueue: function(keyword, property) {
		var args = Array.prototype.slice.call(arguments, 2);
		each(this.loadQueue[keyword])(function(functions) {
		    apply(functions[property], args);
		});
	    },
	    loadInfo: function(keyword, onSuccess, onError, after) {
		var self = this;
		if (self.cache[keyword]) {
		    call(onSuccess, self.cache[keyword]);
		    call(after);
		} else if (self.loadQueue[keyword]) {
		    self.loadQueue[keyword].push({onSuccess: onSuccess, onError: onError, after: after});
		} else {
		    self.loadQueue[keyword] = [{onSuccess: onSuccess, onError: onError, after: after}];
		    loadJSONP($LOCALE.urls.haikuAPIPrefix + 'keywords/show/' + keyword + '.json',
			      function(result) {
				  self.cache[keyword] = result;
				  self.callLoadQueue(keyword, 'onSuccess', result);
			      },
			      curry(self.callLoadQueue, keyword, 'onError'),
			      function() {
				  self.callLoadQueue(keyword, 'after');
				  delete self.loadQueue[keyword];
			      });
		}
	    },
	    isId: function(keyword) {
		return keyword.match(/^id\:[a-zA-Z0-9_\-]+$/);
	    },
	    toId: function(keyword) {
		return keyword.substr(3);
	    },
	    fromId: curry(add, 'id:'),
	    isAsin: function(keyword) {
		return keyword.match(/^asin\:[a-zA-Z0-9]+$/);
	    },
	    toAsin: function(keyword) {
		return keyword.substr(5);
	    },
	    fromAsin: curry(add, 'asin:')
	};
	var User = {
	    iconURL: function(id) {
		return $LOCALE.urls.hatenaRoot + 'users/' + id.substr(0, 2) + '/' + id + '/profile_s.gif';
	    },
	    icon: function(id, cls) {
		return $e('img', {src: User.iconURL(id), title: id, alt: id}, cls || 'small-icon');
	    },
	    linkedIcon: function(id, cls) {
		return $a(User.icon(id, cls), URL.user(id));
	    }
	};
	var URL = {
	    timeline: function(key, value) {
		return QueryStrings.addPairToURL($LOCALE.urls.root, key, encodeURIComponent(value));
	    },
	    keyword: function(keyword) {
		return URL.timeline('keyword', keyword);
	    },
	    status: function(id) {
		return URL.timeline('id', id);
	    },
	    user: function(id) {
		return URL.timeline('user', id);
	    },
	    following: function(id) {
		return URL.timeline('following', id);
	    },
	    convertHaikuURL: (function() {
		var rule = function(regExp, filter) {return {regExp: regExp, filter: filter}};
		var rules = [
		    rule('keyword\\/([^\\?]+)', function(match) {return URL.keyword(decodeURIComponent(match[1]))}),
		    rule('[a-zA-Z0-9_\\-]+\\/([0-9]+).*', function(match) {return URL.status(match[1])}),
		    rule('([a-zA-Z0-9_\\-]+)\\/?', function(match) {return URL.user(match[1])})
		];
		var rulesForLocales = mapToObject($LOCALES, function(locale) {
		    return map(rules, function(rule) {
			return merge(rule, {regExpForLocale: new RegExp('^' + locale.urls.haikuRoot.replace(/([\/\.\:])/g, '\\$1') + rule.regExp + '$')});
		    });
		});
		return function(url) {
		    for (localeName in rulesForLocales) {
			var match;
			var rule = find(rulesForLocales[localeName], function(r) {
			    return (match = url.match(r.regExpForLocale));
			});
			if (rule) return QueryStrings.addPairToURL(rule.filter(match), 'l', localeName);
		    }
		    return url;
		};
	    })()
	};
	var keywordModeParameters = {
	    related: function(keyword) {
		return {
		    url: $LOCALE.urls.haikuAPIPrefix + 'keywords/show/' + keyword + '.json',
		    filter: function(result) {
			if (!result.related_keywords) return [];
			return map(result.related_keywords, function(keyword) {
			    return {title: keyword};
			});
		    },
		    title: $LOCALE.messages.relatedKeywords
		};
	    },
	    userFavorited: function(id) {
		return {
		    url: $LOCALE.urls.haikuAPIPrefix + 'statuses/keywords/' + id + '.json',
		    title: $LOCALE.messages.userKeywords
		};
	    },
	    hot: function() {
		return {
		    url: $LOCALE.urls.haikuAPIPrefix + 'keywords/hot.json',
		    title: $LOCALE.messages.hotKeywords
		};
	    }
	};
	var switcherLink = function(text, url, selected) {
	    if (selected === undefined) selected = false;
	    return {text: text, url: url, selected: selected};
	};
	var switcherLinks = {
	    user: function(id, current) {
		return [
		    switcherLink($LOCALE.links.userEntries, URL.user(id), current == 'user'),
		    switcherLink($LOCALE.links.userFollowing, URL.following(id), current == 'following'),
		    switcherLink($LOCALE.links.userIDKeyword, URL.keyword(Keyword.fromId(id)), current == 'keyword')
		];
	    }
	};
	/**
	 * @constructor
	 */
	var Request = function(params) {
	    var init = Request.initFuncs.recents;
	    for (var name in Request.initFuncs) {
		if (name in params) {
		    init = Request.initFuncs[name];
		    break;
		}
	    }
	    init.call(this, params);
	    this.statusesAPI = 'statuses/' + this.statusesAPI;
	};
	update(Request, {
	    prototype: {
		defaultKeyword: '',
		makeStatusesAPIURL: function(page, count) {
		    return QueryStrings.addPairsToURL($LOCALE.urls.haikuAPIPrefix + this.statusesAPI + '.json', Request.makeAPIParams(page, count));
		},  
		makeProxyURL: function(page, count) {
		    if (!this.proxyParams) return null;
		    return QueryStrings.addPairsToURL($LOCALE.urls.apiProxy, merge(this.proxyParams, Request.makeAPIParams(page, count)));
		},
		loadOnceOnly: false
	    },
	    makeAPIParams: function(p, c) {
		var result = {};
		if (p) result.page = p;
		if (c) result.count = c;
		return result;
	    },
	    refreshURL: function() {
		return location.href.replace(/#.+$/, '');
	    },
	    initFuncs: {
		id: function(params) {
		    update(this, {
			statusesAPI: 'show/' + params.id,
			proxyParams: null,
			subtitle: null,
			keywordMode: null,
			switcherLinks: null,
			loadOnceOnly: true
		    });
		},
		keyword: function(params) {
		    var keyword = decodeURIComponent(params.keyword);
		    update(this, {
			statusesAPI: 'keyword_timeline/' + keyword,
			proxyParams: {keyword: encodeURIComponent(params.keyword)},
			subtitle: {
			    classNameSuffix: 'keyword',
			    text: keyword,
			    setup: function() {
				var subtitle = $request.subtitle.text;
				if (Keyword.isId(subtitle)) {
				    Subtitle.setIcon(User.iconURL(Keyword.toId(subtitle)));
				} else if (Keyword.isAsin(subtitle)) {
				    Keyword.loadInfo(subtitle,
						     function(result) {
							 Subtitle.setText(result.title);
							 Subtitle.setIcon(Asin.imageURL(Keyword.toAsin(subtitle), Asin.ICON));
						     });
				}
			    }
			},
			keywordMode: keywordModeParameters.related(keyword),
			switcherLinks: Keyword.isId(keyword) ? switcherLinks.user(Keyword.toId(keyword), 'keyword') : null,
			defaultKeyword: keyword
		    });
		},
		user: function(params) {
		    var user = decodeURIComponent(params.user);
		    update(this, {
			statusesAPI: 'user_timeline/' + user,
			proxyParams: {user: encodeURIComponent(params.user)},
			subtitle: {
			    classNameSuffix: 'user',
			    text: user + $LOCALE.afterSubtitleUserName,
			    setup: function() {
				Subtitle.setIcon(User.iconURL(user));
			    }
			},
			keywordMode: keywordModeParameters.userFavorited(user),
			switcherLinks: switcherLinks.user(user, 'user')
		    });
		},
		following: function(params) {
		    var user = decodeURIComponent(params.following);
		    update(this, {
			statusesAPI: 'friends_timeline/' + user,
			proxyParams: {following: encodeURIComponent(params.following)},
			subtitle: {
			    classNameSuffix: 'user',
			    text: user + $LOCALE.afterSubtitleFollowing,
			    setup: function() {
				Subtitle.setIcon(User.iconURL(user));
			    }
			},
			keywordMode: keywordModeParameters.userFavorited(user),
			switcherLinks: switcherLinks.user(user, 'following')
		    });
		},
		recents: function(params) {
		    update(this, {
			statusesAPI: 'public_timeline',
			proxyParams: {},
			subtitle: {
			    classNameSuffix: 'recent',
			    text: $LOCALE.messages.recentEntries
			},
			keywordMode: keywordModeParameters.hot()
		    });
		}
	    }
	});
	var $request = new Request($query);
	var $LOAD_COUNT = 20;
	var $statuses = [];
	var $statusById = {};
	var $SHOW_COUNT = 20;
	var RKS = (function() {
	    var rks = undefined;
	    return {
		set: function(new_rks) {
		    rks = new_rks;
		},
		get: function() {
		    return rks;
		}
	    }
	})();
	var makePostProxyURL = function(action) {
	    return QueryStrings.addPairToURL($LOCALE.urls.postProxy, 'action', action);
	};
	var statusLoader = (function() {
	    var canLoadMore = true;
	    var maxLoadedPage = 0;
	    var nextLoadPage = 1;
	    var statusesByPage = {};
	    var load = function(forceNext, onSucceeded, onFailed, rest) {
		if (!canLoadMore) {
		    call(onSucceeded);
		    return;
		}
		if (rest === undefined) rest = $LOAD_COUNT;
		var page = forceNext ? nextLoadPage : maxLoadedPage + 1;
		var callback = function(statuses) {
		    statuses = Arrays.make(statuses);
		    if (page > maxLoadedPage) {
			maxLoadedPage = page;
			if (statuses.length === 0 || $request.loadOnceOnly) canLoadMore = false;
		    }
		    if (!(page in statusesByPage)) statusesByPage[page] = statuses;
		    while (nextLoadPage in statusesByPage) {
			var statuses = statusesByPage[nextLoadPage];
			delete statusesByPage[nextLoadPage];
			++nextLoadPage;
			var loadedStatuses = [];
			each(statuses)(function(status) {
			    var status = UserFilter.filterStatus(status);
			    if (status && !(status.id in $statusById)) {
				Arrays.removeIf(status.replies, function(reply) {
				    return UserFilter.isFiltered(reply.user.id);
				});
				$statuses.push(status);
				$statusById[status.id] = status;
				loadedStatuses.push(status);
				rest--;
			    }
			});
			if (loadedStatuses.length > 0) loadStar(loadedStatuses);
		    }
		    if (rest > 0 && canLoadMore) {
			load(false, onSucceeded, onFailed, rest);
		    } else {
			call(onSucceeded);
		    }
		};
		var loadFromAPI = function() {
		    loadJSONP($request.makeStatusesAPIURL(page, $LOAD_COUNT), callback, onFailed);
		};
//		if (proxyURL = $request.makeProxyURL(page, $LOAD_COUNT)) {
//		    loadJSONP(proxyURL, callback, loadFromAPI);
//		} else {
		    loadFromAPI();
//		}
	    };
	    return {
		canLoadMore: function() {return canLoadMore},
		load: load
	    };
	})();
	var getEntryText = function(status) {
	    if (Keyword.isId(status.keyword)) return status.text;
	    var prefix = status.keyword + '=';
	    if (Strings.startsWith(status.text, prefix)) {
		return status.text.substr(prefix.length);
	    } else {
		return status.text;
	    }
	};
	var parseDate = function(src) {
	    var ymd = src.split(/[\-\/]/);
	    var ymdLength = ymd.length;
	    var year = ymd[0];
	    var month = 1;
	    var day = 1;
	    if (ymd.length > 1) month = ymd[1];
	    if (ymd.length > 2) day = ymd[2];
	    return new Date(year, month - 1, day);
	};
	var parseDatetime = function(datetime) {
	    var dateAndTime = datetime.split('T');
	    var date = parseDate(dateAndTime[0]);
	    if (dateAndTime.length == 1) return date;
	    var timeAndTZD = dateAndTime[1].split(/[Z\+\-]/);
	    var hmsm = timeAndTZD[0].split(/[\:\.]/);
	    var hmsmLength = hmsm.length;
	    date.setHours(hmsm[0]);
	    if (hmsmLength > 1) date.setMinutes(hmsm[1]);
	    if (hmsmLength > 2) date.setSeconds(hmsm[2]);
	    if (hmsmLength > 3) date.setMilliseconds(hmsm[3]);
	    if (timeAndTZD.length == 1) return date;
	    var tzd = timeAndTZD[1];
	    if (Strings.isEmpty(tzd)) return date;
	    var hm = tzd.split(':');
	    return Times.add(date, hm[0], hm[1]);
	};
	var showXHRPostError = function(xhr, unauth, notFound) {
	    if (xhr.status == 401 || xhr.status == 403 || xhr.status == 0) {
		showAuthDialog(unauth);
	    } else if (xhr.status == 504) {
		// alert($LOCALE.errorMessages.proxyError);
		// error dakedo, success shiteru.
	    } else if (xhr.status == 404 && notFound) {
		notFound();
	    } else {
		alert($LOCALE.errorMessages.unknown + '(' + xhr.status + ')');
	    }
	};
	var jumpByKeyword = function(keyword) {
	    if (Strings.isEmpty(keyword)) {
		var jumpToID = function() {
		    if (Strings.isEmpty(Authorization.getName())) {
			showAuthDialog(jumpToID);
		    } else {
			location.replace(URL.keyword(Keyword.fromId(Authorization.getName())));
		    }
		};
		jumpToID();
	    } else {
		location.replace(URL.keyword(keyword));
	    }
	};
	var postEntry = function(form, onSuccess) {
	    if (Strings.isEmpty(form.status.value)) {
		jumpByKeyword(form.keyword.value);
		return;
	    }
	    form.submit_button.disabled = 'disabled';
	    setTimeout(function() {form.submit_button.disabled = undefined}, 20000);
	    var values = formValues(form);
	    if (Strings.isEmpty(values['keyword'])) values['keyword'] = Keyword.fromId(Authorization.getName());
	    XHR.postURLEncoded(makePostProxyURL('post_entry'), {}, values
			      , function(xhr) {
				  if (xhr.status == 200) {
				      call(onSuccess);
				  } else {
				      form.submit_button.disabled = undefined;
				      showXHRPostError(xhr, curry(postEntry, form, onSuccess));
				  }
			      });
	};
	var deleteEntry = function(status) {
	    XHR.postURLEncoded(makePostProxyURL('delete_entry'), {}, {id: status.id}
			      , function(xhr) {
				  if (xhr.status == 200 || xhr.status == 404) {
				      deleteNode($statusById[status.id].element);
				  } else {
				      showXHRPostError(xhr, curry(deleteEntry, status));
				  }
			      });
	};
	var makeStarAPIURL = function(statuses, loadDetail) {
	    var json = loadDetail ? 'entry.json' : 'entries.json';
	    return $LOCALE.urls.starRoot + json + '?'
		+ join(map(statuses, function(s) {return 'uri=' + s.link}), '&');
	};
	var StarComment = {
	    addURL: function(status, body) {
		var url = $LOCALE.urls.starRoot
		    + 'comment.add.json?body=' + encodeURIComponent(body)
		    + '&uri=' + encodeURIComponent(status.link);
		var rks = RKS.get();
		if (rks) url += '&rks=' + rks;
		return url;
	    },
	    deleteURL: function(comment) {
		var rks = RKS.get();
		if (!rks) return null;
		var url = $LOCALE.urls.starRoot
		    + 'comment.delete.json?comment_id=' + comment.id
		    + '&rks=' + rks;
		return url;
	    }
	};
	var compileRules = function(template, rules) {
	    return reduce(eachAsArray(template.childNodes), function(compiled, child, i) {
		each(rules)(function(rule, cls) {
		    if (hasClass(child, cls)) compiled[i] = {rule: rule};
		});
		var childrenRules = compileRules(child, rules);
		if (childrenRules && !Objects.isEmpty(childrenRules)) {
		    if (!compiled[i]) compiled[i] = {};
		    update(compiled[i], childrenRules);
		}
		return compiled;
	    }, {});
	};
	var applyCompiledRules = function(elt, rules, args) {
	    apply(rules.rule, [elt].concat(args));
	    var childNodes = elt.childNodes;
	    each(rules)(function(childRules, childIndex) {
		if (childIndex != 'rule') {
		    applyCompiledRules(childNodes[childIndex], childRules, args);
		}
	    });
	};
	var cloneTemplate = function(template, rules, args) {
	    var clone = template.cloneNode(true);
	    applyCompiledRules(clone, rules, args);
	    return clone;
	};
	var makeStarNode = (function() {
	    var template = $e('button', {disabled: 'disabled'}, 'star');
	    setRightMarginForCSSWidth(template);
	    return function(color, isLink) {
		var r = template.cloneNode(false);
		if (isLink) r.disabled = false;
		if (!color) color = 'yellow';
		r.className += ' star-' + color
		return r;
	    };
	})();
	var setStarImages = function(node, counts, isLink) {
	    if (isLink == undefined) isLink = false;
	    removeAllChildren(node);
	    for (var color in counts) {
		var count = counts[color];
		if (count == 0) continue;
		if (count < 12) {
		    times(count)(function() {append(node, makeStarNode(color, isLink))});
		} else {
		    append(node
			   , [makeStarNode(color, isLink)
			      , $e('span', {}, 'stars-' + color, count - 2)
			      , makeStarNode(color, isLink)]);
		}
	    }
	};
	var makeReplyIcon = function(reply) {
	    return $a(User.icon(reply.user.id), URL.status(reply.id));
	};
	var makeInReplyNode = (function() {
	    var template = $e('span', {}, 'entry-in-reply-to', $e('span'));
	    return function(status) {
		var r = template.cloneNode(true);
		var url = URL.status(status.in_reply_to_status_id);
		return $a(
		    (status.in_reply_to_user_id) ? [User.icon(status.in_reply_to_user_id, 'entry-in-reply-to-user'), r] : r
		    , URL.status(status.in_reply_to_status_id));
	    };
	})();
	var showSubMode = (function() {
	    var main = $('main');
	    var sub = $('sub');
	    var backToMain = function(x, y) {
		hide(sub);
		show(main);
		delay(function() {
		    window.scrollTo(x, y);
		    main.style.visibility = 'visible';
		    autoPager.start();
		});
	    };
	    return function(subContent, cb) {
		autoPager.stop();
		subContent.className += ' sub-content';
		setHistoryHook(
		    function() {
			main.style.visibility = 'hidden';
			hide(main);
			delay(function() {
			    autoPager.stop();
			    removeAllChildren(sub);
			    append(sub, subContent);
			    show(sub);
			    window.scrollTo(0, 0);
			    apply(cb);
			});
		    }, backToMain);
	    };
	})();
	var linkRegExps = (function() {
	    var link = function(regexp, makeElement) {
		return {regExp: regexp, makeElement: makeElement, singleRegExp: new RegExp('^' + regexp + '$', 'i')};
	    };
	    return [
		link('\\[\\[(.+?)\\]\\]', function(match) {
		    var keyword = match[1];
		    return $a(keyword, URL.keyword(keyword), {}, 'keyword');
		}),
		link('id\\:([a-zA-Z0-9\\-_]+)', function(match) {
		    return $a(match[0], URL.user(match[1]), {}, 'user');
		}),
		link('\\[(https?\\:\\/\\/[^\\[\\]\\s]+)\\:title=([^\\]]+)\\]', function(match) {
		    return $a(match[2], URL.convertHaikuURL(match[1]));
		}),
		link('(http\\:\\/\\/f\\.hatena(\\.ne\\.jp|\\.com)\\/[^\\[\\]\\s]+?\\.(jpe?g|gif|png|bmp)|https?\\:\\/\\/[^\\[\\]\\s]+)', function(match) {
		    var url = match[0];
		    if (match = url.match(/^http\:\/\/www\.youtube\.com\/(v\/|watch\?.*\&?v\=)([^\s\&]+).*$/)) {
			var node = $e('div');
			node.innerHTML = '<embed type="application/x-shockwave-flash" wmode="transparent" class="youtube-movie" width="210" height="175" src="http://youtube.com/v/' + match[2] + '"></embed>';
			return node;
		    }
		    if (match = url.match(/^http\:\/\/www\.nicovideo\.jp\/watch\/.*?([0-9]+)/)) {
			var thumbnailURL = 'http://tn-skr2.smilevideo.jp/smile?i=' + match[1];
			return $a($e('img', {src: thumbnailURL}, 'nicovideo-thumbnail'), url);
		    }
		    if (url.match(/\.(jpe?g|gif|png|bmp)(\?.*)?$/i)) {
			return $a($e('img', {src: url, alt:url}), url, {target: '_blank'});
		    }
		    return $a(url, URL.convertHaikuURL(url));
		}),
		link('\\<a href\\=\\"\\/asin\\/([0-9A-Z]+)\\"\\>\\<img.+?src\\=\\"(https?\\:\\/\\/.+?)\\".*?\\/\\>\\<\\/a\\>\\<a href\\=\\"\\/asin\\/[0-9A-Z]+\\"\\>(.+?)\\<\\/a\\>', function(match) {
		    var url = URL.keyword(Keyword.fromAsin(match[1]));
		    var imageURL = match[2];
		    var title = match[3];
		    return [$a($e('img', {src: imageURL}, 'small-icon'), url), $a(title, url)]
		}),
		link('\\<object data\\=\\"http\\:\\/\\/ugomemo\\.hatena\\.ne\\.jp\\/js\\/ugoplayer_s\\.swf\\" type\\=\\"application\\/x-shockwave-flash\\".+?\\>.+?(value\\=\\"did)\\=([0-9A-Z]+?)\\&file\\=([0-9A-Z_]+?)\\".+?\\<\\/object\\>', function(match) {
		    var url = 'http://ugomemo.hatena.ne.jp/' + match[2] + '@DSi/movie/' + match[3];
		    var imageURL = 'http://image.ugomemo.hatena.ne.jp/thumbnail/' + match[2] + '/' + match[3] + '_m.gif';
		    return $a($e('img', {src: imageURL}, 'ugomemo-thumbnail'), url);
		})
	    ];
	})();
	var makeBodyComponentElement = function(src) {
	    var match;
	    var regexp = find(linkRegExps, function(exp) {return (match = src.match(exp.singleRegExp))});
	    if (regexp) return regexp.makeElement(match);
	    return src;
	};
	var appendBodyElementByLine = (function() {
	    var linkRegExp = new RegExp(join(map(linkRegExps, function(e) {return e.regExp}), '|'), 'i');
	    return function(node, line) {
		var match = line.match(linkRegExp);
		if (match) {
		    var leftContext = Regexps.leftContext(match);
		    if (!Strings.isEmpty(leftContext)) append(node, leftContext);
		    append(node, makeBodyComponentElement(match[0]));
		    var rightContext = Regexps.rightContext(match);
		    if (!Strings.isEmpty(rightContext)) appendBodyElementByLine(node, rightContext);
		} else {
		    append(node, line);
		}
	    };
	})();
	var appendBodyElements = function(node, status) {
	    if (status.in_reply_to_status_id) append(node, makeInReplyNode(status));
	    each(getEntryText(status).replace(/\r\n/g, "\n").split(/[\r\n]/))(function(line, lineNumber) {
		if (!Strings.isEmpty(line)) {
		    if (lineNumber > 0) append(node, $e('br'));
		    appendBodyElementByLine(node, line);
		}
	    });
	};
	var formatDatetime = (function() {
	    var TIMEZONE_HOURS = 9;
	    var TIMEZONE_MINUTES = 0;
	    return function(datetime) {
		var utcDatetime = parseDatetime(datetime);
		var date = Times.add(utcDatetime, TIMEZONE_HOURS, TIMEZONE_MINUTES);
		var zeropad = Strings.zeropad;
		return date.getFullYear().toString() + '-'
		    + zeropad(date.getMonth() + 1, 2) + '-'
		    + zeropad(date.getDate(), 2) + ' '
		    + zeropad(date.getHours(), 2) + ':'
		    + zeropad(date.getMinutes(), 2) + ':'
		    + zeropad(date.getSeconds(), 2);
	    };
	})();
	var makeReplyForm = (function() {
	    var template = $h('<form class="reply-form">'
			      + '<div>'
			      + '<input class="reply-in-reply-to" type="hidden" name="in_reply_to_status_id" />'
			      + '<input class="reply-keyword" type="hidden" name="keyword" />'
			      + '<textarea name="status" class="text-area post-form-status"></textarea>'
			      + '<input type="submit" name="submit_button" value="Haiku!" class="button" />'
			      + '<input class="reply-source" type="hidden" name="source" value="' + $LOCALE.applicationName + '"/>'
			      + '</div>'
			      + '</form>');
	    var rules = compileRules(template, {
		'reply-in-reply-to': function(elt, status) {elt.value = status.id},
		'reply-keyword': function(elt, status) {elt.value = status.keyword}});
	    return function(status, onSuccess) {
		var form = cloneTemplate(template, rules, [status]);
		addEventListenerWithPreventDefault(form, 'submit', curry(postEntry, form, function() {
		    alert($LOCALE.messages.replied);
		    deleteNode(form);
		    onSuccess();
		}));
		return form;
	    }
	})();
	var makeEntryElement = (function() {
	    var template = $h('<div class="entry">'
			      + '<div class="entry-content">'
			      + '<a class="profile-image-link"><img class="profile-image" /></a>'
			      + '<div class="entry-body">'
			      + '<h2 class="entry-title"><span class="entry-title-icon"></span><a class="entry-title-link"></a></h2>'
			      + '<a class="entry-show-star-comments" href="javascript:void(0)">'
			      + '<button class="entry-show-star-comments-icon"></button>'
			      + '</a>'
			      + '<img src="./images/star-loading.gif" class="star-loading" />'
			      + '<a href="javascript:void(0)" class="stars show-star-link"></a>'
			      + '<p class="entry-text"></p>'
			      + '<div class="entry-info">'
			      + 'by'
			      + '<a class="entry-info-link entry-info-user-id"></a>'
			      + '<a class="entry-info-link entry-info-date"></a>'
			      + '<span class="entry-info-label-source">from</span>'
			      + '<a class="entry-info-link entry-info-source"></a>'
			      + '<a href="javascript:void(0)" class="entry-delete-link">'
			      + '<button class="entry-delete-button"></button>'
			      + '</a>'
			      + '<span class="entry-replies"></span>'
			      + '</div>'
			      + '</div>'
			      + '</div>'
			      + '<div class="entry-buttons">'
			      + '<a class="add-star-link" href="javascript:void(0)"><span></span></a>'
			      + '<a class="reply-link" href="javascript:void(0)"><span></span></a>'
			      + '</div>'
			      + '<div class="entry-footer"></div>'
			      + '</div>');
	    var rules = compileRules(template, {
		'profile-image-link': function(elt, status) {elt.href = URL.user(status.user.id)},
		'profile-image': function(elt, status) {
		    elt.src = status.user.profile_image_url;
		    elt.title = status.user.id
		},
		'entry-body': function(elt, status) {status.bodyNode = elt},
		'entry-title-icon': function(elt, status) {
		    if (Keyword.isId(status.keyword)) {
			append(elt, $a(User.icon(Keyword.toId(status.keyword), URL.keyword(status.keyword))));
		    } else if (Keyword.isAsin(status.keyword)) {
			append(elt, $a($e('img', {src: Asin.imageURL(Keyword.toAsin(status.keyword), Asin.Icon)}, 'small-icon'), URL.keyword(status.keyword)));
		    }
		},
		'entry-title-link': function(elt, status) {
		    elt.href = URL.keyword(status.keyword);
		    setText(elt, status.keyword);
		    if (Keyword.isAsin(status.keyword)) Keyword.loadInfo(status.keyword, function(result) {
			setText(elt, result.title);
		    });
		},
		'entry-text': function(elt, status) {appendBodyElements(elt, status)},
		'entry-show-star-comments': function(elt, status) {status.starCommentsNode = elt},
		'entry-show-star-comments-icon': function(elt, status) {status.starCommentsIconNode = elt},
		'star-loading': function(elt, status) {status.starLoadingImage = elt},
		'stars': function(elt, status) {status.starNode = elt},
		'entry-info-user-id': function(elt, status) {
		    setText(elt, status.user.id);
		    elt.href = URL.user(status.user.id);
		},
		'entry-info-date': function(elt, status) {
		    setText(elt, formatDatetime(status.created_at));
		    elt.href = URL.status(status.id);
		},
		'entry-info-label-source': function(elt, status) {if (Strings.isEmpty(status.source)) elt.innerHTML = ''},
		'entry-info-source': function(elt, status) {
		    setText(elt, status.source);
		    elt.title = status.source;
		    elt.href = URL.keyword(status.source);
		},
		'entry-delete-link': function(elt, status) {
		    if (Authorization.getName() != status.user.id) {
			hide(elt);
		    } else {
			addEventListenerWithPreventDefault(elt, 'click', function() {
			    if (confirm($LOCALE.messages.confirmDelete)) deleteEntry(status);
			});
		    }
		},
		'entry-delete-button': function(elt, status) {setRightMarginForCSSWidth(elt)},
		'entry-replies': function(elt, status) {each(status.replies)(function(r) {append(elt, makeReplyIcon(r))})},
		'add-star-link': function(elt, status) {
		    addEventListenerWithPreventDefault(elt, 'click', curry(addStar, status));
		},
		'reply-link': function(elt, status) {
		    addEventListenerWithPreventDefault(elt, 'click', function() {
			hide(elt);
			append(status.bodyNode, makeReplyForm(status, curry(show, elt)));
		    });
		}});
	    return function(status) {
		var elt = cloneTemplate(template, rules, [status]);
		status.element = elt;
		setStatusStarNode(status);
		return elt;
	    }
	})();
	var setStatusStarCommentsNode = function(status) {
	    if (status.starCommentsIconNode && status.starCommentsNode && ((status.starComments && status.starComments.length) || status.canComment)) {
		var icon = status.starCommentsIconNode;
		icon.className = 'entry-show-star-comments-icon-' + (status.starComments.length > 0 ? 'active' : 'inactive');
		var button = status.starCommentsNode;
		if (!icon || !button) return;
		setRightMarginForCSSWidth(icon);
		addEventListenerWithPreventDefault(button, 'click', curry(showStarComments, status));
		show(button, 'inline');
	    }
	};
	var setStatusStarNode = function(status) {
	    if (status.starNodeSet) return;
	    if (!status.starLoaded) return;
	    if (status.starLoadingImage) hide(status.starLoadingImage);
	    if (status.stars && status.stars.total > 0) {
		var node = status.starNode;
		if (!node) return;
		setStarImages(node, status.stars.totals, true);
		addEventListenerWithPreventDefault(node, 'click', curry(showStarList, status));
		status.starNodeSet = true;
	    }
	    setStatusStarCommentsNode(status);
	};
	var addEntries = (function() {
	    var list = $('entry-list');
	    var first = true;
	    return function(statuses, cb) {
		var i = 0;
		var l = statuses.length;
		var f = function() {
		    append(list, makeEntryElement(statuses[i]));
		    ++i;
		    if (i < l) {
			if (i % 10 == 0) {
			    delay(f);
			} else {
			    f();
			}
		    } else {
			if (first) {
			    first = false;
			} else if (!statuses[0].stars) {
			    loadStar(statuses);
			}
			cb()
		    }
		};
		f();
	    };
	})();
	var setStatusStar = function(status, entry) {
	    var coloredStars = entry.colored_stars;
	    if (coloredStars == undefined) coloredStars = [];
	    coloredStars.push({stars: entry.stars, color:'yellow'});
	    var starInfos = {};
	    var totals = {};
	    var total = 0;
	    var detailLoaded = true;
	    each(coloredStars)(function(coloredStar) {
		var color = coloredStar.color;
		totals[color] = 0;
		each(coloredStar.stars)(function(s) {
		    if (isNumber(s)) {
			totals[color] += s;
			detailLoaded = false;
			return;
		    }
		    if (UserFilter.isFiltered(s.name)) return;
		    if (starInfos[s.name] == undefined) {
			starInfos[s.name] = {name: s.name, quotes: [], counts: {}};
		    }
		    if (starInfos[s.name].counts[color] == undefined) {
			starInfos[s.name].counts[color] = 0;
		    }
		    if (s.count != undefined && !Strings.isEmpty(s.count)) {
			starInfos[s.name].quotes = concat(starInfos[s.name].quotes, Arrays.make(s.quote));
			var count = parseInt(s.count);
			starInfos[s.name].counts[color] += count;
			totals[color] += count;
		    } else {
			if (!Strings.isEmpty(s.quote)) starInfos[s.name].quotes.push(s.quote);
			starInfos[s.name].counts[color]++;
			totals[color]++;
		    }
		});
		total += totals[color];
	    });
	    status.stars = {infos: starInfos, totals: totals, total: total, detailLoaded: detailLoaded};
	    status.starComments = (entry.comments ? entry.comments : []);
	    status.canComment = entry.can_comment == 1 ? true : false;
	    Arrays.removeIf(status.starComments, function(comment) {
		return UserFilter.isFiltered(comment.name);
	    });
	};
	var onStarLoad = function(statuses, result) {
	    each(result.entries)(function(entry) {
		var id = entry.uri.match(/[0-9]+$/);
		if (id) setStatusStar($statusById[id], entry);
	    });
	    each(statuses)(function(status) {
		if (status.starComments === undefined) {
		    status.starComments = [];
		    status.canComment = result.can_comment == 1 ? true : false;
		}
		setStatusStarNode(status);
	    });
	    RKS.set(result.rks);
	};
	var loadStar = function(statuses, after, loadDetail) {
	    loadJSONP(makeStarAPIURL(statuses, loadDetail)
		      , function(result) {
			  onStarLoad(statuses, result);
		      }
		      , false
		      , function() {
			  each(statuses)(function(s) {
			      s.starLoaded = true;
			      setStatusStarNode(s);
			  });
			  apply(after);
		      });
	};
	var DialogMask = (function() {
	    var mask = $e('div', {id: 'dialog-mask'});
	    hide(mask);
	    return {
		show: function() {
		    if (isHidden(mask)) {
			show(mask);
			autoPager.stop();
			append($body, mask);
			mask.style.height = getDocumentHeight() + 'px';
			var timer = setInterval(function() {
			    if (isShown(mask)) {
				mask.style.height = getDocumentHeight() + 'px';
			    } else {
				clearInterval(timer);
			    }
			}, 100);
		    }
		},
		hide: function() {
		    if (isShown(mask)) {
			hide(mask);
			deleteChild($body, mask);
			autoPager.start();
		    }
		}
	    };
	})();
	var Authorization = (function() {
	    var userName;
	    return {
		setName: function(name) {
		    userName = name;
		    document.cookie = 'user=' + name + '; ' + Cookies.expiresFromNow();		    
		},
		getName: function() {
		    if (userName == undefined) userName = (Cookies.get('user') || '');
		    return userName;
		},
		setPassword: function(password) {
		    document.cookie = 'passwd=' + password + '; path=' + location.pathname.replace(/[^\/]+$/, '') + 'server/auth; ' + Cookies.expiresFromNow();
		}
	    };
	})();
	var UserFilter = (function() {
	    var ids = (function() {
		var cookie = Cookies.get('ng_users') || '';
		return Strings.isEmpty(cookie) ? [] : cookie.split(',');
	    })();
	    var isFiltered = function(id) {
		return ($query['user'] != id) && Arrays.exists(ids, id);		
	    };
	    return {
		ids: function() {return ids},
		add: function(id) {ids.push(id)},
		remove: function(index) {Arrays.remove(ids, index)},
		isFiltered: isFiltered,
		filterStatus: function(status) {
		    if (isFiltered(status.user.id)) return null;
		    if (isFiltered(status.in_reply_to_user_id)) {
			status.in_reply_to_user_id = undefined;
			status.in_reply_to_status_id = undefined;
		    }
		    return status;
		},
		save: function() {
		    document.cookie = 'ng_users=' + join(ids, ',') + ';' + Cookies.expiresFromNow();		    
		}
	    };
	})();
	var showAuthDialog = (function() {
	    var dialog = $h('<div class="dialog">'
			    + '<h3>' + $LOCALE.messages.authDialogSubject + '</h3>'
			    + '<form id="auth-dialog-form">'
			    + '<div class="dialog-field">'
			    + '<p class="form-label">' + $LOCALE.messages.hatenaID + '</p>'
			    + '<p><input class="text-field" type="text" name="user_name" /></p>'
			    + '</div>'
			    + '<div class="dialog-field">'
			    + '<p class="form-label">' + $LOCALE.messages.password + '</p>'
			    + '<p><input class="text-field" type="password" name="password" /></p>'
			    + '</div>'
			    + '<p>'
			    + '<input class="button" type="submit" value="' + $LOCALE.messages.okButtonLabel + '" />'
			    + '<input class="button" id="auth-dialog-cancel-button" type="button" value="' + $LOCALE.messages.cancelButtonLabel + '" />'
			    + '</p>'
			    + '</form>'
			    + '<p><a href="' + $LOCALE.urls.helpDir + '/help.html" target="_blank">'
			    + $LOCALE.messages.passwordIsAPIPassword
			    + '</a></p>'
			    + '</div>');
	    hide(dialog);
	    return function(cb) {
		if (isHidden(dialog)) {
		    DialogMask.show();
		    append($body, dialog);
		    var form = $('auth-dialog-form');
		    var hideDialog = function() {
			form.onsubmit = function() {};
			hide(dialog);
			DialogMask.hide();
		    };
		    form.user_name.value = Authorization.getName();
		    addEventListenerWithPreventDefault(form, 'submit', function() {
			hideDialog();
			Authorization.setName(form.user_name.value);
			Authorization.setPassword(form.password.value);
			form.user_name.value = '';
			form.password.value = '';
			delay(cb);
		    });
		    $('auth-dialog-cancel-button').onclick = hideDialog;
		    show(dialog);
		    setTopToCenter(dialog);
		    if (Strings.isEmpty(form.user_name.value)) {
			form.user_name.focus();
		    } else {
			form.password.focus();
		    }
		}
	    }
	})();
	var addStar = function(status) {
	    if (status.starNode) {
		delay(function() {
		    var node = makeStarNode('yellow', true);
		    append(status.starNode, node);
		    XHR.postURLEncoded(makePostProxyURL('addstar'), {}, {id: status.id}
				      , function(xhr) {
					  if (xhr.status != 200 && xhr.status != 504) { // 504 -> Maybe succeeded.
					      deleteChild(status.starNode, node);
					      showXHRPostError(xhr, 
							       function() {addStar(status)},
							       function() {alert($LOCALE.errorMessages.entryNotFound)});
					  }
				      });
		});
	    }
	};
	var showStarList = (function() {
	    var listTemplate = $e('div', {id: 'star-list'});
	    var setNode = function(list, stars) {
		each(stars.infos)(function(info) {append(list, makeStarListRowNode(info))});
	    };
	    return function(status) {
		var list = listTemplate.cloneNode(false);
		if (status.stars && status.stars.detailLoaded) {
		    setNode(list, status.stars);
		    showSubMode(list);
		} else {
		    append(list, $e('div', {}, 'footer loading-image'));
		    showSubMode(list);
		    loadStar([status], function() {removeAllChildren(list); setNode(list, status.stars)}, true);
		}
	    };
	})();
	var makeStarListRowNode = (function() {
	    var template = $h('<div class="star-list-row">'
			      + '<a class="star-list-user-link"><img class="small-icon"><span class="star-list-user"></span></a>'
			      + '<span class="stars"></span><span class="star-list-quote"></span>'
			      + '</div>');
	    var rules = compileRules(template, {
		'star-list-user-link': function(elt, starInfo) {elt.href = URL.user(starInfo.name)},
		'small-icon': function(elt, starInfo) {elt.src = User.iconURL(starInfo.name)},
		'star-list-user': function(elt, starInfo) {setText(elt, starInfo.name)},
		'stars': function(elt, starInfo) {setStarImages(elt, starInfo.counts)},
		'star-list-quote': function(elt, starInfo) {
		    var quotes = starInfo.quotes;
		    if (quotes.length > 1) quotes = map(quotes, function(q) {return '"' + q + '"'});
		    setText(elt, join(quotes, ', '));
		}});
	    return function(starInfo) {
		return cloneTemplate(template, rules, [starInfo]);
	    }
	})();
	var makeStarCommentNode = (function() {
	    var template = $h('<div class="star-comment-list-row">'
			      + '<a class="star-comment-user-link"></a>'
			      + '<span class="star-comment-body"></span>'
			      + '<a href="javascript:void(0)" class="star-comment-delete-link">'
			      + '<button class="star-comment-delete-button"></button>'
			      + '</a>'
			      + '</div>');
	    var rules = compileRules(template, {
		'star-comment-user-link': function(elt, comment) {
		    elt.href = URL.user(comment.name);
		    append(elt, User.icon(comment.name));
		},
		'star-comment-body': function(elt, comment) {elt.innerHTML = comment.body},
		'star-comment-delete-link': function(elt, comment) {
		    if (Authorization.getName() != comment.name) {
			hide(elt);
		    } else {
			addEventListenerWithPreventDefault(elt, 'click', function() {
			    if (url = StarComment.deleteURL(comment)) {
				loadJSONP(url, curry(deleteNode, comment.element));
			    }
			});
		    }
		}});
	    return function(comment) {
		var node = cloneTemplate(template, rules, [comment]);
		comment.element = node;
		return node;
	    }
	})();
	var showStarComments = (function() {
	    var formTemplate = $h('<form>'
			  + '<p><textarea name="body"></textarea></p>'
			  + '<p><input name="submit" type="submit" value="' + $LOCALE.messages.addCommentButtonLabel + '" /></p>'
			  + '</form>');
	    return function(status) {
		var list = $e('div');
		var appendComment = function(comment) {
		    append(list, makeStarCommentNode(comment));
		};
		var starComments = status.starComments;
		if (starComments != undefined) {
		    each(starComments)(appendComment);
		}
		var area = $e('div', {id: 'star-comment-list'}, '', list);
		if (status.canComment) {
		    var addComment = function(form) {
			if (form.body.value === '') return;
			form.submit.disabled = 'disabled';
			loadJSONP(StarComment.addURL(status, form.body.value),
				  function(comment) {
				      appendComment(comment);
				      form.body.value = '';
				  },
				  undefined,
				  function() {
				      form.submit.disabled = undefined;
				  });
		    };
		    var form = formTemplate.cloneNode(true);
		    addEventListenerWithPreventDefault(form, 'submit', curry(addComment, form));
		    append(area, form);
		}
		showSubMode(area);
	    }
	})();
	var makeSearchKeywordForm = (function() {
	    var template = $h('<form class="search-keyword-form">'
			      + '<input class="text-field" name="word" type="text" />'
			      + '<input class="button" type="submit" value="Search" />'
			      + '</form>');
	    return function(searchFunction) {
		var r = template.cloneNode(true);
		addEventListenerWithPreventDefault(r, 'submit', function() {
		    r.word.blur();
		    searchFunction(r.word.value);
		});
		return r;
	    }
	})();
	var searchKeyword = function(word) {
	    KeywordMode.startLoad();
	    var userFound = false;
	    var search = function() {
		KeywordMode.loadKeywords(encodeURI($LOCALE.urls.haikuAPIPrefix + 'keywords/list.json?word=' + word),
					 function() {
					     if (!userFound) this.showError($LOCALE.errorMessages.noKeywordsSearch)
					 },
					 function() {
					     this.showError($LOCALE.errorMessages.keywordSearchFailed);
					 });
	    };
	    if (word.match(/^[a-zA-Z0-9\-_]+$/)) {
		loadJSONP(encodeURI($LOCALE.urls.haikuAPIPrefix + 'friendships/show/' + word + '.json'),
			  function(user) {
			      if (user && user.id) {
				  userFound = true;
				  var keyword = Keyword.fromId(user.id);
				  append(KeywordMode.keywordList
					 , [$e('div', {}, 'keyword-user-entries keyword-list-row'
					       , [User.linkedIcon(user.id)
						  , $a(user.id, URL.user(user.id))]),
					    $e('div', {}, 'keyword-list-row'
					       , $a(keyword, URL.keyword(keyword), {}, 'keyword-list-row-link'))]);
			      }
			  }, undefined, search);
	    } else {
		search();
	    }
	};
	var KeywordMode = (function() {
	    var self = {}
	    self.defaultKeywords = {};
	    self.body = $e('div');
	    self.keywordList = $e('div');
	    var makeListRow = (function() {
		var template = $h('<div class="keyword-list-row">'
				  + '<a class="keyword-list-row-link"></a>'
				  + '</div>');
		var rules = compileRules(template, {
		    'keyword-list-row-link': function(elt, keyword) {
			elt.href = URL.keyword(keyword.title);
			setText(elt, keyword.title);
		    }
		});
		return function(keyword) {
		    return cloneTemplate(template, rules, [keyword]);
		};
	    })();
	    self.appendKeyword = function(keyword) {
		append(self.keywordList, makeListRow(keyword));
	    };
	    self.removeKeywords = function() {
		removeAllChildren(self.keywordList);
	    };
	    var loading = $e('div', {}, 'footer loading-image');
	    var errorMessage = $e('div', {}, 'footer error-message');
	    self.showError = function(message) {
		setText(errorMessage, message);
		show(errorMessage);
	    };
	    self.startLoad = function() {
		self.removeKeywords();
		show(loading);
		hide(errorMessage);
	    };
	    self.loadKeywords = function(url, ifZero, onError, filter) {
		loadJSONP(url,
			  function(keywords) {
			      hide(loading);
			      if (filter) keywords = filter(keywords);
			      if (keywords.length == 0) {
				  if (ifZero) ifZero.apply(self);
			      } else {
				  each(keywords)(self.appendKeyword);
			      }
			  },
			  function() {
			      hide(loading);
			      if (onError) onError.apply(self);
			  });
	    };
	    self.showAndLoad = function(url, ifZero, onError, filter) {
		self.startLoad();
		showSubMode(self.body);
		self.loadKeywords(url, ifZero, onError, filter);
	    };
	    each([makeSearchKeywordForm(searchKeyword), self.keywordList, loading, errorMessage])(function(e) {append(self.body, e)});
	    return self;
	})();
	showPostForm = function() {
	    hide($('show-form-link'));
	    show($('post-form-area'));
	};
	var Subtitle = {
	    setText: function(s) {
		document.title = s + ' - ' + $LOCALE.applicationName;
		setText($('subtitle-text'), s);
	    },
	    setIcon: function(url) {
		append($('subtitle-icon'), $e('img', {src: url}, 'small-icon'));		
	    },
	    initialize: function() {
		if (!$request.subtitle) return;
		var classNameSuffix = $request.subtitle.classNameSuffix;
		$('subtitle').className = 'subtitle-' + classNameSuffix;
		Subtitle.setText($request.subtitle.text);
		$('subtitle-link').href = Request.refreshURL();
		call($request.subtitle.setup);
		if ($request.keywordMode) {
		    var keywordModeLink = $('keyword-mode-link');
		    addEventListenerWithPreventDefault(keywordModeLink, 'click', function() {
			KeywordMode.showAndLoad($request.keywordMode.url,
						function() {this.showError($LOCALE.errorMessages.noKeywords)},
						function() {this.showError($LOCALE.errorMessages.keywordFailed)},
						$request.keywordMode.filter);
		    });
		    setText(keywordModeLink, $request.keywordMode.title);
		} else {
		    hide($('subtitle-keyword-mode-link'));
		}
		if ($request.switcherLinks) {
		    var links = $('switcher-links');
		    var baseClassName = 'switcher-link switcher-link-' + classNameSuffix;
		    each($request.switcherLinks)(function(link) {
			var className = baseClassName + (link.selected ? ' switcher-link-selected switcher-link-selected-' + classNameSuffix : ' switcher-link-unselected switcher-link-unselected-' + classNameSuffix);
			append(links, $a(link.text, link.url, {}, className));
		    })
		}
	    }
	};
	var autoPager = (function() {
	    var timer, limit;
	    var stop = function() {
		if (timer) {
		    clearInterval(timer);
		    timer = undefined;
		}
	    };
	    return {
		start: function() {
		    if (limit == undefined) limit = getDocumentHeight() / 2;
		    timer = setInterval(function() {
			if (getDocumentHeight() - getWindowYOffset() < limit) {
			    stop();
			    openNext();
			}
		    }, 100);
		},
		stop: stop
	    };
	})();
	var showSettings = (function() {
	    var settings = $h('<div class="settings">'
			      + '<form id="settings-login-form">'
			      + '<p class="form-label">' + $LOCALE.messages.hatenaID + '</p>'
			      + '<p><input class="text-field" type="text" id="settings-user-name" /></p>'
			      + '<p class="form-label">' + $LOCALE.messages.password + '</p>'
			      + '<p><input class="text-field" type="password" id="settings-password" /></p>'
			      + '<p><a href="' + $LOCALE.urls.helpDir + '/help.html" target="_blank">'
			      + $LOCALE.messages.passwordIsAPIPassword
			      + '</a></p>'
			      + '<p><input class="button" type="submit" value="' + $LOCALE.messages.saveButtonLabel + '" /></p>'
			      + '</form>'
			      + '<p class="form-label">' + $LOCALE.messages.ngUser + '</p>'
			      + '<form id="settings-ng-user-add-form">'
			      + '<input class="text-field" type="text" id="settings-ng-user-name" />'
			      + '<input class="button" type="submit" value="' + $LOCALE.messages.addButtonLabel + '" />'
			      + '</form>'
			      + '<select id="settings-ng-users" size="3" multiple></select>'
			      + '<p><input class="button" type="button" value="' + $LOCALE.messages.removeButtonLabel + '" id="settings-ng-user-remove-button" /></p>'
			      + '</div>');
	    return function() {
		showSubMode(settings, function() {
		    var userName = $('settings-user-name');
		    userName.value = Authorization.getName();
		    var password = $('settings-password');
		    if (!Strings.isEmpty(userName.value)) password.value = '**********';
		    var passwordChanged = false;
		    password.onchange = function() {
			passwordChanged = true;
		    };
		    addEventListenerWithPreventDefault($('settings-login-form'), 'submit', function() {
			Authorization.setName(userName.value);
			if (Strings.isEmpty(userName.value)) {
			    password.value = '';
			    passwordChanged = true;
			}
			if (passwordChanged) Authorization.setPassword(password.value);
			alert($LOCALE.messages.saved);
		    });
		    var ngUserList = $('settings-ng-users');
		    removeAllChildren(ngUserList);
		    var addNgUser = function(name) {
			
			append(ngUserList, $e('option', {}, '', name));
		    };
		    each(UserFilter.ids())(addNgUser);
		    var ngUserName = $('settings-ng-user-name');
		    addEventListenerWithPreventDefault($('settings-ng-user-add-form'), 'submit', function() {
			var name = Strings.trim(ngUserName.value);
			if (name.match(/^[a-zA-Z0-9_\-]+$/)) {
			    addNgUser(name);
			    UserFilter.add(name);
			    UserFilter.save();
			    ngUserName.value = '';
			} else {
			    alert($LOCALE.errorMessages.invalidNGUserName);
			}
		    });
		    var removeSelectedNgUser = function() {
			var index = ngUserList.selectedIndex;
			if (index > -1) {
			    deleteChild(ngUserList, ngUserList.childNodes[index]);
			    UserFilter.remove(index);
			    removeSelectedNgUser();
			}
		    };
		    addEventListenerWithPreventDefault($('settings-ng-user-remove-button'), 'click', function() {
			removeSelectedNgUser();
			UserFilter.save();
		    });
		});
	    };
	})();
	openNext = (function() {
	    var nextButton = (function() {
		var button = $('next-button');
		return {
		    show: curry(show, button),
		    hide: curry(hide, button)
		};
	    })();
	    var loading = (function() {
		var elt = $('loading-image');
		return {
		    show: function() {
			nextButton.hide();
			show(elt);
		    },
		    hide: curry(hide, elt)
		};
	    })();
	    var loadError = function() {
		alert($LOCALE.errorMessages.entryFailed);
		loading.hide();
		nextButton.show();
	    };
	    var timeoutTimer = (function() {
		var timer;
		var stop = function() {
		    if (timer != undefined) {
			clearTimeout(timer);
			timer = undefined;
		    }
		};
		return {
		    stop: stop,
		    start: function() {
			stop();
			timer = setTimeout(function() {
			    loading.hide();
			    nextButton.show();
			}, 10000);
		    }
		};
	    })();
	    var shownStatusesCount = 0;
	    return function(onSucceeded, onFailed) {
		autoPager.stop();
		timeoutTimer.stop();
		if ($statuses.length >= shownStatusesCount + $SHOW_COUNT
		    || ($statuses.length > shownStatusesCount && !statusLoader.canLoadMore())) {
		    loading.show();
		    var statuses = $statuses.slice(shownStatusesCount, shownStatusesCount + $SHOW_COUNT);
		    addEntries(statuses, function() {
			shownStatusesCount += statuses.length;
			loading.hide();
			if ($statuses.length > shownStatusesCount　|| statusLoader.canLoadMore()) {
			    nextButton.show();
			    autoPager.start();
			    statusLoader.load();
			}
			call(onSucceeded);
		    });
		} else if (statusLoader.canLoadMore()) {
		    loading.show();
		    timeoutTimer.start();
		    statusLoader.load(true, curry(openNext, onSucceeded), onFailed || loadError);
		} else {
		    nextButton.hide();
		    loading.hide();
		    onSucceeded();
		}
	    };
	})();
	var setupForLocale = function() {
	    document.title = $LOCALE.title;
	    $('meta-description').content = $LOCALE.description;
	    update($('haiku-logo-image'), {title: $LOCALE.haikuTitle, href: $LOCALE.urls.root});
	    var settingsLink = $e('a', {href: 'javascript:void(0)'});
	    addEventListener(settingsLink, 'click', showSettings);
	    append(settingsLink, $LOCALE.links.settings);
	    append($('header-menu')
		   , [settingsLink,
		      $a($LOCALE.links.help, $LOCALE.urls.helpDir + '/help.html')]);
	};
	var PostForm = {
	    initialize: function() {
		setText($('show-form-link'), $LOCALE.showFormButtonLabel);
		show($('show-form-link'), 'inline');
		$('post-form-keyword').value = $request.defaultKeyword;
		var postForm = $('post-form');
		postForm.source.value = $LOCALE.applicationName;
		addEventListenerWithPreventDefault(postForm, 'submit', curry(postEntry, postForm, function() {
		    if (Strings.isEmpty(postForm.keyword.value)) {
			location.replace(URL.user(Authorization.getName()));
		    } else {
			refresh();
		    }
		}));
	    }
	};
	var start = function() {
	    show($('main'));
	    setupForLocale();
	    Subtitle.initialize();
	    PostForm.initialize();
	    var onError = function(message) {
		setText($('footer-error'), message);
		show($('footer-error'));
	    };
	    openNext(
		function() {if ($statuses.length == 0) onError($LOCALE.errorMessages.noEntries)},
		curry(onError, $LOCALE.errorMessages.entryFailed));
	}
	start();
    };
    $LOCALES = {
	ja: {
	    parameter: 'ja',
	    applicationName: 'ミニハイク',
	    title: 'ミニハイク',
	    haikuTitle: 'はてなハイク',
	    description: '主にiPhoneやAndroid向けの非公式な簡易版「はてなハイク」',
	    afterSubtitleUserName: 'さんのエントリー',
	    afterSubtitleFollowing: 'さんのアンテナ',
	    showFormButtonLabel: '投稿',
	    messages: {
		replied: 'リプライを投稿しました。',
		confirmDelete: 'このエントリーを削除しますか？',
		authDialogSubject: 'はてなへの認証が必要です。',
		hatenaID: 'はてなID',
		password: 'パスワード*',
		passwordIsAPIPassword: '* API用のパスワードを入力して下さい。',
		okButtonLabel: 'OK',
		cancelButtonLabel: 'キャンセル',
		saveButtonLabel: '保存',
		saved: '保存しました。',
		ngUser: 'NGユーザ',
		addButtonLabel: '追加',
		removeButtonLabel: '削除',
		recentEntries: 'Recent Entries',
		hotKeywords: '注目キーワード >>',
		relatedKeywords: '関連キーワード >>',
		userKeywords: 'お気に入りキーワード >>',
		addCommentButtonLabel: 'send'
	    },
	    errorMessages: {
		noEntries: 'エントリーがありません。',
		entryFailed: 'エントリーの取得に失敗しました。',
		noKeywordsSearch: '該当するキーワードがありません。',
		keywordSearchFailed: '検索に失敗しました。',
		noKeywords: 'キーワードはありません。',
		keywordFailed: 'キーワードの取得に失敗しました。',
		invalidNGUserName: 'ユーザIDが間違っています。',
		entryNotFound: '該当のエントリーがありません。既に削除された可能性があります。',
		proxyError: 'はてなのサーバでエラーが発生しました。復旧するまでお待ちください。操作が成功している可能性もありますので、念のためご確認ください。',
		unknown: 'サーバがエラーを返しました。しばらくしてからやり直して下さい。直らない場合はお手数ですが、id:yuushimizuまでご連絡頂けると助かります。'
	    },
	    links: {
		settings: '設定',
		help: 'ヘルプ',
		userEntries: 'Entries',
		userFollowing: 'Favorites',
		userIDKeyword: 'About'
	    },
	    urls: {
		root: '.',
		hatenaRoot: 'http://www.hatena.ne.jp/',
		haikuRoot: 'http://h.hatena.ne.jp/',
		haikuAPIPrefix: 'http://h.hatena.ne.jp/api/',
		starRoot: 'http://s.hatena.ne.jp/',
		apiProxy: './server/hproxy.cgi',
		postProxy: './server/auth/post_proxy.cgi',
		helpDir: './help'
	    }
	},
	en: {
	    parameter: 'en',
	    applicationName: 'Mini Haiku',
	    title: 'Mini Haiku',
	    haikuTitle: 'Hatena Haiku',
	    description: 'Unofficial light Hatena Haiku',
	    afterSubtitleUserName: '\'s entries',
	    afterSubtitleFollowing: '\'s favorites',
	    showFormButtonLabel: 'Show Post Form',
	    messages: {
		replied: 'Replied.',
		confirmDelete: 'Delete this entry?',
		authDialogSubject: 'Authorization for Hatena.',
		hatenaID: 'Hatena ID',
		password: 'API Password*',
		passwordIsAPIPassword: '* Input your "API password".',
		okButtonLabel: 'OK',
		cancelButtonLabel: 'Cancel',
		saveButtonLabel: 'Save',
		saved: 'Saved',
		ngUser: 'Hidden Users',
		addButtonLabel: 'Add',
		removeButtonLabel: 'Remove',
		recentEntries: 'Recent Entries',
		hotKeywords: 'Hot Keywords >>',
		relatedKeywords: 'Related Keywords >>',
		userKeywords: 'Favorite Keywords >>',
		addCommentButtonLabel: 'send'
	    },
	    errorMessages: {
		noEntries: 'No entries.',
		entryFailed: 'Failed to get entries.',
		noKeywordsSearch: 'No keywords.',
		noKeywords: 'No keywords.',
		keywordSearchFailed: 'Failed to search keywords.',
		invalidNGUserName: 'User name is invalid.',
		entryNotFound: 'The entry is not found.',
		proxyError: 'An error occurred on Hatena.',
		unknown: 'The server returns an error.'
	    },
	    links: {
		settings: 'Settings',
		help: 'Help',
		userEntries: 'Entries',
		userFollowing: 'Favorites',
		userIDKeyword: 'About'
	    },
	    urls: {
		root: '?l=en',
		hatenaRoot: 'http://www.hatena.com/',
		haikuRoot: 'http://h.hatena.com/',
		haikuAPIPrefix: 'http://h.hatena.com/api/',
		starRoot: 'http://s.hatena.com/',
		apiProxy: './server/hproxy.cgi?l=en',
		postProxy: './server/auth/post_proxy.cgi?l=en',
		helpDir: './help_en'
	    }
	}
    };
    $LOCALE = (function() {
	var locale = $query['l'];
	if (locale == undefined) locale = 'ja';
	return $LOCALES[locale];
    })();
})();