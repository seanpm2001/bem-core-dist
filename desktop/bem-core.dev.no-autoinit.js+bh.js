/**
 * Modules
 *
 * Copyright (c) 2013 Filatov Dmitry (dfilatov@yandex-team.ru)
 * Dual licensed under the MIT and GPL licenses:
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
 *
 * @version 0.1.2
 */

(function(global) {

var undef,

    DECL_STATES = {
        NOT_RESOLVED : 'NOT_RESOLVED',
        IN_RESOLVING : 'IN_RESOLVING',
        RESOLVED     : 'RESOLVED'
    },

    /**
     * Creates a new instance of modular system
     * @returns {Object}
     */
    create = function() {
        var curOptions = {
                trackCircularDependencies : true,
                allowMultipleDeclarations : true
            },

            modulesStorage = {},
            waitForNextTick = false,
            pendingRequires = [],

            /**
             * Defines module
             * @param {String} name
             * @param {String[]} [deps]
             * @param {Function} declFn
             */
            define = function(name, deps, declFn) {
                if(!declFn) {
                    declFn = deps;
                    deps = [];
                }

                var module = modulesStorage[name];
                if(!module) {
                    module = modulesStorage[name] = {
                        name : name,
                        decl : undef
                    };
                }

                module.decl = {
                    name       : name,
                    prev       : module.decl,
                    fn         : declFn,
                    state      : DECL_STATES.NOT_RESOLVED,
                    deps       : deps,
                    dependents : [],
                    exports    : undef
                };
            },

            /**
             * Requires modules
             * @param {String|String[]} modules
             * @param {Function} cb
             * @param {Function} [errorCb]
             */
            require = function(modules, cb, errorCb) {
                if(typeof modules === 'string') {
                    modules = [modules];
                }

                if(!waitForNextTick) {
                    waitForNextTick = true;
                    nextTick(onNextTick);
                }

                pendingRequires.push({
                    deps : modules,
                    cb   : function(exports, error) {
                        error?
                            (errorCb || onError)(error) :
                            cb.apply(global, exports);
                    }
                });
            },

            /**
             * Returns state of module
             * @param {String} name
             * @returns {String} state, possible values are NOT_DEFINED, NOT_RESOLVED, IN_RESOLVING, RESOLVED
             */
            getState = function(name) {
                var module = modulesStorage[name];
                return module?
                    DECL_STATES[module.decl.state] :
                    'NOT_DEFINED';
            },

            /**
             * Returns whether the module is defined
             * @param {String} name
             * @returns {Boolean}
             */
            isDefined = function(name) {
                return !!modulesStorage[name];
            },

            /**
             * Sets options
             * @param {Object} options
             */
            setOptions = function(options) {
                for(var name in options) {
                    if(options.hasOwnProperty(name)) {
                        curOptions[name] = options[name];
                    }
                }
            },

            getStat = function() {
                var res = {},
                    module;

                for(var name in modulesStorage) {
                    if(modulesStorage.hasOwnProperty(name)) {
                        module = modulesStorage[name];
                        (res[module.decl.state] || (res[module.decl.state] = [])).push(name);
                    }
                }

                return res;
            },

            onNextTick = function() {
                waitForNextTick = false;
                applyRequires();
            },

            applyRequires = function() {
                var requiresToProcess = pendingRequires,
                    i = 0, require;

                pendingRequires = [];

                while(require = requiresToProcess[i++]) {
                    requireDeps(null, require.deps, [], require.cb);
                }
            },

            requireDeps = function(fromDecl, deps, path, cb) {
                var unresolvedDepsCnt = deps.length;
                if(!unresolvedDepsCnt) {
                    cb([]);
                }

                var decls = [],
                    onDeclResolved = function(_, error) {
                        if(error) {
                            cb(null, error);
                            return;
                        }

                        if(!--unresolvedDepsCnt) {
                            var exports = [],
                                i = 0, decl;
                            while(decl = decls[i++]) {
                                exports.push(decl.exports);
                            }
                            cb(exports);
                        }
                    },
                    i = 0, len = unresolvedDepsCnt,
                    dep, decl;

                while(i < len) {
                    dep = deps[i++];
                    if(typeof dep === 'string') {
                        if(!modulesStorage[dep]) {
                            cb(null, buildModuleNotFoundError(dep, fromDecl));
                            return;
                        }

                        decl = modulesStorage[dep].decl;
                    }
                    else {
                        decl = dep;
                    }

                    decls.push(decl);

                    startDeclResolving(decl, path, onDeclResolved);
                }
            },

            startDeclResolving = function(decl, path, cb) {
                if(decl.state === DECL_STATES.RESOLVED) {
                    cb(decl.exports);
                    return;
                }
                else if(decl.state === DECL_STATES.IN_RESOLVING) {
                    curOptions.trackCircularDependencies && isDependenceCircular(decl, path)?
                        cb(null, buildCircularDependenceError(decl, path)) :
                        decl.dependents.push(cb);
                    return;
                }

                decl.dependents.push(cb);

                if(decl.prev && !curOptions.allowMultipleDeclarations) {
                    provideError(decl, buildMultipleDeclarationError(decl));
                    return;
                }

                curOptions.trackCircularDependencies && (path = path.slice()).push(decl);

                var isProvided = false,
                    deps = decl.prev? decl.deps.concat([decl.prev]) : decl.deps;

                decl.state = DECL_STATES.IN_RESOLVING;
                requireDeps(
                    decl,
                    deps,
                    path,
                    function(depDeclsExports, error) {
                        if(error) {
                            provideError(decl, error);
                            return;
                        }

                        depDeclsExports.unshift(function(exports, error) {
                            if(isProvided) {
                                cb(null, buildDeclAreadyProvidedError(decl));
                                return;
                            }

                            isProvided = true;
                            error?
                                provideError(decl, error) :
                                provideDecl(decl, exports);
                        });

                        decl.fn.apply(
                            {
                                name   : decl.name,
                                deps   : decl.deps,
                                global : global
                            },
                            depDeclsExports);
                    });
            },

            provideDecl = function(decl, exports) {
                decl.exports = exports;
                decl.state = DECL_STATES.RESOLVED;

                var i = 0, dependent;
                while(dependent = decl.dependents[i++]) {
                    dependent(exports);
                }

                decl.dependents = undef;
            },

            provideError = function(decl, error) {
                decl.state = DECL_STATES.NOT_RESOLVED;

                var i = 0, dependent;
                while(dependent = decl.dependents[i++]) {
                    dependent(null, error);
                }

                decl.dependents = [];
            };

        return {
            create     : create,
            define     : define,
            require    : require,
            getState   : getState,
            isDefined  : isDefined,
            setOptions : setOptions,
            getStat    : getStat
        };
    },

    onError = function(e) {
        nextTick(function() {
            throw e;
        });
    },

    buildModuleNotFoundError = function(name, decl) {
        return Error(decl?
            'Module "' + decl.name + '": can\'t resolve dependence "' + name + '"' :
            'Required module "' + name + '" can\'t be resolved');
    },

    buildCircularDependenceError = function(decl, path) {
        var strPath = [],
            i = 0, pathDecl;
        while(pathDecl = path[i++]) {
            strPath.push(pathDecl.name);
        }
        strPath.push(decl.name);

        return Error('Circular dependence has been detected: "' + strPath.join(' -> ') + '"');
    },

    buildDeclAreadyProvidedError = function(decl) {
        return Error('Declaration of module "' + decl.name + '" has already been provided');
    },

    buildMultipleDeclarationError = function(decl) {
        return Error('Multiple declarations of module "' + decl.name + '" have been detected');
    },

    isDependenceCircular = function(decl, path) {
        var i = 0, pathDecl;
        while(pathDecl = path[i++]) {
            if(decl === pathDecl) {
                return true;
            }
        }
        return false;
    },

    nextTick = (function() {
        var fns = [],
            enqueueFn = function(fn) {
                return fns.push(fn) === 1;
            },
            callFns = function() {
                var fnsToCall = fns, i = 0, len = fns.length;
                fns = [];
                while(i < len) {
                    fnsToCall[i++]();
                }
            };

        if(typeof process === 'object' && process.nextTick) { // nodejs
            return function(fn) {
                enqueueFn(fn) && process.nextTick(callFns);
            };
        }

        if(global.setImmediate) { // ie10
            return function(fn) {
                enqueueFn(fn) && global.setImmediate(callFns);
            };
        }

        if(global.postMessage && !global.opera) { // modern browsers
            var isPostMessageAsync = true;
            if(global.attachEvent) {
                var checkAsync = function() {
                        isPostMessageAsync = false;
                    };
                global.attachEvent('onmessage', checkAsync);
                global.postMessage('__checkAsync', '*');
                global.detachEvent('onmessage', checkAsync);
            }

            if(isPostMessageAsync) {
                var msg = '__modules' + (+new Date()),
                    onMessage = function(e) {
                        if(e.data === msg) {
                            e.stopPropagation && e.stopPropagation();
                            callFns();
                        }
                    };

                global.addEventListener?
                    global.addEventListener('message', onMessage, true) :
                    global.attachEvent('onmessage', onMessage);

                return function(fn) {
                    enqueueFn(fn) && global.postMessage(msg, '*');
                };
            }
        }

        var doc = global.document;
        if('onreadystatechange' in doc.createElement('script')) { // ie6-ie8
            var head = doc.getElementsByTagName('head')[0],
                createScript = function() {
                    var script = doc.createElement('script');
                    script.onreadystatechange = function() {
                        script.parentNode.removeChild(script);
                        script = script.onreadystatechange = null;
                        callFns();
                    };
                    head.appendChild(script);
                };

            return function(fn) {
                enqueueFn(fn) && createScript();
            };
        }

        return function(fn) { // old browsers
            enqueueFn(fn) && setTimeout(callFns, 0);
        };
    })();

if(typeof exports === 'object') {
    module.exports = create();
}
else {
    global.modules = create();
}

})(typeof window !== 'undefined' ? window : global);

/* begin: ../../common.blocks/cookie/cookie.js */
/**
 * @module cookie
 * @description Inspired from $.cookie plugin by Klaus Hartl (stilbuero.de)
 */

modules.define('cookie', function(provide) {

provide(/** @exports */{
    /**
     * Returns cookie by given name
     * @param {String} name
     * @returns {String|null}
     */
    get : function(name) {
        var res = null;
        if(document.cookie && document.cookie !== '') {
            var cookies = document.cookie.split(';');
            for(var i = 0; i < cookies.length; i++) {
                var cookie = cookies[i].trim();
                // Does this cookie string begin with the name we want?
                if(cookie.substring(0, name.length + 1) === (name + '=')) {
                    res = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return res;
    },

    /**
     * Sets cookie by given name
     * @param {String} name
     * @param {String} val
     * @param {Object} options
     * @returns {cookie} this
     */
    set : function(name, val, options) {
        options = options || {};
        if(val === null) {
            val = '';
            options.expires = -1;
        }
        var expires = '';
        if(options.expires && (typeof options.expires === 'number' || options.expires.toUTCString)) {
            var date;
            if(typeof options.expires === 'number') {
                date = new Date();
                date.setTime(date.getTime() + (options.expires * 24 * 60 * 60 * 1000));
            } else {
                date = options.expires;
            }
            expires = '; expires=' + date.toUTCString(); // use expires attribute, max-age is not supported by IE
        }
        // CAUTION: Needed to parenthesize options.path and options.domain
        // in the following expressions, otherwise they evaluate to undefined
        // in the packed version for some reason...
        var path = options.path? '; path=' + (options.path) : '',
            domain = options.domain? '; domain=' + (options.domain) : '',
            secure = options.secure? '; secure' : '';
        document.cookie = [name, '=', encodeURIComponent(val), expires, path, domain, secure].join('');

        return this;
    }
});

});

/* end: ../../common.blocks/cookie/cookie.js */
/* begin: ../../common.blocks/dom/dom.js */
/**
 * @module dom
 * @description some DOM utils
 */

modules.define('dom', ['jquery'], function(provide, $) {

provide(/** @exports */{
    /**
     * Checks whether a DOM elem is in a context
     * @param {jQuery} ctx DOM elem where check is being performed
     * @param {jQuery} domElem DOM elem to check
     * @returns {Boolean}
     */
    contains : function(ctx, domElem) {
        var res = false;

        domElem.each(function() {
            var domNode = this;
            do {
                if(~ctx.index(domNode)) return !(res = true);
            } while(domNode = domNode.parentNode);

            return res;
        });

        return res;
    },

    /**
     * Returns current focused DOM elem in document
     * @returns {jQuery}
     */
    getFocused : function() {
        // "Error: Unspecified error." in iframe in IE9
        try { return $(document.activeElement); } catch(e) {}
    },

    /**
     * Checks whether a DOM element contains focus
     * @param {jQuery} domElem
     * @returns {Boolean}
     */
    containsFocus : function(domElem) {
        return this.contains(domElem, this.getFocused());
    },

    /**
    * Checks whether a browser currently can set focus on DOM elem
    * @param {jQuery} domElem
    * @returns {Boolean}
    */
    isFocusable : function(domElem) {
        var domNode = domElem[0];

        if(!domNode) return false;
        if(domNode.hasAttribute('tabindex')) return true;

        switch(domNode.tagName.toLowerCase()) {
            case 'iframe':
                return true;

            case 'input':
            case 'button':
            case 'textarea':
            case 'select':
                return !domNode.disabled;

            case 'a':
                return !!domNode.href;
        }

        return false;
    },

    /**
    * Checks whether a domElem is intended to edit text
    * @param {jQuery} domElem
    * @returns {Boolean}
    */
    isEditable : function(domElem) {
        var domNode = domElem[0];

        if(!domNode) return false;

        switch(domNode.tagName.toLowerCase()) {
            case 'input':
                var type = domNode.type;
                return (type === 'text' || type === 'password') && !domNode.disabled && !domNode.readOnly;

            case 'textarea':
                return !domNode.disabled && !domNode.readOnly;

            default:
                return domNode.contentEditable === 'true';
        }
    }
});

});

/* end: ../../common.blocks/dom/dom.js */
/* begin: ../../common.blocks/jquery/jquery.js */
/**
 * @module jquery
 * @description Provide jQuery (load if it does not exist).
 */

modules.define(
    'jquery',
    ['loader_type_js', 'jquery__config'],
    function(provide, loader, cfg) {

/* global jQuery */

function doProvide(preserveGlobal) {
    /**
     * @exports
     * @type Function
     */
    provide(preserveGlobal? jQuery : jQuery.noConflict(true));
}

typeof jQuery !== 'undefined'?
    doProvide(true) :
    loader(cfg.url, doProvide);
});

/* end: ../../common.blocks/jquery/jquery.js */
/* begin: ../../common.blocks/jquery/__config/jquery__config.js */
/**
 * @module jquery__config
 * @description Configuration for jQuery
 */

modules.define('jquery__config', function(provide) {

provide(/** @exports */{
    /**
     * URL for loading jQuery if it does not exist
     * @type {String}
     */
    url : 'https://yastatic.net/jquery/3.1.0/jquery.min.js'
});

});

/* end: ../../common.blocks/jquery/__config/jquery__config.js */
/* begin: ../../desktop.blocks/jquery/__config/jquery__config.js */
/**
 * @module jquery__config
 * @description Configuration for jQuery
 */

modules.define(
    'jquery__config',
    ['ua', 'objects'],
    function(provide, ua, objects, base) {

provide(
    ua.msie && parseInt(ua.version, 10) < 9?
        objects.extend(
            base,
            {
                url : 'https://yastatic.net/jquery/1.12.3/jquery.min.js'
            }) :
        base);

});

/* end: ../../desktop.blocks/jquery/__config/jquery__config.js */
/* begin: ../../desktop.blocks/ua/ua.js */
/**
 * @module ua
 * @description Detect some user agent features (works like jQuery.browser in jQuery 1.8)
 * @see http://code.jquery.com/jquery-migrate-1.1.1.js
 */

modules.define('ua', function(provide) {

var ua = navigator.userAgent.toLowerCase(),
    match = /(chrome)[ \/]([\w.]+)/.exec(ua) ||
        /(webkit)[ \/]([\w.]+)/.exec(ua) ||
        /(opera)(?:.*version|)[ \/]([\w.]+)/.exec(ua) ||
        /(msie) ([\w.]+)/.exec(ua) ||
        ua.indexOf('compatible') < 0 && /(mozilla)(?:.*? rv:([\w.]+)|)/.exec(ua) ||
        [],
    matched = {
        browser : match[1] || '',
        version : match[2] || '0'
    },
    browser = {};

if(matched.browser) {
    browser[matched.browser] = true;
    browser.version = matched.version;
}

if(browser.chrome) {
    browser.webkit = true;
} else if(browser.webkit) {
    browser.safari = true;
}

/**
 * @exports
 * @type Object
 */
provide(browser);

});

/* end: ../../desktop.blocks/ua/ua.js */
/* begin: ../../common.blocks/objects/objects.vanilla.js */
/**
 * @module objects
 * @description A set of helpers to work with JavaScript objects
 */

modules.define('objects', function(provide) {

var hasOwnProp = Object.prototype.hasOwnProperty;

provide(/** @exports */{
    /**
     * Extends a given target by
     * @param {Object} target object to extend
     * @param {Object} source
     * @returns {Object}
     */
    extend : function(target, source) {
        (typeof target !== 'object' || target === null) && (target = {});

        for(var i = 1, len = arguments.length; i < len; i++) {
            var obj = arguments[i];
            if(obj) {
                for(var key in obj) {
                    hasOwnProp.call(obj, key) && (target[key] = obj[key]);
                }
            }
        }

        return target;
    },

    /**
     * Check whether a given object is empty (contains no enumerable properties)
     * @param {Object} obj
     * @returns {Boolean}
     */
    isEmpty : function(obj) {
        for(var key in obj) {
            if(hasOwnProp.call(obj, key)) {
                return false;
            }
        }

        return true;
    },

    /**
     * Generic iterator function over object
     * @param {Object} obj object to iterate
     * @param {Function} fn callback
     * @param {Object} [ctx] callbacks's context
     */
    each : function(obj, fn, ctx) {
        for(var key in obj) {
            if(hasOwnProp.call(obj, key)) {
                ctx? fn.call(ctx, obj[key], key) : fn(obj[key], key);
            }
        }
    }
});

});

/* end: ../../common.blocks/objects/objects.vanilla.js */
/* begin: ../../common.blocks/events/events.vanilla.js */
/**
 * @module events
 */

modules.define(
    'events',
    ['identify', 'inherit', 'functions'],
    function(provide, identify, inherit, functions) {

var undef,
    storageExpando = '__' + (+new Date) + 'storage',

    /**
     * @class Event
     * @exports events:Event
     */
    Event = inherit(/** @lends Event.prototype */{
        /**
         * @constructor
         * @param {String} type
         * @param {Object} target
         */
        __constructor : function(type, target) {
            /**
             * Type
             * @member {String}
             */
            this.type = type;

            /**
             * Target
             * @member {Object}
             */
            this.target = target;

            /**
             * Data
             * @member {*}
             */
            this.data = undef;

            this._isDefaultPrevented = false;
            this._isPropagationStopped = false;
        },

        /**
         * Prevents default action
         */
        preventDefault : function() {
            this._isDefaultPrevented = true;
        },

        /**
         * Returns whether is default action prevented
         * @returns {Boolean}
         */
        isDefaultPrevented : function() {
            return this._isDefaultPrevented;
        },

        /**
         * Stops propagation
         */
        stopPropagation : function() {
            this._isPropagationStopped = true;
        },

        /**
         * Returns whether is propagation stopped
         * @returns {Boolean}
         */
        isPropagationStopped : function() {
            return this._isPropagationStopped;
        }
    }),

    /**
     * @class Emitter
     * @exports events:Emitter
     */
    Emitter = inherit(/** @lends Emitter.prototype */{
        /**
         * Adds an event handler
         * @param {String} e Event type
         * @param {Object} [data] Additional data that the handler gets as e.data
         * @param {Function} fn Handler
         * @param {Object} [ctx] Handler context
         * @returns {Emitter} this
         */
        on : function(e, data, fn, ctx, _special) {
            if(typeof e === 'string') {
                if(functions.isFunction(data)) {
                    ctx = fn;
                    fn = data;
                    data = undef;
                }

                var id = identify(fn, ctx),
                    storage = this[storageExpando] || (this[storageExpando] = {}),
                    eventTypes = e.split(' '), eventType,
                    i = 0, list, item,
                    eventStorage;

                while(eventType = eventTypes[i++]) {
                    eventStorage = storage[eventType] || (storage[eventType] = { ids : {}, list : {} });
                    if(!(id in eventStorage.ids)) {
                        list = eventStorage.list;
                        item = { fn : fn, data : data, ctx : ctx, special : _special };
                        if(list.last) {
                            list.last.next = item;
                            item.prev = list.last;
                        } else {
                            list.first = item;
                        }
                        eventStorage.ids[id] = list.last = item;
                    }
                }
            } else {
                for(var key in e) {
                    e.hasOwnProperty(key) && this.on(key, e[key], data, _special);
                }
            }

            return this;
        },

        /**
         * Adds a one time handler for the event.
         * Handler is executed only the next time the event is fired, after which it is removed.
         * @param {String} e Event type
         * @param {Object} [data] Additional data that the handler gets as e.data
         * @param {Function} fn Handler
         * @param {Object} [ctx] Handler context
         * @returns {Emitter} this
         */
        once : function(e, data, fn, ctx) {
            return this.on(e, data, fn, ctx, { once : true });
        },

        /**
         * Removes event handler or handlers
         * @param {String} [e] Event type
         * @param {Function} [fn] Handler
         * @param {Object} [ctx] Handler context
         * @returns {Emitter} this
         */
        un : function(e, fn, ctx) {
            if(typeof e === 'string' || typeof e === 'undefined') {
                var storage = this[storageExpando];
                if(storage) {
                    if(e) { // if event type was passed
                        var eventTypes = e.split(' '),
                            i = 0, eventStorage;
                        while(e = eventTypes[i++]) {
                            if(eventStorage = storage[e]) {
                                if(fn) {  // if specific handler was passed
                                    var id = identify(fn, ctx),
                                        ids = eventStorage.ids;
                                    if(id in ids) {
                                        var list = eventStorage.list,
                                            item = ids[id],
                                            prev = item.prev,
                                            next = item.next;

                                        if(prev) {
                                            prev.next = next;
                                        } else if(item === list.first) {
                                            list.first = next;
                                        }

                                        if(next) {
                                            next.prev = prev;
                                        } else if(item === list.last) {
                                            list.last = prev;
                                        }

                                        delete ids[id];
                                    }
                                } else {
                                    delete this[storageExpando][e];
                                }
                            }
                        }
                    } else {
                        delete this[storageExpando];
                    }
                }
            } else {
                for(var key in e) {
                    e.hasOwnProperty(key) && this.un(key, e[key], fn);
                }
            }

            return this;
        },

        /**
         * Fires event handlers
         * @param {String|events:Event} e Event
         * @param {Object} [data] Additional data
         * @returns {Emitter} this
         */
        emit : function(e, data) {
            var storage = this[storageExpando],
                eventInstantiated = false;

            if(storage) {
                var eventTypes = [typeof e === 'string'? e : e.type, '*'],
                    i = 0, eventType, eventStorage;
                while(eventType = eventTypes[i++]) {
                    if(eventStorage = storage[eventType]) {
                        var item = eventStorage.list.first,
                            lastItem = eventStorage.list.last,
                            res;
                        while(item) {
                            if(!eventInstantiated) { // instantiate Event only on demand
                                eventInstantiated = true;
                                typeof e === 'string' && (e = new Event(e));
                                e.target || (e.target = this);
                            }

                            e.data = item.data;
                            res = item.fn.apply(item.ctx || this, arguments);
                            if(res === false) {
                                e.preventDefault();
                                e.stopPropagation();
                            }

                            item.special && item.special.once &&
                                this.un(e.type, item.fn, item.ctx);

                            if(item === lastItem) {
                                break;
                            }

                            item = item.next;
                        }
                    }
                }
            }

            return this;
        }
    });

provide({
    Emitter : Emitter,
    Event : Event
});

});

/* end: ../../common.blocks/events/events.vanilla.js */
/* begin: ../../common.blocks/inherit/inherit.vanilla.js */
/**
 * @module inherit
 * @version 2.2.1
 * @author Filatov Dmitry <dfilatov@yandex-team.ru>
 * @description This module provides some syntax sugar for "class" declarations, constructors, mixins, "super" calls and static members.
 */

(function(global) {

var hasIntrospection = (function(){'_';}).toString().indexOf('_') > -1,
    emptyBase = function() {},
    hasOwnProperty = Object.prototype.hasOwnProperty,
    objCreate = Object.create || function(ptp) {
        var inheritance = function() {};
        inheritance.prototype = ptp;
        return new inheritance();
    },
    objKeys = Object.keys || function(obj) {
        var res = [];
        for(var i in obj) {
            hasOwnProperty.call(obj, i) && res.push(i);
        }
        return res;
    },
    extend = function(o1, o2) {
        for(var i in o2) {
            hasOwnProperty.call(o2, i) && (o1[i] = o2[i]);
        }

        return o1;
    },
    toStr = Object.prototype.toString,
    isArray = Array.isArray || function(obj) {
        return toStr.call(obj) === '[object Array]';
    },
    isFunction = function(obj) {
        return toStr.call(obj) === '[object Function]';
    },
    noOp = function() {},
    needCheckProps = true,
    testPropObj = { toString : '' };

for(var i in testPropObj) { // fucking ie hasn't toString, valueOf in for
    testPropObj.hasOwnProperty(i) && (needCheckProps = false);
}

var specProps = needCheckProps? ['toString', 'valueOf'] : null;

function getPropList(obj) {
    var res = objKeys(obj);
    if(needCheckProps) {
        var specProp, i = 0;
        while(specProp = specProps[i++]) {
            obj.hasOwnProperty(specProp) && res.push(specProp);
        }
    }

    return res;
}

function override(base, res, add) {
    var addList = getPropList(add),
        j = 0, len = addList.length,
        name, prop;
    while(j < len) {
        if((name = addList[j++]) === '__self') {
            continue;
        }
        prop = add[name];
        if(isFunction(prop) &&
                (!hasIntrospection || prop.toString().indexOf('.__base') > -1)) {
            res[name] = (function(name, prop) {
                var baseMethod = base[name]?
                        base[name] :
                        name === '__constructor'? // case of inheritance from plane function
                            res.__self.__parent :
                            noOp;
                return function() {
                    var baseSaved = this.__base;
                    this.__base = baseMethod;
                    var res = prop.apply(this, arguments);
                    this.__base = baseSaved;
                    return res;
                };
            })(name, prop);
        } else {
            res[name] = prop;
        }
    }
}

function applyMixins(mixins, res) {
    var i = 1, mixin;
    while(mixin = mixins[i++]) {
        res?
            isFunction(mixin)?
                inherit.self(res, mixin.prototype, mixin) :
                inherit.self(res, mixin) :
            res = isFunction(mixin)?
                inherit(mixins[0], mixin.prototype, mixin) :
                inherit(mixins[0], mixin);
    }
    return res || mixins[0];
}

/**
* Creates class
* @exports
* @param {Function|Array} [baseClass|baseClassAndMixins] class (or class and mixins) to inherit from
* @param {Object} prototypeFields
* @param {Object} [staticFields]
* @returns {Function} class
*/
function inherit() {
    var args = arguments,
        withMixins = isArray(args[0]),
        hasBase = withMixins || isFunction(args[0]),
        base = hasBase? withMixins? applyMixins(args[0]) : args[0] : emptyBase,
        props = args[hasBase? 1 : 0] || {},
        staticProps = args[hasBase? 2 : 1],
        res = props.__constructor || (hasBase && base.prototype.__constructor)?
            function() {
                return this.__constructor.apply(this, arguments);
            } :
            hasBase?
                function() {
                    return base.apply(this, arguments);
                } :
                function() {};

    if(!hasBase) {
        res.prototype = props;
        res.prototype.__self = res.prototype.constructor = res;
        return extend(res, staticProps);
    }

    extend(res, base);

    res.__parent = base;

    var basePtp = base.prototype,
        resPtp = res.prototype = objCreate(basePtp);

    resPtp.__self = resPtp.constructor = res;

    props && override(basePtp, resPtp, props);
    staticProps && override(base, res, staticProps);

    return res;
}

inherit.self = function() {
    var args = arguments,
        withMixins = isArray(args[0]),
        base = withMixins? applyMixins(args[0], args[0][0]) : args[0],
        props = args[1],
        staticProps = args[2],
        basePtp = base.prototype;

    props && override(basePtp, basePtp, props);
    staticProps && override(base, base, staticProps);

    return base;
};

var defineAsGlobal = true;
if(typeof exports === 'object') {
    module.exports = inherit;
    defineAsGlobal = false;
}

if(typeof modules === 'object') {
    modules.define('inherit', function(provide) {
        provide(inherit);
    });
    defineAsGlobal = false;
}

if(typeof define === 'function') {
    define(function(require, exports, module) {
        module.exports = inherit;
    });
    defineAsGlobal = false;
}

defineAsGlobal && (global.inherit = inherit);

})(this);

/* end: ../../common.blocks/inherit/inherit.vanilla.js */
/* begin: ../../common.blocks/identify/identify.vanilla.js */
/**
 * @module identify
 */

modules.define('identify', function(provide) {

var counter = 0,
    expando = '__' + (+new Date),
    global = this.global,
    get = function() {
        return 'uniq' + (++counter);
    },
    identify = function(obj) {
        if((typeof obj === 'object' && obj !== null) || typeof obj === 'function') {
            var key;
            if('uniqueID' in obj) {
                obj === global.document && (obj = obj.documentElement);
                key = 'uniqueID';
            } else {
                key = expando;
            }
            return key in obj?
                obj[key] :
                obj[key] = get();
        }

        return '';
    };

provide(
    /**
     * Makes unique ID
     * @exports
     * @param {?...Object} obj Object that needs to be identified
     * @returns {String} ID
     */
    function(obj) {
        if(arguments.length) {
            if(arguments.length === 1) {
                return identify(obj);
            }

            var res = [];
            for(var i = 0, len = arguments.length; i < len; i++) {
                res.push(identify(arguments[i]));
            }
            return res.sort().join('');
        }

        return get();
    }
);

});

/* end: ../../common.blocks/identify/identify.vanilla.js */
/* begin: ../../common.blocks/functions/functions.vanilla.js */
/**
 * @module functions
 * @description A set of helpers to work with JavaScript functions
 */

modules.define('functions', function(provide) {

var toStr = Object.prototype.toString;

provide(/** @exports */{
    /**
     * Checks whether a given object is function
     * @param {*} obj
     * @returns {Boolean}
     */
    isFunction : function(obj) {
        return toStr.call(obj) === '[object Function]';
    },

    /**
     * Empty function
     */
    noop : function() {}
});

});

/* end: ../../common.blocks/functions/functions.vanilla.js */
/* begin: ../../common.blocks/events/__channels/events__channels.vanilla.js */
/**
 * @module events__channels
 */

modules.define('events__channels', ['events'], function(provide, events) {

var undef,
    channels = {};

provide(
    /**
     * Returns/destroys a named communication channel
     * @exports
     * @param {String} [id='default'] Channel ID
     * @param {Boolean} [drop=false] Destroy the channel
     * @returns {events:Emitter|undefined} Communication channel
     */
    function(id, drop) {
        if(typeof id === 'boolean') {
            drop = id;
            id = undef;
        }

        id || (id = 'default');

        if(drop) {
            if(channels[id]) {
                channels[id].un();
                delete channels[id];
            }
            return;
        }

        return channels[id] || (channels[id] = new events.Emitter());
    });
});

/* end: ../../common.blocks/events/__channels/events__channels.vanilla.js */
/* begin: ../../common.blocks/events/__observable/events__observable.js */
/**
 * @module events__observable
 */

modules.define(
    'events__observable',
    ['inherit'],
    function(provide, inherit) {

/**
 * @class Observable
 */
var Observable = inherit(/** @lends Observable.prototype */{
    /**
     * @constructor
     * @param {Object} emitter
     */
    __constructor : function(emitter) {
        this._emitter = emitter;
    },

    /**
     * Adds an event handler
     * @param {String} e Event type
     * @param {Object} [data] Additional data that the handler gets as e.data
     * @param {Function} fn Handler
     * @param {Object} [fnCtx] Context
     * @returns {Observable} this
     */
    on : function(e, data, fn, fnCtx) {
        this._emitter.on.apply(this._emitter, arguments);
        return this;
    },

    /**
     * Adds an event handler
     * @param {String} e Event type
     * @param {Object} [data] Additional data that the handler gets as e.data
     * @param {Function} fn Handler
     * @param {Object} [fnCtx] Context
     * @returns {Observable} this
     */
    once : function(e, data, fn, fnCtx) {
        this._emitter.once.apply(this._emitter, arguments);
        return this;
    },

    /**
     * Removes event handler
     * @param {String} [e] Event type
     * @param {Function} [fn] Handler
     * @param {Object} [fnCtx] Context
     * @returns {Observable} this
     */
    un : function(e, fn, fnCtx) {
        this._emitter.un.apply(this._emitter, arguments);
        return this;
    }
});

provide(
    /**
     * Creates new observable
     * @exports
     * @param {events:Emitter} emitter
     * @returns {Observable}
     */
    function(emitter) {
        return new Observable(emitter);
    }
);

});

/* end: ../../common.blocks/events/__observable/events__observable.js */
/* begin: ../../common.blocks/i-bem-dom/i-bem-dom.js */
/**
 * @module i-bem-dom
 */

modules.define(
    'i-bem-dom',
    [
        'i-bem',
        'i-bem__internal',
        'i-bem-dom__collection',
        'i-bem-dom__events_type_dom',
        'i-bem-dom__events_type_bem',
        'inherit',
        'identify',
        'objects',
        'functions',
        'jquery',
        'dom'
    ],
    function(
        provide,
        bem,
        bemInternal,
        BemDomCollection,
        domEvents,
        bemEvents,
        inherit,
        identify,
        objects,
        functions,
        $,
        dom) {

var undef,
    /**
     * Storage for DOM elements by unique key
     * @type Object
     */
    uniqIdToDomElems = {},

    /**
     * Storage for blocks by unique key
     * @type Object
     */
    uniqIdToEntity = {},

    /**
    * Storage for DOM element's parent nodes
    * @type Object
    */
    domNodesToParents = {},

    /**
     * Storage for block parameters
     * @type Object
     */
    domElemToParams = {},

    /**
     * Storage for DOM nodes that are being destructed
     * @type Object
     */
    destructingDomNodes = {},

    entities = bem.entities,

    BEM_CLASS_NAME = 'i-bem',
    BEM_SELECTOR = '.' + BEM_CLASS_NAME,
    BEM_PARAMS_ATTR = 'data-bem',

    NAME_PATTERN = bemInternal.NAME_PATTERN,

    MOD_DELIM = bemInternal.MOD_DELIM,
    ELEM_DELIM = bemInternal.ELEM_DELIM,

    buildModPostfix = bemInternal.buildModPostfix,
    buildClassName = bemInternal.buildClassName,

    reverse = Array.prototype.reverse,
    slice = Array.prototype.slice,

    domEventManagerFactory = new domEvents.EventManagerFactory(getEntityCls),
    bemEventManagerFactory = new bemEvents.EventManagerFactory(getEntityCls),

    bemDom;

/**
 * Initializes entities on a DOM element
 * @param {jQuery} domElem DOM element
 * @param {String} uniqInitId ID of the "initialization wave"
 * @param {Object} [dropElemCacheQueue] queue of elems to be droped from cache
 */
function initEntities(domElem, uniqInitId, dropElemCacheQueue) {
    var domNode = domElem[0],
        params = getParams(domNode),
        entityName,
        splitted,
        blockName,
        elemName;

    for(entityName in params) {
        if(dropElemCacheQueue) {
            splitted = entityName.split(ELEM_DELIM);
            blockName = splitted[0];
            elemName = splitted[1];
            elemName &&
                ((dropElemCacheQueue[blockName] ||
                    (dropElemCacheQueue[blockName] = {}))[elemName] = true);
        }

        initEntity(
            entityName,
            domElem,
            processParams(params[entityName], entityName, uniqInitId));
    }
}

/**
 * Initializes a specific entity on a DOM element, or returns the existing entity if it was already created
 * @param {String} entityName Entity name
 * @param {jQuery} domElem DOM element
 * @param {Object} [params] Initialization parameters
 * @param {Boolean} [ignoreLazyInit=false] Ignore lazy initialization
 * @param {Function} [callback] Handler to call after complete initialization
 */
function initEntity(entityName, domElem, params, ignoreLazyInit, callback) {
    var domNode = domElem[0];

    if(destructingDomNodes[identify(domNode)]) return;

    params || (params = processParams(getEntityParams(domNode, entityName), entityName));

    var uniqId = params.uniqId,
        entity = uniqIdToEntity[uniqId];

    if(entity) {
        if(entity.domElem.index(domNode) < 0) {
            entity.domElem = entity.domElem.add(domElem);
            objects.extend(entity.params, params);
        }

        return entity;
    }

    uniqIdToDomElems[uniqId] = uniqIdToDomElems[uniqId]?
        uniqIdToDomElems[uniqId].add(domElem) :
        domElem;

    var parentDomNode = domNode.parentNode;
    if(!parentDomNode || parentDomNode.nodeType === 11) { // jquery doesn't unique disconnected node
        $.unique(uniqIdToDomElems[uniqId]);
    }

    var entityCls = getEntityCls(entityName);

    entityCls._processInit();

    if(!entityCls.lazyInit || ignoreLazyInit || params.lazyInit === false) {
        ignoreLazyInit && domElem.addClass(BEM_CLASS_NAME); // add css class for preventing memory leaks in further destructing

        entity = new entityCls(uniqIdToDomElems[uniqId], params, !!ignoreLazyInit);
        delete uniqIdToDomElems[uniqId];
        callback && callback.apply(entity, slice.call(arguments, 4));
        return entity;
    }
}

function getEntityCls(entityName) {
    if(entities[entityName]) return entities[entityName];

    var splitted = entityName.split(ELEM_DELIM);
    return splitted[1]?
        bemDom.declElem(splitted[0], splitted[1], {}, { lazyInit : true }, true) :
        bemDom.declBlock(entityName, {}, { lazyInit : true }, true);
}

/**
 * Processes and adds necessary entity parameters
 * @param {Object} params Initialization parameters
 * @param {String} entityName Entity name
 * @param {String} [uniqInitId] ID of the "initialization wave"
 */
function processParams(params, entityName, uniqInitId) {
    params.uniqId ||
        (params.uniqId = (params.id?
            entityName + '-id-' + params.id :
            identify()) + (uniqInitId || identify()));

    return params;
}

/**
 * Helper for searching for a DOM element using a selector inside the context, including the context itself
 * @param {jQuery} ctx Context
 * @param {String} selector CSS selector
 * @param {Boolean} [excludeSelf=false] Exclude context from search
 * @returns {jQuery}
 */
function findDomElem(ctx, selector, excludeSelf) {
    var res = ctx.find(selector);
    return excludeSelf?
       res :
       res.add(ctx.filter(selector));
}

/**
 * Returns parameters of an entity's DOM element
 * @param {HTMLElement} domNode DOM node
 * @returns {Object}
 */
function getParams(domNode) {
    var uniqId = identify(domNode);
    return domElemToParams[uniqId] ||
        (domElemToParams[uniqId] = extractParams(domNode));
}

/**
 * Returns parameters of an entity extracted from DOM node
 * @param {HTMLElement} domNode DOM node
 * @param {String} blockName
 * @returns {Object}
 */

function getEntityParams(domNode, blockName) {
    var params = getParams(domNode);
    return params[blockName] || (params[blockName] = {});
}

/**
 * Retrieves entity parameters from a DOM element
 * @param {HTMLElement} domNode DOM node
 * @returns {Object}
 */
function extractParams(domNode) {
    var attrVal = domNode.getAttribute(BEM_PARAMS_ATTR);
    return attrVal? JSON.parse(attrVal) : {};
}

/**
 * Uncouple DOM node from the entity. If this is the last node, then destroys the entity.
 * @param {BemDomEntity} entity entity
 * @param {HTMLElement} domNode DOM node
 */
function removeDomNodeFromEntity(entity, domNode) {
    if(entity.domElem.length === 1) {
        entity._delInitedMod();
        delete uniqIdToEntity[entity._uniqId];
    } else {
        entity.domElem = entity.domElem.not(domNode);
    }
}

/**
 * Stores DOM node's parent nodes to the storage
 * @param {jQuery} domElem
 */
function storeDomNodeParents(domElem) {
    domElem.each(function() {
        domNodesToParents[identify(this)] = this.parentNode;
    });
}

/**
 * Clears the cache for elements in context
 * @param {jQuery} ctx
 */
function dropElemCacheForCtx(ctx, dropElemCacheQueue) {
    ctx.add(ctx.parents()).each(function(_, domNode) {
        var params = domElemToParams[identify(domNode)];

        params && objects.each(params, function(entityParams) {
            var entity = uniqIdToEntity[entityParams.uniqId];
            if(entity) {
                var elemNames = dropElemCacheQueue[entity.__self._blockName];
                elemNames && entity._dropElemCache(Object.keys(elemNames));
            }
        });
    });

    dropElemCacheQueue = {};
}

/**
 * Build key for elem
 * @param {Function|String|Object} elem Element class or name or description elem, modName, modVal
 * @returns {Object}
 */
function buildElemKey(elem) {
    if(typeof elem === 'string') {
        elem = { elem : elem };
    } else if(functions.isFunction(elem)) {
        elem = { elem : elem.getName() };
    } else if(functions.isFunction(elem.elem)) {
        elem.elem = elem.elem.getName();
    }

    return {
        elem : elem.elem,
        mod : buildModPostfix(elem.modName, elem.modVal)
    };
}

// jscs:disable requireMultipleVarDecl

/**
 * Returns jQuery collection for provided HTML
 * @param {jQuery|String} html
 * @returns {jQuery}
 */
function getJqueryCollection(html) {
    return $(typeof html === 'string'? $.parseHTML(html, null, true) : html);
}

/**
 * Validates block to be class or specified description
 * @param {*} Block Any argument passed to find*Block as Block
 * @throws {Error} Will throw an error if the Block argument isn't correct
 */
function validateBlockParam(Block) {
    if(
        typeof Block === 'string' ||
        typeof Block === 'object' && typeof Block.block === 'string'
    ) {
        throw new Error('Block must be a class or description (block, modName, modVal) of the block to find');
    }
}

/**
 * @class BemDomEntity
 * @description Base mix for BEM entities that have DOM representation
 */
var BemDomEntity = inherit(/** @lends BemDomEntity.prototype */{
    /**
     * @constructor
     * @private
     * @param {jQuery} domElem DOM element that the entity is created on
     * @param {Object} params parameters
     * @param {Boolean} [initImmediately=true]
     */
    __constructor : function(domElem, params, initImmediately) {
        /**
         * DOM elements of entity
         * @member {jQuery}
         * @readonly
         */
        this.domElem = domElem;

        /**
         * Cache for elements collections
         * @member {Object}
         * @private
         */
        this._elemsCache = {};

        /**
         * Cache for elements
         * @member {Object}
         * @private
         */
        this._elemCache = {};

        /**
         * References to parent entities which found current entity ever
         * @type {Array}
         * @private
         */
        this._findBackRefs = [];

        uniqIdToEntity[params.uniqId || identify(this)] = this;

        this.__base(null, params, initImmediately);
    },

    /**
     * @abstract
     * @protected
     * @returns {Block}
     */
    _block : function() {},

    /**
     * Lazy search for elements nested in a block (caches results)
     * @protected
     * @param {Function|String|Object} Elem Element class or name or description elem, modName, modVal
     * @returns {BemDomCollection}
     */
    _elems : function(Elem) {
        var key = buildElemKey(Elem),
            elemsCache = this._elemsCache[key.elem];

        if(elemsCache && key.mod in elemsCache)
            return elemsCache[key.mod];

        var res = (elemsCache || (this._elemsCache[key.elem] = {}))[key.mod] =
            this.findMixedElems(Elem).concat(this.findChildElems(Elem));

        res.forEach(function(entity) {
            entity._findBackRefs.push(this);
        }, this);

        return res;
    },

    /**
     * Lazy search for the first element nested in a block (caches results)
     * @protected
     * @param {Function|String|Object} Elem Element class or name or description elem, modName, modVal
     * @returns {Elem}
     */
    _elem : function(Elem) {
        var key = buildElemKey(Elem),
            elemCache = this._elemCache[key.elem];

        // NOTE: can use this._elemsCache but it's too rare case
        if(elemCache && key.mod in elemCache)
            return elemCache[key.mod];

        var res = (elemCache || (this._elemCache[key.elem] = {}))[key.mod] =
            this.findMixedElem(Elem) || this.findChildElem(Elem);

        res && res._findBackRefs.push(this);

        return res;
    },

    /**
     * Clears the cache for elements
     * @private
     * @param {?...(Function|String|Object)} elems Nested elements names or description elem, modName, modVal
     * @returns {BemDomEntity} this
     */
    _dropElemCache : function(elems) {
        if(!arguments.length) {
            this._elemsCache = {};
            this._elemCache = {};
            return this;
        }

        (Array.isArray(elems)? elems : slice.call(arguments)).forEach(function(elem) {
            var key = buildElemKey(elem);
            if(key.mod) {
                this._elemsCache[key.elem] && delete this._elemsCache[key.elem][key.mod];
                this._elemCache[key.elem] && delete this._elemCache[key.elem][key.mod];
            } else {
                delete this._elemsCache[key.elem];
                delete this._elemCache[key.elem];
            }
        }, this);

        return this;
    },

    /**
     * Finds the first child block
     * @param {Function|Object} Block Block class or description (block, modName, modVal) of the block to find
     * @returns {Block}
     */
    findChildBlock : function(Block) {
        validateBlockParam(Block);

        return this._findEntities('find', Block, true);
    },

    /**
     * Finds child blocks
     * @param {Function|Object} Block Block class or description (block, modName, modVal) of the block to find
     * @returns {BemDomCollection}
     */
    findChildBlocks : function(Block) {
        validateBlockParam(Block);

        return this._findEntities('find', Block);
    },

    /**
     * Finds the first parent block
     * @param {Function|Object} Block Block class or description (block, modName, modVal) of the block to find
     * @returns {Block}
     */
    findParentBlock : function(Block) {
        validateBlockParam(Block);

        return this._findEntities('parents', Block, true);
    },

    /**
     * Finds parent blocks
     * @param {Function|Object} Block Block class or description (block, modName, modVal) of the block to find
     * @returns {BemDomCollection}
     */
    findParentBlocks : function(Block) {
        validateBlockParam(Block);

        return this._findEntities('parents', Block);
    },

    /**
     * Finds first mixed block
     * @param {Function|Object} Block Block class or description (block, modName, modVal) of the block to find
     * @returns {Block}
     */
    findMixedBlock : function(Block) {
        validateBlockParam(Block);

        return this._findEntities('filter', Block, true);
    },

    /**
     * Finds mixed blocks
     * @param {Function|Object} Block Block class or description (block, modName, modVal) of the block to find
     * @returns {BemDomCollection}
     */
    findMixedBlocks : function(Block) {
        validateBlockParam(Block);

        return this._findEntities('filter', Block);
    },

    /**
     * Finds the first child element
     * @param {Function|String|Object} Elem Element class or name or description elem, modName, modVal
     * @param {Boolean} [strictMode=false]
     * @returns {Elem}
     */
    findChildElem : function(Elem, strictMode) {
        return strictMode?
            this._filterFindElemResults(this._findEntities('find', Elem)).get(0) :
            this._findEntities('find', Elem, true);
    },

    /**
     * Finds child elements
     * @param {Function|String|Object} Elem Element class or name or description elem, modName, modVal
     * @param {Boolean} [strictMode=false]
     * @returns {BemDomCollection}
     */
    findChildElems : function(Elem, strictMode) {
        var res = this._findEntities('find', Elem);

        return strictMode?
            this._filterFindElemResults(res) :
            res;
    },

    /**
     * Finds the first parent element
     * @param {Function|String|Object} Elem Element class or name or description elem, modName, modVal
     * @param {Boolean} [strictMode=false]
     * @returns {Elem}
     */
    findParentElem : function(Elem, strictMode) {
        return strictMode?
            this._filterFindElemResults(this._findEntities('parents', Elem))[0] :
            this._findEntities('parents', Elem, true);
    },

    /**
     * Finds parent elements
     * @param {Function|String|Object} Elem Element class or name or description elem, modName, modVal
     * @param {Boolean} [strictMode=false]
     * @returns {BemDomCollection}
     */
    findParentElems : function(Elem, strictMode) {
        var res = this._findEntities('parents', Elem);
        return strictMode? this._filterFindElemResults(res) : res;
    },

    /**
     * Finds the first mixed element
     * @param {Function|String|Object} Elem Element class or name or description elem, modName, modVal
     * @returns {Elem}
     */
    findMixedElem : function(Elem) {
        return this._findEntities('filter', Elem, true);
    },

    /**
     * Finds mixed elements.
     * @param {Function|String|Object} Elem Element class or name or description elem, modName, modVal
     * @returns {BemDomCollection}
     */
    findMixedElems : function(Elem) {
        return this._findEntities('filter', Elem);
    },

    /**
     * Filters results of findElem helper execution in strict mode
     * @private
     * @param {BemDomCollection} res Elements
     * @returns {BemDomCollection}
     */
    _filterFindElemResults : function(res) {
        var block = this._block();
        return res.filter(function(elem) {
            return elem._block() === block;
        });
    },

    /**
     * Finds entities
     * @private
     * @param {String} select
     * @param {Function|String|Object} entity
     * @param {Boolean} [onlyFirst=false]
     * @returns {*}
     */
    _findEntities : function(select, entity, onlyFirst) {
        var entityName = functions.isFunction(entity)?
                entity.getEntityName() :
                typeof entity === 'object'?
                    entity.block?
                        entity.block.getEntityName() :
                        typeof entity.elem === 'string'?
                            this.__self._blockName + ELEM_DELIM + entity.elem :
                            entity.elem.getEntityName() :
                    this.__self._blockName + ELEM_DELIM + entity,
            selector = '.' +
                (typeof entity === 'object'?
                    buildClassName(
                        entityName,
                        entity.modName,
                        typeof entity.modVal === 'undefined'?
                            true :
                            entity.modVal) :
                    entityName) +
                (onlyFirst? ':first' : ''),
            domElems = this.domElem[select](selector);

        if(onlyFirst) return domElems[0]?
            initEntity(entityName, domElems.eq(0), undef, true)._setInitedMod() :
            null;

        var res = [],
            uniqIds = {};

        domElems.each(function(i, domElem) {
            var block = initEntity(entityName, $(domElem), undef, true)._setInitedMod();
            if(!uniqIds[block._uniqId]) {
                uniqIds[block._uniqId] = true;
                res.push(block);
            }
        });

        return new BemDomCollection(res);
    },

    /**
     * Returns an manager to bind and unbind DOM events for particular context
     * @protected
     * @param {Function|String|Object|Elem|BemDomCollection|document|window} [ctx=this.domElem] context to bind,
     *     can be BEM-entity class, instance, collection of BEM-entities,
     *     element name or description (elem, modName, modVal), document or window
     * @returns {EventManager}
     */
    _domEvents : function(ctx) {
        return domEventManagerFactory.getEventManager(this, ctx, this.domElem);
    },

    /**
     * Returns an manager to bind and unbind BEM events for particular context
     * @protected
     * @param {Function|String|BemDomEntity|BemDomCollection|Object} [ctx=this.domElem] context to bind,
     *     can be BEM-entity class, instance, collection of BEM-entities,
     *     element name or description (elem, modName, modVal)
     * @returns {EventManager}
     */
    _events : function(ctx) {
        return bemEventManagerFactory.getEventManager(this, ctx, this.domElem);
    },

    /**
     * Executes the BEM entity's event handlers and delegated handlers
     * @protected
     * @param {String|Object|events:Event} e Event name
     * @param {Object} [data] Additional information
     * @returns {BemEntity} this
     */
    _emit : function(e, data) {
        if((typeof e === 'object' && e.modName === 'js') || this.hasMod('js', 'inited')) {
            bemEvents.emit(this, e, data);
        }

        return this;
    },

    /** @override */
    _extractModVal : function(modName) {
        var domNode = this.domElem[0],
            matches;

        domNode &&
            (matches = domNode.className
                .match(this.__self._buildModValRE(modName)));

        return matches? matches[2] || true : '';
    },

    /** @override */
    _onSetMod : function(modName, modVal, oldModVal) {
        var _self = this.__self,
            name = _self.getName();

        this._findBackRefs.forEach(function(ref) {
            oldModVal === '' || ref._dropElemCache({ elem : name, modName : modName, modVal : oldModVal });
            ref._dropElemCache(modVal === ''? name : { elem : name, modName : modName, modVal : modVal });
        });

        this.__base.apply(this, arguments);

        if(modName !== 'js' || modVal !== '') {
            var classNamePrefix = _self._buildModClassNamePrefix(modName),
                classNameRE = _self._buildModValRE(modName),
                needDel = modVal === '';

            this.domElem.each(function() {
                var className = this.className,
                    modClassName = classNamePrefix;

                modVal !== true && (modClassName += MOD_DELIM + modVal);

                (oldModVal === true?
                    classNameRE.test(className) :
                    (' ' + className).indexOf(' ' + classNamePrefix + MOD_DELIM) > -1)?
                        this.className = className.replace(
                            classNameRE,
                            (needDel? '' : '$1' + modClassName)) :
                        needDel || $(this).addClass(modClassName);
            });
        }
    },

    /** @override */
    _afterSetMod : function(modName, modVal, oldModVal) {
        var eventData = { modName : modName, modVal : modVal, oldModVal : oldModVal };
        this
            ._emit({ modName : modName, modVal : '*' }, eventData)
            ._emit({ modName : modName, modVal : modVal }, eventData);
    },

    /**
     * Checks whether an entity is in the entity
     * @param {BemDomEntity} entity entity
     * @returns {Boolean}
     */
    containsEntity : function(entity) {
        return dom.contains(this.domElem, entity.domElem);
    }

}, /** @lends BemDomEntity */{
    /** @override */
    create : function() {
        throw Error('bemDom entities can not be created otherwise than from DOM');
    },

    /** @override */
    _processInit : function(heedInit) {
        /* jshint eqeqeq: false */
        if(this.onInit && this._inited == heedInit) {
            this.__base(heedInit);

            this.onInit();

            var name = this.getName(),
                origOnInit = this.onInit;

            // allow future calls of init only in case of inheritance in other block
            this.init = function() {
                this.getName() === name && origOnInit.apply(this, arguments);
            };
        }
    },

    /**
     * Returns an manager to bind and unbind events for particular context
     * @protected
     * @param {Function|String|Object} [ctx] context to bind,
     *     can be BEM-entity class, instance, element name or description (elem, modName, modVal)
     * @returns {EventManager}
     */
    _domEvents : function(ctx) {
        return domEventManagerFactory.getEventManager(this, ctx, bemDom.scope);
    },

    /**
     * Returns an manager to bind and unbind BEM events for particular context
     * @protected
     * @param {Function|String|Object} [ctx] context to bind,
     *     can be BEM-entity class, instance, element name or description (block or elem, modName, modVal)
     * @returns {EventManager}
     */
    _events : function(ctx) {
        return bemEventManagerFactory.getEventManager(this, ctx, bemDom.scope);
    },

    /**
     * Builds a prefix for the CSS class of a DOM element of the entity, based on modifier name
     * @private
     * @param {String} modName Modifier name
     * @returns {String}
     */
    _buildModClassNamePrefix : function(modName) {
        return this.getEntityName() + MOD_DELIM + modName;
    },

    /**
     * Builds a regular expression for extracting modifier values from a DOM element of an entity
     * @private
     * @param {String} modName Modifier name
     * @returns {RegExp}
     */
    _buildModValRE : function(modName) {
        return new RegExp(
            '(\\s|^)' +
            this._buildModClassNamePrefix(modName) +
            '(?:' + MOD_DELIM + '(' + NAME_PATTERN + '))?(?=\\s|$)');
    },

    /**
     * Builds a CSS class name corresponding to the entity and modifier
     * @protected
     * @param {String} [modName] Modifier name
     * @param {String} [modVal] Modifier value
     * @returns {String}
     */
    _buildClassName : function(modName, modVal) {
        return buildClassName(this.getEntityName(), modName, modVal);
    },

    /**
     * Builds a CSS selector corresponding to an entity and modifier
     * @protected
     * @param {String} [modName] Modifier name
     * @param {String} [modVal] Modifier value
     * @returns {String}
     */
    _buildSelector : function(modName, modVal) {
        return '.' + this._buildClassName(modName, modVal);
    }
});

/**
 * @class Block
 * @description Base class for creating BEM blocks that have DOM representation
 * @augments i-bem:Block
 * @exports i-bem-dom:Block
 */
var Block = inherit([bem.Block, BemDomEntity], /** @lends Block.prototype */{
    /** @override */
    _block : function() {
        return this;
    }
});

/**
 * @class Elem
 * @description Base class for creating BEM elements that have DOM representation
 * @augments i-bem:Elem
 * @exports i-bem-dom:Elem
 */
var Elem = inherit([bem.Elem, BemDomEntity], /** @lends Elem.prototype */{
    /** @override */
    _block : function() {
        return this._blockInstance || (this._blockInstance = this.findParentBlock(getEntityCls(this.__self._blockName)));
    }
});

/**
 * Returns a block on a DOM element and initializes it if necessary
 * @param {Function} BemDomEntity entity
 * @param {Object} [params] entity parameters
 * @returns {BemDomEntity|null}
 */
$.fn.bem = function(BemDomEntity, params) {
    var entity = initEntity(BemDomEntity.getEntityName(), this, params, true);
    return entity? entity._setInitedMod() : null;
};

$(function() {

bemDom = /** @exports */{
    /**
     * Scope
     * @type jQuery
     */
    scope : $('body'),

    /**
     * Document shortcut
     * @type jQuery
     */
    doc : $(document),

    /**
     * Window shortcut
     * @type jQuery
     */
    win : $(window),

    /**
     * Base bemDom block
     * @type Function
     */
    Block : Block,

    /**
     * Base bemDom element
     * @type Function
     */
    Elem : Elem,

    /**
     * @param {*} entity
     * @returns {Boolean}
     */
    isEntity : function(entity) {
        return entity instanceof Block || entity instanceof Elem;
    },

    /**
     * Declares DOM-based block and creates block class
     * @param {String|Function} blockName Block name or block class
     * @param {Function|Array[Function]} [base] base block + mixes
     * @param {Object} [props] Methods
     * @param {Object} [staticProps] Static methods
     * @returns {Function} Block class
     */
    declBlock : function(blockName, base, props, staticProps) {
        if(!base || (typeof base === 'object' && !Array.isArray(base))) {
            staticProps = props;
            props = base;
            base = typeof blockName === 'string'?
                entities[blockName] || Block :
                blockName;
        }

        return bem.declBlock(blockName, base, props, staticProps);
    },

    /**
     * Declares elem and creates elem class
     * @param {String} blockName Block name
     * @param {String} elemName Elem name
     * @param {Function|Array[Function]} [base] base elem + mixes
     * @param {Object} [props] Methods
     * @param {Object} [staticProps] Static methods
     * @returns {Function} Elem class
     */
    declElem : function(blockName, elemName, base, props, staticProps) {
        if(!base || (typeof base === 'object' && !Array.isArray(base))) {
            staticProps = props;
            props = base;
            base = entities[blockName + ELEM_DELIM + elemName] || Elem;
        }

        return bem.declElem(blockName, elemName, base, props, staticProps);
    },

    declMixin : bem.declMixin,

    /**
     * Initializes blocks on a fragment of the DOM tree
     * @param {jQuery|String} [ctx=scope] Root DOM node
     * @returns {jQuery} ctx Initialization context
     */
    init : function(ctx) {
        ctx = typeof ctx === 'string'?
            $(ctx) :
            ctx || bemDom.scope;

        var dropElemCacheQueue = ctx === bemDom.scope? {} : undef,
            uniqInitId = identify();

        findDomElem(ctx, BEM_SELECTOR).each(function() {
            initEntities($(this), uniqInitId, dropElemCacheQueue);
        });

        bem._runInitFns();

        dropElemCacheQueue && dropElemCacheForCtx(ctx, dropElemCacheQueue);

        return ctx;
    },

    /**
     * @param {jQuery} ctx Root DOM node
     * @param {Boolean} [excludeSelf=false] Exclude the main domElem
     * @param {Boolean} [destructDom=false] Remove DOM node during destruction
     * @private
     */
    _destruct : function(ctx, excludeSelf, destructDom) {
        var _ctx,
            currentDestructingDomNodes = [];

        storeDomNodeParents(_ctx = excludeSelf? ctx.children() : ctx);

        reverse.call(findDomElem(_ctx, BEM_SELECTOR)).each(function(_, domNode) {
            var params = getParams(domNode),
                domNodeId = identify(domNode);

            destructingDomNodes[domNodeId] = true;
            currentDestructingDomNodes.push(domNodeId);

            objects.each(params, function(entityParams) {
                if(entityParams.uniqId) {
                    var entity = uniqIdToEntity[entityParams.uniqId];
                    entity?
                        removeDomNodeFromEntity(entity, domNode) :
                        delete uniqIdToDomElems[entityParams.uniqId];
                }
            });
            delete domElemToParams[identify(domNode)];
        });

        // NOTE: it was moved here as jquery events aren't triggered on detached DOM elements
        destructDom &&
            (excludeSelf? ctx.empty() : ctx.remove());

        // flush parent nodes storage that has been filled above
        domNodesToParents = {};

        currentDestructingDomNodes.forEach(function(domNodeId) {
            delete destructingDomNodes[domNodeId];
        });
    },

    /**
     * Destroys blocks on a fragment of the DOM tree
     * @param {jQuery} ctx Root DOM node
     * @param {Boolean} [excludeSelf=false] Exclude the main domElem
     */
    destruct : function(ctx, excludeSelf) {
        this._destruct(ctx, excludeSelf, true);
    },

    /**
     * Detaches blocks on a fragment of the DOM tree without DOM tree destruction
     * @param {jQuery} ctx Root DOM node
     * @param {Boolean} [excludeSelf=false] Exclude the main domElem
     */
    detach : function(ctx, excludeSelf) {
        this._destruct(ctx, excludeSelf);
    },

    /**
     * Replaces a fragment of the DOM tree inside the context, destroying old blocks and intializing new ones
     * @param {jQuery} ctx Root DOM node
     * @param {jQuery|String} content New content
     * @returns {jQuery} Updated root DOM node
     */
    update : function(ctx, content) {
        this.destruct(ctx, true);
        return this.init(ctx.html(content));
    },

    /**
     * Changes a fragment of the DOM tree including the context and initializes blocks.
     * @param {jQuery} ctx Root DOM node
     * @param {jQuery|String} content Content to be added
     * @returns {jQuery} New content
     */
    replace : function(ctx, content) {
        var prev = ctx.prev(),
            parent = ctx.parent();

        content = getJqueryCollection(content);

        this.destruct(ctx);

        return this.init(prev.length?
            content.insertAfter(prev) :
            content.prependTo(parent));
    },

    /**
     * Adds a fragment of the DOM tree at the end of the context and initializes blocks
     * @param {jQuery} ctx Root DOM node
     * @param {jQuery|String} content Content to be added
     * @returns {jQuery} New content
     */
    append : function(ctx, content) {
        return this.init(getJqueryCollection(content).appendTo(ctx));
    },

    /**
     * Adds a fragment of the DOM tree at the beginning of the context and initializes blocks
     * @param {jQuery} ctx Root DOM node
     * @param {jQuery|String} content Content to be added
     * @returns {jQuery} New content
     */
    prepend : function(ctx, content) {
        return this.init(getJqueryCollection(content).prependTo(ctx));
    },

    /**
     * Adds a fragment of the DOM tree before the context and initializes blocks
     * @param {jQuery} ctx Contextual DOM node
     * @param {jQuery|String} content Content to be added
     * @returns {jQuery} New content
     */
    before : function(ctx, content) {
        return this.init(getJqueryCollection(content).insertBefore(ctx));
    },

    /**
     * Adds a fragment of the DOM tree after the context and initializes blocks
     * @param {jQuery} ctx Contextual DOM node
     * @param {jQuery|String} content Content to be added
     * @returns {jQuery} New content
     */
    after : function(ctx, content) {
        return this.init(getJqueryCollection(content).insertAfter(ctx));
    }
};

provide(bemDom);

});

});

(function() {

var origDefine = modules.define,
    storedDeps = []; // NOTE: see https://github.com/bem/bem-core/issues/1446

modules.define = function(name, deps, decl) {
    origDefine.apply(modules, arguments);

    if(name !== 'i-bem-dom__init' && arguments.length > 2 && ~deps.indexOf('i-bem-dom')) {
        storedDeps.push(name);
        storedDeps.length === 1 && modules.define('i-bem-dom__init', storedDeps, function(provide) {
            provide(arguments[arguments.length - 1]);
            storedDeps = [];
        });
    }
};

})();

/* end: ../../common.blocks/i-bem-dom/i-bem-dom.js */
/* begin: ../../common.blocks/i-bem-dom/__init/i-bem-dom__init.js */
/**
 * @module i-bem-dom__init
 */

modules.define('i-bem-dom__init', ['i-bem-dom'], function(provide, bemDom) {

provide(
    /**
     * Initializes blocks on a fragment of the DOM tree
     * @exports
     * @param {jQuery} [ctx=scope] Root DOM node
     * @returns {jQuery} ctx Initialization context
     */
    function(ctx) {
        return bemDom.init(ctx);
    });
});

/* end: ../../common.blocks/i-bem-dom/__init/i-bem-dom__init.js */
/* begin: ../../common.blocks/i-bem/i-bem.vanilla.js */
/**
 * @module i-bem
 */

modules.define(
    'i-bem',
    [
        'i-bem__internal',
        'inherit',
        'identify',
        'next-tick',
        'objects',
        'functions'
    ],
    function(
        provide,
        bemInternal,
        inherit,
        identify,
        nextTick,
        objects,
        functions) {

var undef,

    ELEM_DELIM = bemInternal.ELEM_DELIM,

    /**
     * Storage for block init functions
     * @private
     * @type Array
     */
    initFns = [],

    /**
     * Storage for block declarations (hash by block name)
     * @private
     * @type Object
     */
    entities = {};

/**
 * Builds the name of the handler method for setting a modifier
 * @param {String} prefix
 * @param {String} modName Modifier name
 * @param {String} modVal Modifier value
 * @returns {String}
 */
function buildModFnName(prefix, modName, modVal) {
    return '__' + prefix +
       '__mod' +
       (modName? '_' + modName : '') +
       (modVal? '_' + modVal : '');
}

/**
 * Builds the function for the handler method for setting a modifier
 * for special syntax
 * @param {String} modVal Declared modifier value
 * @param {Function} curModFn Declared modifier handler
 * @param {Function} [prevModFn] Previous handler
 * @param {Function} [condition] Condition function
 * (called with declared, set and previous modifier values)
 * @returns {Function}
 */
function buildSpecialModFn(modVal, curModFn, prevModFn, condition) {
    return prevModFn || condition?
        function(_modName, _modVal, _prevModVal) {
            var res1, res2;
            prevModFn &&
                (res1 = prevModFn.apply(this, arguments) === false);
            (condition? condition(modVal, _modVal, _prevModVal) : true) &&
                (res2 = curModFn.apply(this, arguments) === false);
            if(res1 || res2) return false;
        } :
        curModFn;
}

var specialModConditions = {
    '!' : function(modVal, _modVal, _prevModVal) {
        return _modVal !== modVal;
    },
    '~' : function(modVal, _modVal, _prevModVal) {
        return _prevModVal === modVal;
    }
};

/**
 * Transforms a hash of modifier handlers to methods
 * @param {String} prefix
 * @param {Object} modFns
 * @param {Object} props
 */
function modFnsToProps(prefix, modFns, props) {
    if(functions.isFunction(modFns)) {
        props[buildModFnName(prefix, '*', '*')] = modFns;
    } else {
        var modName, modVal, modFn;
        for(modName in modFns) {
            modFn = modFns[modName];
            if(functions.isFunction(modFn)) {
                props[buildModFnName(prefix, modName, '*')] = modFn;
            } else {
                var starModFnName = buildModFnName(prefix, modName, '*');
                for(modVal in modFn) {
                    var curModFn = modFn[modVal],
                        modValPrefix = modVal[0];

                    if(modValPrefix === '!' || modValPrefix === '~' || modVal === '*') {
                        modVal === '*' || (modVal = modVal.substr(1));
                        props[starModFnName] = buildSpecialModFn(
                            modVal,
                            curModFn,
                            props[starModFnName],
                            specialModConditions[modValPrefix]);
                    } else {
                        props[buildModFnName(prefix, modName, modVal)] = curModFn;
                    }
                }
            }
        }
    }
}

function buildCheckMod(modName, modVal) {
    return modVal?
        Array.isArray(modVal)?
            function(block) {
                var i = 0, len = modVal.length;
                while(i < len)
                    if(checkMod(block, modName, modVal[i++]))
                        return true;
                return false;
            } :
            function(block) {
                return checkMod(block, modName, modVal);
            } :
        function(block) {
            return checkMod(block, modName, true);
        };
}

function checkMod(block, modName, modVal) {
    var prevModVal = block._processingMods[modName];

    // check if a block has either current or previous modifier value equal to passed modVal
    return modVal === '*'?
        /* jshint eqnull: true */
        block.hasMod(modName) || prevModVal != null :
        block.hasMod(modName, modVal) || prevModVal === modVal;
}

function convertModHandlersToMethods(props) {
    if(props.beforeSetMod) {
        modFnsToProps('before', props.beforeSetMod, props);
        delete props.beforeSetMod;
    }

    if(props.onSetMod) {
        modFnsToProps('after', props.onSetMod, props);
        delete props.onSetMod;
    }
}

function declEntity(baseCls, entityName, base, props, staticProps) {
    base || (base = entities[entityName] || baseCls);

    Array.isArray(base) || (base = [base]);

    if(!base[0].__bemEntity) {
        base = base.slice();
        base.unshift(entities[entityName] || baseCls);
    }

    props && convertModHandlersToMethods(props);

    var entityCls;

    entityName === base[0].getEntityName()?
        // makes a new "init" if the old one was already executed
        (entityCls = inherit.self(base, props, staticProps))._processInit(true) :
        (entityCls = entities[entityName] = inherit(base, props, staticProps));

    return entityCls;
}

// jscs:disable requireMultipleVarDecl

/**
 * @class BemEntity
 * @description Base block for creating BEM blocks
 */
var BemEntity = inherit(/** @lends BemEntity.prototype */ {
    /**
     * @constructor
     * @private
     * @param {Object} mods BemEntity modifiers
     * @param {Object} params BemEntity parameters
     * @param {Boolean} [initImmediately=true]
     */
    __constructor : function(mods, params, initImmediately) {
        /**
         * Cache of modifiers
         * @member {Object}
         * @private
         */
        this._modCache = mods || {};

        /**
         * Current modifiers in the stack
         * @member {Object}
         * @private
         */
        this._processingMods = {};

        /**
         * BemEntity parameters, taking into account the defaults
         * @member {Object}
         * @readonly
         */
        this.params = objects.extend(this._getDefaultParams(), params);

        /**
         * @member {String} Unique entity ID
         * @private
         */
        this._uniqId = this.params.uniqId || identify(this);

        initImmediately !== false?
            this._setInitedMod() :
            initFns.push(this._setInitedMod, this);
    },

    /**
     * Initializes a BEM entity
     * @private
     */
    _setInitedMod : function() {
        return this.setMod('js', 'inited');
    },

    /**
     * Deletes a BEM entity
     * @private
     */
    _delInitedMod : function() {
        this.delMod('js');
    },

    /**
     * Checks whether a BEM entity has a modifier
     * @param {String} modName Modifier name
     * @param {String|Boolean} [modVal] Modifier value. If not of type String or Boolean, it is casted to String
     * @returns {Boolean}
     */
    hasMod : function(modName, modVal) {
        var typeModVal = typeof modVal;
        typeModVal === 'undefined' || typeModVal === 'boolean' || (modVal = modVal.toString());

        var res = this.getMod(modName) === (modVal || '');
        return arguments.length === 1? !res : res;
    },

    /**
     * Returns the value of the modifier of the BEM entity
     * @param {String} modName Modifier name
     * @returns {String} Modifier value
     */
    getMod : function(modName) {
        var modCache = this._modCache;
        return modName in modCache?
            modCache[modName] || '' :
            modCache[modName] = this._extractModVal(modName);
    },

    /**
     * Sets the modifier for a BEM entity
     * @param {String} modName Modifier name
     * @param {String|Boolean} [modVal=true] Modifier value. If not of type String or Boolean, it is casted to String
     * @returns {BemEntity} this
     */
    setMod : function(modName, modVal) {
        var typeModVal = typeof modVal;
        if(typeModVal === 'undefined') {
            modVal = true;
        } else if(typeModVal === 'boolean') {
            modVal === false && (modVal = '');
        } else {
            modVal = modVal.toString();
        }

        /* jshint eqnull: true */
        if(this._processingMods[modName] != null) return this;

        var curModVal = this.getMod(modName);
        if(curModVal === modVal) return this;

        this._processingMods[modName] = curModVal;

        var needSetMod = true,
            modFnParams = [modName, modVal, curModVal],
            modVars = [['*', '*'], [modName, '*'], [modName, modVal]],
            prefixes = ['before', 'after'],
            i = 0, prefix, j, modVar;

        while(prefix = prefixes[i++]) {
            j = 0;
            while(modVar = modVars[j++]) {
                if(this._callModFn(prefix, modVar[0], modVar[1], modFnParams) === false) {
                    needSetMod = false;
                    break;
                }
            }

            if(!needSetMod) break;

            if(prefix === 'before') {
                this._modCache[modName] = modVal;
                this._onSetMod(modName, modVal, curModVal);
            }
        }

        this._processingMods[modName] = null;
        needSetMod && this._afterSetMod(modName, modVal, curModVal);

        return this;
    },

    /**
     * @protected
     * @param {String} modName Modifier name
     * @param {String} modVal Modifier value
     * @param {String} oldModVal Old modifier value
     */
    _onSetMod : function(modName, modVal, oldModVal) {},

    /**
     * @protected
     * @param {String} modName Modifier name
     * @param {String} modVal Modifier value
     * @param {String} oldModVal Old modifier value
     */
    _afterSetMod : function(modName, modVal, oldModVal) {},

    /**
     * Sets a modifier for a BEM entity, depending on conditions.
     * If the condition parameter is passed: when true, modVal1 is set; when false, modVal2 is set.
     * If the condition parameter is not passed: modVal1 is set if modVal2 was set, or vice versa.
     * @param {String} modName Modifier name
     * @param {String} [modVal1=true] First modifier value, optional for boolean modifiers
     * @param {String} [modVal2] Second modifier value
     * @param {Boolean} [condition] Condition
     * @returns {BemEntity} this
     */
    toggleMod : function(modName, modVal1, modVal2, condition) {
        typeof modVal1 === 'undefined' && (modVal1 = true); // boolean mod

        if(typeof modVal2 === 'undefined') {
            modVal2 = '';
        } else if(typeof modVal2 === 'boolean') {
            condition = modVal2;
            modVal2 = '';
        }

        var modVal = this.getMod(modName);
        (modVal === modVal1 || modVal === modVal2) &&
            this.setMod(
                modName,
                typeof condition === 'boolean'?
                    (condition? modVal1 : modVal2) :
                    this.hasMod(modName, modVal1)? modVal2 : modVal1);

        return this;
    },

    /**
     * Removes a modifier from a BEM entity
     * @param {String} modName Modifier name
     * @returns {BemEntity} this
     */
    delMod : function(modName) {
        return this.setMod(modName, '');
    },

    /**
     * Executes handlers for setting modifiers
     * @private
     * @param {String} prefix
     * @param {String} modName Modifier name
     * @param {String} modVal Modifier value
     * @param {Array} modFnParams Handler parameters
     */
    _callModFn : function(prefix, modName, modVal, modFnParams) {
        var modFnName = buildModFnName(prefix, modName, modVal);
        return this[modFnName]?
           this[modFnName].apply(this, modFnParams) :
           undef;
    },

    _extractModVal : function(modName) {
        return '';
    },

    /**
     * Returns a BEM entity's default parameters
     * @protected
     * @returns {Object}
     */
    _getDefaultParams : function() {
        return {};
    },

    /**
     * Executes given callback on next turn eventloop in BEM entity's context
     * @protected
     * @param {Function} fn callback
     * @returns {BemEntity} this
     */
    _nextTick : function(fn) {
        var _this = this;
        nextTick(function() {
            _this.hasMod('js', 'inited') && fn.call(_this);
        });
        return this;
    }
}, /** @lends BemEntity */{
    /**
     * Factory method for creating an instance
     * @param {Object} mods modifiers
     * @param {Object} params params
     * @returns {BemEntity}
     */
    create : function(mods, params) {
        return new this(mods, params);
    },

    /**
     * Declares modifier
     * @param {Object} mod
     * @param {String} mod.modName
     * @param {String|Boolean|Array} [mod.modVal]
     * @param {Object} props
     * @param {Object} [staticProps]
     * @returns {Function}
     */
    declMod : function(mod, props, staticProps) {
        props && convertModHandlersToMethods(props);

        var checkMod = buildCheckMod(mod.modName, mod.modVal),
            basePtp = this.prototype;

        objects.each(props, function(prop, name) {
            functions.isFunction(prop) &&
                (props[name] = function() {
                    var method;
                    if(checkMod(this)) {
                        method = prop;
                    } else {
                        var baseMethod = basePtp[name];
                        baseMethod && baseMethod !== prop &&
                            (method = this.__base);
                    }
                    return method?
                        method.apply(this, arguments) :
                        undef;
                });
        });

        return inherit.self(this, props, staticProps);
    },

    __bemEntity : true,

    _name : null,

    /**
     * Processes a BEM entity's init
     * @private
     * @param {Boolean} [heedInit=false] Whether to take into account that the BEM entity already processed its init property
     */
    _processInit : function(heedInit) {
        this._inited = true;
    },

    /**
     * Returns the name of the current BEM entity
     * @returns {String}
     */
    getName : function() {
        return this._name;
    },

    /**
     * Returns the name of the current BEM entity
     * @returns {String}
     */
    getEntityName : function() {
        return this._name;
    }
});

/**
 * @class Block
 * @description Class for creating BEM blocks
 * @augments BemEntity
 */
var Block = BemEntity;

/**
 * @class Elem
 * @description Class for creating BEM elems
 * @augments BemEntity
 */
var Elem = inherit(BemEntity, /** @lends Elem.prototype */ {
    /**
     * Returns the own block of current element
     * @protected
     * @returns {Block}
     */
    _block : function() {
        return this._blockInstance;
    }
}, /** @lends Elem */{
    /**
     * Factory method for creating an instance
     * @param {Object} block block instance
     * @param {Object} mods modifiers
     * @param {Object} params params
     * @returns {BemEntity}
     */
    create : function(block, mods, params) {
        var res = new this(mods, params);
        res._blockInstance = block;
        return res;
    },

    /**
     * Returns the name of the current BEM entity
     * @returns {String}
     */
    getEntityName : function() {
        return this._blockName + ELEM_DELIM + this._name;
    }
});

provide(/** @exports */{
    /**
     * Block class
     * @type Function
     */
    Block : Block,

    /**
     * Elem class
     * @type Function
     */
    Elem : Elem,

    /**
     * Storage for block declarations (hash by block name)
     * @type Object
     */
    entities : entities,

    /**
     * Declares block and creates a block class
     * @param {String|Function} blockName Block name or block class
     * @param {Function|Array[Function]} [base] base block + mixes
     * @param {Object} [props] Methods
     * @param {Object} [staticProps] Static methods
     * @returns {Function} Block class
     */
    declBlock : function(blockName, base, props, staticProps) {
        if(typeof base === 'object' && !Array.isArray(base)) {
            staticProps = props;
            props = base;
            base = undef;
        }

        var baseCls = Block;
        if(typeof blockName !== 'string') {
            baseCls = blockName;
            blockName = blockName.getEntityName();
        }

        var res = declEntity(baseCls, blockName, base, props, staticProps);
        res._name = res._blockName = blockName;
        return res;
    },

    /**
     * Declares elem and creates an elem class
     * @param {String} [blockName] Block name
     * @param {String|Function} elemName Elem name or elem class
     * @param {Function|Function[]} [base] base elem + mixes
     * @param {Object} [props] Methods
     * @param {Object} [staticProps] Static methods
     * @returns {Function} Elem class
     */
    declElem : function(blockName, elemName, base, props, staticProps) {
        var baseCls = Elem,
            entityName;

        if(typeof blockName !== 'string') {
            staticProps = props;
            props = base;
            base = elemName;
            elemName = blockName._name;
            baseCls = blockName;
            blockName = baseCls._blockName;
            entityName = baseCls.getEntityName();
        } else {
            entityName = blockName + ELEM_DELIM + elemName;
        }

        if(typeof base === 'object' && !Array.isArray(base)) {
            staticProps = props;
            props = base;
            base = undef;
        }

        var res = declEntity(baseCls, entityName, base, props, staticProps);
        res._blockName = blockName;
        res._name = elemName;
        return res;
    },

    /**
     * Declares mixin
     * @param {Object} [props] Methods
     * @param {Object} [staticProps] Static methods
     * @returns {Function} mix
     */
    declMixin : function(props, staticProps) {
        convertModHandlersToMethods(props || (props = {}));
        return inherit(props, staticProps);
    },

    /**
     * Executes the block init functions
     * @private
     */
    _runInitFns : function() {
        if(initFns.length) {
            var fns = initFns,
                fn, i = 0;

            initFns = [];
            while(fn = fns[i]) {
                fn.call(fns[i + 1]);
                i += 2;
            }
        }
    }
});

});

/* end: ../../common.blocks/i-bem/i-bem.vanilla.js */
/* begin: ../../common.blocks/i-bem/__internal/i-bem__internal.vanilla.js */
/**
 * @module i-bem__internal
 */

modules.define('i-bem__internal', function(provide) {

var undef,
    /**
     * Separator for modifiers and their values
     * @const
     * @type String
     */
    MOD_DELIM = '_',

    /**
     * Separator between names of a block and a nested element
     * @const
     * @type String
     */
    ELEM_DELIM = '__',

    /**
     * Pattern for acceptable element and modifier names
     * @const
     * @type String
     */
    NAME_PATTERN = '[a-zA-Z0-9-]+';

function isSimple(obj) {
    var typeOf = typeof obj;
    return typeOf === 'string' || typeOf === 'number' || typeOf === 'boolean';
}

function buildModPostfix(modName, modVal) {
    var res = '';
    /* jshint eqnull: true */
    if(modVal != null && modVal !== false) {
        res += MOD_DELIM + modName;
        modVal !== true && (res += MOD_DELIM + modVal);
    }
    return res;
}

function buildBlockClassName(name, modName, modVal) {
    return name + buildModPostfix(modName, modVal);
}

function buildElemClassName(block, name, modName, modVal) {
    return buildBlockClassName(block, undef, undef) +
        ELEM_DELIM + name +
        buildModPostfix(modName, modVal);
}

provide(/** @exports */{
    NAME_PATTERN : NAME_PATTERN,

    MOD_DELIM : MOD_DELIM,
    ELEM_DELIM : ELEM_DELIM,

    buildModPostfix : buildModPostfix,

    /**
     * Builds the class name of a block or element with a modifier
     * @param {String} block Block name
     * @param {String} [elem] Element name
     * @param {String} [modName] Modifier name
     * @param {String|Number} [modVal] Modifier value
     * @returns {String} Class name
     */
    buildClassName : function(block, elem, modName, modVal) {
        if(isSimple(modName)) {
            if(!isSimple(modVal)) {
                modVal = modName;
                modName = elem;
                elem = undef;
            }
        } else if(typeof modName !== 'undefined') {
            modName = undef;
        } else if(elem && typeof elem !== 'string') {
            elem = undef;
        }

        if(!(elem || modName)) { // optimization for simple case
            return block;
        }

        return elem?
            buildElemClassName(block, elem, modName, modVal) :
            buildBlockClassName(block, modName, modVal);
    },

    /**
     * Builds full class names for a buffer or element with modifiers
     * @param {String} block Block name
     * @param {String} [elem] Element name
     * @param {Object} [mods] Modifiers
     * @returns {String} Class
     */
    buildClassNames : function(block, elem, mods) {
        if(elem && typeof elem !== 'string') {
            mods = elem;
            elem = undef;
        }

        var res = elem?
            buildElemClassName(block, elem, undef, undef) :
            buildBlockClassName(block, undef, undef);

        if(mods) {
            for(var modName in mods) {
                if(mods.hasOwnProperty(modName) && mods[modName]) {
                    res += ' ' + (elem?
                        buildElemClassName(block, elem, modName, mods[modName]) :
                        buildBlockClassName(block, modName, mods[modName]));
                }
            }
        }

        return res;
    }
});

});

/* end: ../../common.blocks/i-bem/__internal/i-bem__internal.vanilla.js */
/* begin: ../../common.blocks/next-tick/next-tick.vanilla.js */
/**
 * @module next-tick
 */

modules.define('next-tick', function(provide) {

/**
 * Executes given function on next tick.
 * @exports
 * @type Function
 * @param {Function} fn
 */

var global = this.global,
    fns = [],
    enqueueFn = function(fn) {
        fns.push(fn);
        return fns.length === 1;
    },
    callFns = function() {
        var fnsToCall = fns, i = 0, len = fns.length;
        fns = [];
        while(i < len) {
            fnsToCall[i++]();
        }
    };

    /* global process */
    if(typeof process === 'object' && process.nextTick) { // nodejs
        return provide(function(fn) {
            enqueueFn(fn) && process.nextTick(callFns);
        });
    }

    if(global.setImmediate) { // ie10
        return provide(function(fn) {
            enqueueFn(fn) && global.setImmediate(callFns);
        });
    }

    if(global.postMessage) { // modern browsers
        var isPostMessageAsync = true;
        if(global.attachEvent) {
            var checkAsync = function() {
                    isPostMessageAsync = false;
                };
            global.attachEvent('onmessage', checkAsync);
            global.postMessage('__checkAsync', '*');
            global.detachEvent('onmessage', checkAsync);
        }

        if(isPostMessageAsync) {
            var msg = '__nextTick' + (+new Date),
                onMessage = function(e) {
                    if(e.data === msg) {
                        e.stopPropagation && e.stopPropagation();
                        callFns();
                    }
                };

            global.addEventListener?
                global.addEventListener('message', onMessage, true) :
                global.attachEvent('onmessage', onMessage);

            return provide(function(fn) {
                enqueueFn(fn) && global.postMessage(msg, '*');
            });
        }
    }

    var doc = global.document;
    if('onreadystatechange' in doc.createElement('script')) { // ie6-ie8
        var head = doc.getElementsByTagName('head')[0],
            createScript = function() {
                var script = doc.createElement('script');
                script.onreadystatechange = function() {
                    script.parentNode.removeChild(script);
                    script = script.onreadystatechange = null;
                    callFns();
                };
                head.appendChild(script);
            };

        return provide(function(fn) {
            enqueueFn(fn) && createScript();
        });
    }

    provide(function(fn) { // old browsers
        enqueueFn(fn) && global.setTimeout(callFns, 0);
    });
});

/* end: ../../common.blocks/next-tick/next-tick.vanilla.js */
/* begin: ../../common.blocks/i-bem-dom/__events/i-bem-dom__events.js */
/**
 * @module i-bem-dom__events
 */
modules.define(
    'i-bem-dom__events',
    [
        'i-bem__internal',
        'i-bem-dom__collection',
        'inherit',
        'identify',
        'objects',
        'jquery',
        'functions'
    ],
    function(
        provide,
        bemInternal,
        BemDomCollection,
        inherit,
        identify,
        objects,
        $,
        functions) {

var undef,
    winNode = window,
    docNode = document,
    winId = identify(winNode),
    docId = identify(docNode),
    eventStorage = {},

    /**
     * @class EventManager
     */
    EventManager = inherit(/** @lends EventManager.prototype */{
        /**
         * @constructor
         * @param {Object} params EventManager parameters
         * @param {Function} fnWrapper Wrapper function to build event handler
         * @param {Function} eventBuilder Function to build event
         */
        __constructor : function(params, fnWrapper, eventBuilder) {
            this._params = params;
            this._fnWrapper = fnWrapper;
            this._eventBuilder = eventBuilder;
            this._storage = {};
        },

        /**
         * Adds an event handler
         * @param {String|Object|events:Event} e Event type
         * @param {*} [data] Additional data that the handler gets as e.data
         * @param {Function} fn Handler
         * @returns {EventManager} this
         */
        on : function(e, data, fn, _fnCtx, _isOnce) {
            var params = this._params,
                event = this._eventBuilder(e, params);

            if(functions.isFunction(data)) {
                _isOnce = _fnCtx;
                _fnCtx = fn;
                fn = data;
                data = undef;
            }

            var fnStorage = this._storage[event] || (this._storage[event] = {}),
                fnId = identify(fn, _fnCtx);

            if(!fnStorage[fnId]) {
                var bindDomElem = params.bindDomElem,
                    bindSelector = params.bindSelector,
                    _this = this,
                    handler = fnStorage[fnId] = this._fnWrapper(
                        _isOnce?
                            function() {
                                _this.un(e, fn, _fnCtx);
                                fn.apply(this, arguments);
                            } :
                            fn,
                        _fnCtx,
                        fnId);

                bindDomElem.on(event, bindSelector, data, handler);
                bindSelector && bindDomElem.is(bindSelector) && bindDomElem.on(event, data, handler);
                // FIXME: "once" won't properly work in case of nested and mixed elem with the same name
            }

            return this;
        },

        /**
         * Adds an event handler
         * @param {String} e Event type
         * @param {*} [data] Additional data that the handler gets as e.data
         * @param {Function} fn Handler
         * @returns {EventManager} this
         */
        once : function(e, data, fn, _fnCtx) {
            if(functions.isFunction(data)) {
                _fnCtx = fn;
                fn = data;
                data = undef;
            }

            return this.on(e, data, fn, _fnCtx, true);
        },

        /**
         * Removes event handler or handlers
         * @param {String|Object|events:Event} [e] Event type
         * @param {Function} [fn] Handler
         * @returns {EventManager} this
         */
        un : function(e, fn, _fnCtx) {
            var argsLen = arguments.length;
            if(argsLen) {
                var params = this._params,
                    event = this._eventBuilder(e, params);

                if(argsLen === 1) {
                    this._unbindByEvent(this._storage[event], event);
                } else {
                    var wrappedFn,
                        fnId = identify(fn, _fnCtx),
                        fnStorage = this._storage[event],
                        bindDomElem = params.bindDomElem,
                        bindSelector = params.bindSelector;

                    if(wrappedFn = fnStorage && fnStorage[fnId])
                        delete fnStorage[fnId];

                    var handler = wrappedFn || fn;

                    bindDomElem.off(event, params.bindSelector, handler);
                    bindSelector && bindDomElem.is(bindSelector) && bindDomElem.off(event, handler);
                }
            } else {
                objects.each(this._storage, this._unbindByEvent, this);
            }

            return this;
        },

        _unbindByEvent : function(fnStorage, e) {
            var params = this._params,
                bindDomElem = params.bindDomElem,
                bindSelector = params.bindSelector,
                unbindWithoutSelector = bindSelector && bindDomElem.is(bindSelector);

            fnStorage && objects.each(fnStorage, function(fn) {
                bindDomElem.off(e, bindSelector, fn);
                unbindWithoutSelector && bindDomElem.off(e, fn);
            });
            this._storage[e] = null;
        }
    }),
    buildForEachEventManagerProxyFn = function(methodName) {
        return function() {
            var args = arguments;

            this._eventManagers.forEach(function(eventManager) {
                eventManager[methodName].apply(eventManager, args);
            });

            return this;
        };
    },
    /**
     * @class CollectionEventManager
     */
    CollectionEventManager = inherit(/** @lends CollectionEventManager.prototype */{
        /**
         * @constructor
         * @param {Array} eventManagers Array of event managers
         */
        __constructor : function(eventManagers) {
            this._eventManagers = eventManagers;
        },

        /**
         * Adds an event handler
         * @param {String|Object|events:Event} e Event type
         * @param {Object} [data] Additional data that the handler gets as e.data
         * @param {Function} fn Handler
         * @returns {CollectionEventManager} this
         */
        on : buildForEachEventManagerProxyFn('on'),

        /**
         * Adds an event handler
         * @param {String} e Event type
         * @param {Object} [data] Additional data that the handler gets as e.data
         * @param {Function} fn Handler
         * @returns {CollectionEventManager} this
         */
        once : buildForEachEventManagerProxyFn('once'),

        /**
         * Removes event handler or handlers
         * @param {String|Object|events:Event} [e] Event type
         * @param {Function} [fn] Handler
         * @returns {CollectionEventManager} this
         */
        un : buildForEachEventManagerProxyFn('un')
    }),
    /**
     * @class EventManagerFactory
     * @exports i-bem-dom__events:EventManagerFactory
     */
    EventManagerFactory = inherit(/** @lends EventManagerFactory.prototype */{
        __constructor : function(getEntityCls) {
            this._storageSuffix = identify();
            this._getEntityCls = getEntityCls;
            this._eventManagerCls = EventManager;
        },

        /**
         * Instantiates event manager
         * @param {Function|i-bem-dom:BemDomEntity} ctx BemDomEntity class or instance
         * @param {*} bindCtx context to bind
         * @param {jQuery} bindScope bind scope
         * @returns {EventManager}
         */
        getEventManager : function(ctx, bindCtx, bindScope) {
            if(bindCtx instanceof BemDomCollection) {
                return new CollectionEventManager(bindCtx.map(function(entity) {
                    return this.getEventManager(ctx, entity, bindScope);
                }, this));
            }

            var ctxId = identify(ctx),
                ctxStorage = eventStorage[ctxId],
                storageSuffix = this._storageSuffix,
                isBindToInstance = typeof ctx !== 'function',
                ctxCls,
                selector = '';

            if(isBindToInstance) {
                ctxCls = ctx.__self;
            } else {
                ctxCls = ctx;
                selector = ctx._buildSelector();
            }

            var params = this._buildEventManagerParams(bindCtx, bindScope, selector, ctxCls),
                storageKey = params.key + storageSuffix;

            if(!ctxStorage) {
                ctxStorage = eventStorage[ctxId] = {};
                if(isBindToInstance) {
                    ctx._events().on({ modName : 'js', modVal : '' }, function() {
                        params.bindToArbitraryDomElem && ctxStorage[storageKey] &&
                            ctxStorage[storageKey].un();
                        delete ctxStorage[ctxId];
                    });
                }
            }

            return ctxStorage[storageKey] ||
                (ctxStorage[storageKey] = this._createEventManager(ctx, params, isBindToInstance));
        },

        _buildEventManagerParams : function(bindCtx, bindScope, ctxSelector, ctxCls) {
            var res = {
                bindEntityCls : null,
                bindDomElem : bindScope,
                bindToArbitraryDomElem : false,
                bindSelector : ctxSelector,
                ctxSelector : ctxSelector,
                key : ''
            };

            if(bindCtx) {
                var typeOfCtx = typeof bindCtx;

                if(bindCtx.jquery) {
                    res.bindDomElem = bindCtx;
                    res.key = identify.apply(null, bindCtx.get());
                    res.bindToArbitraryDomElem = true;
                } else if(bindCtx === winNode || bindCtx === docNode || (typeOfCtx === 'object' && bindCtx.nodeType === 1)) { // NOTE: duck-typing check for "is-DOM-element"
                    res.bindDomElem = $(bindCtx);
                    res.key = identify(bindCtx);
                    res.bindToArbitraryDomElem = true;
                } else if(typeOfCtx === 'object' && bindCtx.__self) { // bem entity instance
                    res.bindDomElem = bindCtx.domElem;
                    res.key = bindCtx._uniqId;
                    res.bindEntityCls = bindCtx.__self;
                } else if(typeOfCtx === 'string' || typeOfCtx === 'object' || typeOfCtx === 'function') {
                    var blockName, elemName, modName, modVal;
                    if(typeOfCtx === 'string') { // elem name
                        blockName = ctxCls._blockName;
                        elemName = bindCtx;
                    } else if(typeOfCtx === 'object') { // bem entity with optional mod val
                        blockName = bindCtx.block?
                            bindCtx.block.getName() :
                            ctxCls._blockName;
                        elemName = typeof bindCtx.elem === 'function'?
                            bindCtx.elem.getName() :
                            bindCtx.elem;
                        modName = bindCtx.modName;
                        modVal = bindCtx.modVal;
                    } else if(bindCtx.getName() === bindCtx.getEntityName()) { // block class
                        blockName = bindCtx.getName();
                    } else { // elem class
                        blockName = ctxCls._blockName;
                        elemName = bindCtx.getName();
                    }

                    var entityName = bemInternal.buildClassName(blockName, elemName);
                    res.bindEntityCls = this._getEntityCls(entityName);
                    res.bindSelector = '.' + (res.key = entityName + bemInternal.buildModPostfix(modName, modVal));
                }
            } else {
                res.bindEntityCls = ctxCls;
            }

            return res;
        },

        _createEventManager : function(ctx, params, isInstance) {
            throw new Error('not implemented');
        }
    });

provide({
    EventManagerFactory : EventManagerFactory
});

});

/* end: ../../common.blocks/i-bem-dom/__events/i-bem-dom__events.js */
/* begin: ../../common.blocks/i-bem-dom/__collection/i-bem-dom__collection.js */
/**
 * @module i-bem-dom__collection
 */
modules.define('i-bem-dom__collection', ['inherit', 'i-bem__collection'], function(provide, inherit, BemCollection) {

/**
 * @class BemDomCollection
 */
var BemDomCollection = inherit(BemCollection, /** @lends BemDomCollection.prototype */{
    /**
     * Finds the first child block for every entities in collection
     * @param {Function|Object} Block Block class or description (block, modName, modVal) of the block to find
     * @returns {BemDomCollection}
     */
    findChildBlock : buildProxyMethodForOne('findChildBlock'),

    /**
     * Finds child block for every entities in collections
     * @param {Function|Object} Block Block class or description (block, modName, modVal) of the block to find
     * @returns {BemDomCollection}
     */
    findChildBlocks : buildProxyMethodForMany('findChildBlocks'),

    /**
     * Finds the first parent block for every entities in collection
     * @param {Function|Object} Block Block class or description (block, modName, modVal) of the block to find
     * @returns {BemDomCollection}
     */
    findParentBlock : buildProxyMethodForOne('findParentBlock'),

    /**
     * Finds parent block for every entities in collections
     * @param {Function|Object} Block Block class or description (block, modName, modVal) of the block to find
     * @returns {BemDomCollection}
     */
    findParentBlocks : buildProxyMethodForMany('findParentBlocks'),

    /**
     * Finds first mixed bloc for every entities in collectionk
     * @param {Function|Object} Block Block class or description (block, modName, modVal) of the block to find
     * @returns {BemDomCollection}
     */
    findMixedBlock : buildProxyMethodForOne('findMixedBlock'),

    /**
     * Finds mixed block for every entities in collections
     * @param {Function|Object} Block Block class or description (block, modName, modVal) of the block to find
     * @returns {BemDomCollection}
     */
    findMixedBlocks : buildProxyMethodForMany('findMixedBlocks'),

    /**
     * Finds the first child elemen for every entities in collectiont
     * @param {Function|String|Object} Elem Element class or name or description elem, modName, modVal
     * @param {Boolean} [strictMode=false]
     * @returns {BemDomCollection}
     */
    findChildElem : buildProxyMethodForOne('findChildElem'),

    /**
     * Finds child element for every entities in collections
     * @param {Function|String|Object} Elem Element class or name or description elem, modName, modVal
     * @param {Boolean} [strictMode=false]
     * @returns {BemDomCollection}
     */
    findChildElems : buildProxyMethodForMany('findChildElems'),

    /**
     * Finds the first parent elemen for every entities in collectiont
     * @param {Function|String|Object} Elem Element class or name or description elem, modName, modVal
     * @param {Boolean} [strictMode=false]
     * @returns {BemDomCollection}
     */
    findParentElem : buildProxyMethodForOne('findParentElem'),

    /**
     * Finds parent element for every entities in collections
     * @param {Function|String|Object} Elem Element class or name or description elem, modName, modVal
     * @param {Boolean} [strictMode=false]
     * @returns {BemDomCollection}
     */
    findParentElems : buildProxyMethodForMany('findParentElems'),

    /**
     * Finds the first mixed elemen for every entities in collectiont
     * @param {Function|String|Object} Elem Element class or name or description elem, modName, modVal
     * @returns {BemDomCollection}
     */
    findMixedElem : buildProxyMethodForOne('findMixedElem'),

    /**
     * Finds mixed element for every entities in collections
     * @param {Function|String|Object} Elem Element class or name or description elem, modName, modVal
     * @returns {BemDomCollection}
     */
    findMixedElems : buildProxyMethodForMany('findMixedElems')
});

function collectionMapMethod(collection, methodName, args) {
    return collection.map(function(entity) {
        return entity[methodName].apply(entity, args);
    });
}

function buildProxyMethodForOne(methodName) {
    return function() {
        return new BemDomCollection(collectionMapMethod(this, methodName, arguments));
    };
}

function buildProxyMethodForMany(methodName) {
    return function() {
        var res = [];

        collectionMapMethod(this, methodName, arguments).forEach(function(collection) {
            collection.forEach(function(entity) {
                res.push(entity);
            });
        });

        return new BemDomCollection(res);
    };
}

provide(BemDomCollection);

});

/* end: ../../common.blocks/i-bem-dom/__collection/i-bem-dom__collection.js */
/* begin: ../../common.blocks/i-bem/__collection/i-bem__collection.js */
/**
 * @module i-bem__collection
 */
modules.define('i-bem__collection', ['inherit'], function(provide, inherit) {

/**
 * @class BemCollection
 */
var BemCollection = inherit(/** @lends BemCollection.prototype */{
    /**
     * @constructor
     * @param {Array} entities BEM entities
     */
    __constructor : function(entities) {
        var _entities = this._entities = [],
            uniq = {};
        (Array.isArray(entities)? entities : arraySlice.call(arguments)).forEach(function(entity) {
            if(!uniq[entity._uniqId]) {
                uniq[entity._uniqId] = true;
                _entities.push(entity);
            }
        });
    },

    /**
     * Sets the modifier for entities in Collection.
     * @param {String} modName Modifier name
     * @param {String|Boolean} [modVal=true] Modifier value. If not of type String or Boolean, it is casted to String
     * @returns {Collection} this
     */
    setMod : buildForEachEntityMethodProxyFn('setMod'),

    /**
     * Removes the modifier from entities in Collection.
     * @param {String} modName Modifier name
     * @returns {Collection} this
     */
    delMod : buildForEachEntityMethodProxyFn('delMod'),

    /**
     * Sets a modifier for entities in Collection, depending on conditions.
     * If the condition parameter is passed: when true, modVal1 is set; when false, modVal2 is set.
     * If the condition parameter is not passed: modVal1 is set if modVal2 was set, or vice versa.
     * @param {String} modName Modifier name
     * @param {String} modVal1 First modifier value
     * @param {String} [modVal2] Second modifier value
     * @param {Boolean} [condition] Condition
     * @returns {Collection} this
     */
    toggleMod : buildForEachEntityMethodProxyFn('toggleMod'),

    /**
     * Checks whether every entity in Collection has a modifier.
     * @param {String} modName Modifier name
     * @param {String|Boolean} [modVal] Modifier value. If not of type String or Boolean, it is casted to String
     * @returns {Boolean}
     */
    everyHasMod : buildComplexProxyFn('every', 'hasMod'),

    /**
     * Checks whether some entities in Collection has a modifier.
     * @param {String} modName Modifier name
     * @param {String|Boolean} [modVal] Modifier value. If not of type String or Boolean, it is casted to String
     * @returns {Boolean}
     */
    someHasMod : buildComplexProxyFn('some', 'hasMod'),

    /**
     * Returns entity by index.
     * @param {Number} i Index
     * @returns {BemEntity}
     */
    get : function(i) {
        return this._entities[i];
    },

    /**
     * Calls callback once for each entity in collection.
     * @param {Function} fn Callback
     * @param {Object} ctx Callback context
     */
    forEach : buildEntitiesMethodProxyFn('forEach'),

    /**
     * Creates an array with the results of calling callback on every entity in collection.
     * @param {Function} fn Callback
     * @param {Object} ctx Callback context
     * @returns {Array}
     */
    map : buildEntitiesMethodProxyFn('map'),

    /**
     * Applies callback against an accumulator and each entity in collection (from left-to-right)
     * to reduce it to a single value.
     * @param {Function} fn Callback
     * @param {Object} [initial] Initial value
     * @returns {Array}
     */
    reduce : buildEntitiesMethodProxyFn('reduce'),

    /**
     * Applies callback against an accumulator and each entity in collection (from right-to-left)
     * to reduce it to a single value.
     * @param {Function} fn Callback
     * @param {Object} [initial] Initial value
     * @returns {Array}
     */
    reduceRight : buildEntitiesMethodProxyFn('reduceRight'),

    /**
     * Creates a new collection with all entities that pass the test implemented by the provided callback.
     * @param {Function} fn Callback
     * @param {Object} ctx Callback context
     * @returns {Collection}
     */
    filter : function() {
        return new this.__self(buildEntitiesMethodProxyFn('filter').apply(this, arguments));
    },

    /**
     * Tests whether some entities in the collection passes the test implemented by the provided callback.
     * @param {Function} fn Callback
     * @param {Object} ctx Callback context
     * @returns {Boolean}
     */
    some : buildEntitiesMethodProxyFn('some'),

    /**
     * Tests whether every entities in the collection passes the test implemented by the provided callback.
     * @param {Function} fn Callback
     * @param {Object} ctx Callback context
     * @returns {Boolean}
     */
    every : buildEntitiesMethodProxyFn('every'),

    /**
     * Returns a boolean asserting whether an entity is present in the collection.
     * @param {BemEntity} entity BEM entity
     * @returns {Boolean}
     */
    has : function(entity) {
        return this._entities.indexOf(entity) > -1;
    },

    /**
     * Returns an entity, if it satisfies the provided testing callback.
     * @param {Function} fn Callback
     * @param {Object} ctx Callback context
     * @returns {BemEntity}
     */
    find : function(fn, ctx) {
        ctx || (ctx = this);
        var entities = this._entities,
            i = 0,
            entity;

        while(entity = entities[i])
            if(fn.call(ctx, entities[i], i++, this))
                return entity;

        return null;
    },

    /**
     * Returns a new collection comprised of collection on which it is called joined with
     * the collection(s) and/or array(s) and/or entity(es) provided as arguments.
     * @param {?...(Collection|Array|BemEntity)} args
     * @returns {Collection}
     */
    concat : function() {
        var i = 0,
            l = arguments.length,
            arg,
            argsForConcat = [];

        while(i < l) {
            arg = arguments[i++];
            argsForConcat.push(
                arg instanceof BemCollection?  arg._entities : arg);
        }

        return new this.__self(arrayConcat.apply(this._entities, argsForConcat));
    },

    /**
     * Returns size of the collection.
     * @returns {Number}
     */
    size : function() {
        return this._entities.length;
    },

    /**
     * Converts the collection into array.
     * @returns {Array}
     */
    toArray : function() {
        return this._entities.slice();
    }
});

function buildForEachEntityMethodProxyFn(methodName) {
    return function() {
        var args = arguments;
        this._entities.forEach(function(entity) {
            entity[methodName].apply(entity, args);
        });
        return this;
    };
}

function buildEntitiesMethodProxyFn(methodName) {
    return function() {
        var entities = this._entities;
        return entities[methodName].apply(entities, arguments);
    };
}

function buildComplexProxyFn(arrayMethodName, entityMethodName) {
    return function() {
        var args = arguments;
        return this._entities[arrayMethodName](function(entity) {
            return entity[entityMethodName].apply(entity, args);
        });
    };
}

var arrayConcat = Array.prototype.concat,
    arraySlice = Array.prototype.slice;

provide(BemCollection);

});

/* end: ../../common.blocks/i-bem/__collection/i-bem__collection.js */
/* begin: ../../common.blocks/i-bem-dom/__events/_type/i-bem-dom__events_type_bem.js */
/**
 * @module i-bem-dom__events_type_bem
 */
modules.define(
    'i-bem-dom__events_type_bem',
    [
        'i-bem-dom__events',
        'i-bem__internal',
        'inherit',
        'functions',
        'jquery',
        'identify',
        'events'
    ],
    function(
        provide,
        bemDomEvents,
        bemInternal,
        inherit,
        functions,
        $,
        identify,
        events) {

var EVENT_PREFIX = '__bem__',
    MOD_CHANGE_EVENT = 'modchange',

    specialEvents = $.event.special,
    specialEventsStorage = {},

    createSpecialEvent = function(event) {
        return {
            setup : function() {
                specialEventsStorage[event] || (specialEventsStorage[event] = true);
            },
            teardown : functions.noop
        };
    },

    eventBuilder = function(e, params) {
        var event = EVENT_PREFIX + params.bindEntityCls.getEntityName() +
            (typeof e === 'object'?
                e instanceof events.Event?
                    e.type :
                    bemInternal.buildModPostfix(e.modName, e.modVal) :
                e);

        specialEvents[event] ||
            (specialEvents[event] = createSpecialEvent(event));

        return event;
    },

    /**
     * @class EventManagerFactory
     * @augments i-bem-dom__events:EventManagerFactory
     * @exports i-bem-dom__events_type_bem:EventManagerFactory
     */
    EventManagerFactory = inherit(bemDomEvents.EventManagerFactory,/** @lends EventManagerFactory.prototype */{
        /** @override */
        _createEventManager : function(ctx, params, isInstance) {
            function wrapperFn(fn, fnCtx, fnId) {
                return function(e, data, flags, originalEvent) {
                    if(flags.fns[fnId]) return;

                    var instance,
                        instanceDomElem;

                    if(isInstance) {
                        instance = ctx;
                        instanceDomElem = instance.domElem;
                    } else {
                        // TODO: we could optimize all these "closest" to a single traversing
                        instanceDomElem = $(e.target).closest(params.ctxSelector);
                        instanceDomElem.length && (instance = instanceDomElem.bem(ctx));
                    }

                    if(instance &&
                        (!flags.propagationStoppedDomNode ||
                            !$.contains(instanceDomElem[0], flags.propagationStoppedDomNode))) {
                        originalEvent.data = e.data;
                        // TODO: do we really need both target and bemTarget?
                        originalEvent.bemTarget = originalEvent.target;
                        flags.fns[fnId] = true;
                        fn.call(fnCtx || instance, originalEvent, data);

                        if(originalEvent.isPropagationStopped()) {
                            e.stopPropagation();
                            flags.propagationStoppedDomNode = instanceDomElem[0];
                        }
                    }
                };
            }

            return new this._eventManagerCls(params, wrapperFn, eventBuilder);
        }
    });

provide({
    /**
     * @param {BemDomEntity} ctx
     * @param {String|Object|events:Event} e Event name
     * @param {Object} [data]
     */
    emit : function(ctx, e, data) {
        var originalEvent;
        if(typeof e === 'string') {
            originalEvent = new events.Event(e, ctx);
        } else if(e.modName) {
            originalEvent = new events.Event(MOD_CHANGE_EVENT, ctx);
        } else if(!e.target) {
            e.target = ctx;
            originalEvent = e;
        }

        var event = eventBuilder(e, { bindEntityCls : ctx.__self });

        specialEventsStorage[event] &&
            ctx.domElem.trigger(event, [data, { fns : {}, propagationStoppedDomNode : null }, originalEvent]);
    },

    EventManagerFactory : EventManagerFactory
});

});

/* end: ../../common.blocks/i-bem-dom/__events/_type/i-bem-dom__events_type_bem.js */
/* begin: ../../common.blocks/functions/__debounce/functions__debounce.vanilla.js */
/**
 * @module functions__debounce
 */

modules.define('functions__debounce', function(provide) {

var global = this.global;

provide(
    /**
     * Debounces given function
     * @exports
     * @param {Function} fn function to debounce
     * @param {Number} timeout debounce interval
     * @param {Boolean} [invokeAsap=false] invoke before first interval
     * @param {Object} [ctx] context of function invocation
     * @returns {Function} debounced function
     */
    function(fn, timeout, invokeAsap, ctx) {
        if(arguments.length === 3 && typeof invokeAsap !== 'boolean') {
            ctx = invokeAsap;
            invokeAsap = false;
        }

        var timer;
        return function() {
            var args = arguments;
            ctx || (ctx = this);

            invokeAsap && !timer && fn.apply(ctx, args);

            global.clearTimeout(timer);

            timer = global.setTimeout(function() {
                invokeAsap || fn.apply(ctx, args);
                timer = null;
            }, timeout);
        };
    });
});

/* end: ../../common.blocks/functions/__debounce/functions__debounce.vanilla.js */
/* begin: ../../common.blocks/functions/__throttle/functions__throttle.vanilla.js */
/**
 * @module functions__throttle
 */

modules.define('functions__throttle', function(provide) {

var global = this.global;

provide(
    /**
     * Throttle given function
     * @exports
     * @param {Function} fn function to throttle
     * @param {Number} timeout throttle interval
     * @param {Boolean} [invokeAsap=true] invoke before first interval
     * @param {Object} [ctx] context of function invocation
     * @returns {Function} throttled function
     */
    function(fn, timeout, invokeAsap, ctx) {
        var typeofInvokeAsap = typeof invokeAsap;
        if(typeofInvokeAsap === 'undefined') {
            invokeAsap = true;
        } else if(arguments.length === 3 && typeofInvokeAsap !== 'boolean') {
            ctx = invokeAsap;
            invokeAsap = true;
        }

        var timer, args, needInvoke,
            wrapper = function() {
                if(needInvoke) {
                    fn.apply(ctx, args);
                    needInvoke = false;
                    timer = global.setTimeout(wrapper, timeout);
                } else {
                    timer = null;
                }
            };

        return function() {
            args = arguments;
            ctx || (ctx = this);
            needInvoke = true;

            if(!timer) {
                invokeAsap?
                    wrapper() :
                    timer = global.setTimeout(wrapper, timeout);
            }
        };
    });

});

/* end: ../../common.blocks/functions/__throttle/functions__throttle.vanilla.js */
/* begin: ../../common.blocks/idle/idle.js */
/**
 * @module idle
 */

modules.define('idle', ['inherit', 'events', 'jquery'], function(provide, inherit, events, $) {

var IDLE_TIMEOUT = 3000,
    USER_EVENTS = 'mousemove keydown click',
    /**
     * @class Idle
     * @augments events:Emitter
     */
    Idle = inherit(events.Emitter, /** @lends Idle.prototype */{
        /**
         * @constructor
         */
        __constructor : function() {
            this._timer = null;
            this._isStarted = false;
            this._isIdle = false;
        },

        /**
         * Starts monitoring of idle state
         */
        start : function() {
            if(!this._isStarted) {
                this._isStarted = true;
                this._startTimer();
                $(document).on(USER_EVENTS, $.proxy(this._onUserAction, this));
            }
        },

        /**
         * Stops monitoring of idle state
         */
        stop : function() {
            if(this._isStarted) {
                this._isStarted = false;
                this._stopTimer();
                $(document).off(USER_EVENTS, this._onUserAction);
            }
        },

        /**
         * Returns whether state is idle
         * @returns {Boolean}
         */
        isIdle : function() {
            return this._isIdle;
        },

        _onUserAction : function() {
            if(this._isIdle) {
                this._isIdle = false;
                this.emit('wakeup');
            }

            this._stopTimer();
            this._startTimer();
        },

        _startTimer : function() {
            var _this = this;
            this._timer = setTimeout(
                function() {
                    _this._onTimeout();
                },
                IDLE_TIMEOUT);
        },

        _stopTimer : function() {
            this._timer && clearTimeout(this._timer);
        },

        _onTimeout : function() {
            this._isIdle = true;
            this.emit('idle');
        }
    });

provide(
    /**
     * @exports
     * @type Idle
     */
    new Idle());

});

/* end: ../../common.blocks/idle/idle.js */
/* begin: ../../common.blocks/idle/_start/idle_start_auto.js */
/**
 * Automatically starts idle module
 */

modules.require(['idle'], function(idle) {

idle.start();

});

/* end: ../../common.blocks/idle/_start/idle_start_auto.js */
/* begin: ../../common.blocks/jquery/__event/_type/jquery__event_type_pointerclick.js */
modules.define('jquery', ['next-tick'], function(provide, nextTick, $) {

var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream,
    event = $.event.special.pointerclick = {
        setup : function() {
            if(isIOS) {
                $(this)
                    .on('pointerdown', event.onPointerdown)
                    .on('pointerup', event.onPointerup)
                    .on('pointerleave pointercancel', event.onPointerleave);
            } else {
                $(this).on('click', event.handler);
            }
        },

        teardown : function() {
            if(isIOS) {
                $(this)
                    .off('pointerdown', event.onPointerdown)
                    .off('pointerup', event.onPointerup)
                    .off('pointerleave pointercancel', event.onPointerleave);
            } else {
                $(this).off('click', event.handler);
            }
        },

        handler : function(e) {
            if(!e.button) {
                var type = e.type;
                e.type = 'pointerclick';
                $.event.dispatch.apply(this, arguments);
                e.type = type;
            }
        },

        onPointerdown : function(e) {
            pointerdownEvent = e;
        },

        onPointerleave : function() {
            pointerdownEvent = null;
        },

        onPointerup : function(e) {
            if(!pointerdownEvent) return;

            if(!pointerDownUpInProgress) {
                nextTick(function() {
                    pointerDownUpInProgress = false;
                    pointerdownEvent = null;
                });
                pointerDownUpInProgress = true;
            }

            event.handler.apply(this, arguments);
        }
    },
    pointerDownUpInProgress = false,
    pointerdownEvent;

provide($);

});

/* end: ../../common.blocks/jquery/__event/_type/jquery__event_type_pointerclick.js */
/* begin: ../../common.blocks/jquery/__event/_type/jquery__event_type_pointernative.js */
;(function(global, factory) {

if(typeof modules === 'object' && modules.isDefined('jquery')) {
    modules.define('jquery', function(provide, $) {
        factory(this.global, $);
        provide($);
    });
} else if(typeof jQuery === 'function') {
    factory(global, jQuery);
}

}(this, function(window, $) {

var jqEvent = $.event;

// NOTE: Remove jQuery special fixes for pointerevents – we fix them ourself
delete jqEvent.special.pointerenter;
delete jqEvent.special.pointerleave;

if(window.PointerEvent) {
    // Have native PointerEvent support, nothing to do than
    return;
}

/*!
 * Most of source code is taken from PointerEvents Polyfill
 * written by Polymer Team (https://github.com/Polymer/PointerEvents)
 * and licensed under the BSD License.
 */

var doc = document,
    HAS_BITMAP_TYPE = window.MSPointerEvent && typeof window.MSPointerEvent.MSPOINTER_TYPE_MOUSE === 'number',
    undef;

/*!
 * Returns a snapshot of the event, with writable properties.
 *
 * @param {Event} event An event that contains properties to copy.
 * @returns {Object} An object containing shallow copies of `inEvent`'s
 *    properties.
 */
function cloneEvent(event) {
    var eventCopy = $.extend(new $.Event(), event);
    if(event.preventDefault) {
        eventCopy.preventDefault = function() {
            event.preventDefault();
        };
    }
    return eventCopy;
}

/*!
 * Dispatches the event to the target, taking event's bubbling into account.
 */
function dispatchEvent(event, target) {
    return event.bubbles?
        jqEvent.trigger(event, null, target) :
        jqEvent.dispatch.call(target, event);
}

var MOUSE_PROPS = {
        bubbles : false,
        cancelable : false,
        view : null,
        detail : null,
        screenX : 0,
        screenY : 0,
        clientX : 0,
        clientY : 0,
        ctrlKey : false,
        altKey : false,
        shiftKey : false,
        metaKey : false,
        button : 0,
        relatedTarget : null,
        pageX : 0,
        pageY : 0
    },
    mouseProps = Object.keys(MOUSE_PROPS),
    mousePropsLen = mouseProps.length,
    mouseDefaults = mouseProps.map(function(prop) { return MOUSE_PROPS[prop] });

/*!
 * Pointer event constructor
 *
 * @param {String} type
 * @param {Object} [params]
 * @returns {Event}
 * @constructor
 */
function PointerEvent(type, params) {
    params || (params = {});

    var e = $.Event(type);

    // define inherited MouseEvent properties
    for(var i = 0, p; i < mousePropsLen; i++) {
        p = mouseProps[i];
        e[p] = params[p] || mouseDefaults[i];
    }

    e.buttons = params.buttons || 0;

    // add x/y properties aliased to clientX/Y
    e.x = e.clientX;
    e.y = e.clientY;

    // Spec requires that pointers without pressure specified use 0.5 for down
    // state and 0 for up state.
    var pressure = 0;
    if(params.pressure) {
        pressure = params.pressure;
    } else {
        pressure = e.buttons? 0.5 : 0;
    }

    // define the properties of the PointerEvent interface
    e.pointerId = params.pointerId || 0;
    e.width = params.width || 0;
    e.height = params.height || 0;
    e.pressure = pressure;
    e.tiltX = params.tiltX || 0;
    e.tiltY = params.tiltY || 0;
    e.pointerType = params.pointerType || '';
    e.hwTimestamp = params.hwTimestamp || 0;
    e.isPrimary = params.isPrimary || false;

    // add some common jQuery properties
    e.which = typeof params.which === 'undefined'? 1 : params.which;

    return e;
}

function SparseArrayMap() {
    this.array = [];
    this.size = 0;
}

SparseArrayMap.prototype = {
    set : function(k, v) {
        if(v === undef) {
            return this['delete'](k);
        }
        if(!this.has(k)) {
            this.size++;
        }
        this.array[k] = v;
    },

    has : function(k) {
        return this.array[k] !== undef;
    },

    'delete' : function(k) {
        if(this.has(k)){
            delete this.array[k];
            this.size--;
        }
    },

    get : function(k) {
        return this.array[k];
    },

    clear : function() {
        this.array.length = 0;
        this.size = 0;
    },

    // return value, key, map
    forEach : function(callback, ctx) {
        return this.array.forEach(function(v, k) {
            callback.call(ctx, v, k, this);
        }, this);
    }
};

// jscs:disable requireMultipleVarDecl
var PointerMap = window.Map && window.Map.prototype.forEach? Map : SparseArrayMap,
    pointerMap = new PointerMap();

var dispatcher = {
    eventMap : {},
    eventSourceList : [],

    /*!
     * Add a new event source that will generate pointer events
     */
    registerSource : function(name, source) {
        var newEvents = source.events;
        if(newEvents) {
            newEvents.forEach(function(e) {
                source[e] && (this.eventMap[e] = function() { source[e].apply(source, arguments) });
            }, this);
            this.eventSourceList.push(source);
        }
    },

    register : function(element) {
        var len = this.eventSourceList.length;
        for(var i = 0, es; (i < len) && (es = this.eventSourceList[i]); i++) {
            // call eventsource register
            es.register.call(es, element);
        }
    },

    unregister : function(element) {
        var l = this.eventSourceList.length;
        for(var i = 0, es; (i < l) && (es = this.eventSourceList[i]); i++) {
            // call eventsource register
            es.unregister.call(es, element);
        }
    },

    down : function(event) {
        event.bubbles = true;
        this.fireEvent('pointerdown', event);
    },

    move : function(event) {
        event.bubbles = true;
        this.fireEvent('pointermove', event);
    },

    up : function(event) {
        event.bubbles = true;
        this.fireEvent('pointerup', event);
    },

    enter : function(event) {
        event.bubbles = false;
        this.fireEvent('pointerenter', event);
    },

    leave : function(event) {
        event.bubbles = false;
        this.fireEvent('pointerleave', event);
    },

    over : function(event) {
        event.bubbles = true;
        this.fireEvent('pointerover', event);
    },

    out : function(event) {
        event.bubbles = true;
        this.fireEvent('pointerout', event);
    },

    cancel : function(event) {
        event.bubbles = true;
        this.fireEvent('pointercancel', event);
    },

    leaveOut : function(event) {
        this.out(event);
        this.enterLeave(event, this.leave);
    },

    enterOver : function(event) {
        this.over(event);
        this.enterLeave(event, this.enter);
    },

    enterLeave : function(event, fn) {
        var target = event.target,
            relatedTarget = event.relatedTarget;

        if(!this.contains(target, relatedTarget)) {
            while(target && target !== relatedTarget) {
                event.target = target;
                fn.call(this, event);

                target = target.parentNode;
            }
        }
    },

    contains : function(target, relatedTarget) {
        return target === relatedTarget || $.contains(target, relatedTarget);
    },

    // LISTENER LOGIC
    eventHandler : function(e) {
        // This is used to prevent multiple dispatch of pointerevents from
        // platform events. This can happen when two elements in different scopes
        // are set up to create pointer events, which is relevant to Shadow DOM.
        if(e._handledByPE) {
            return;
        }

        var type = e.type, fn;
        (fn = this.eventMap && this.eventMap[type]) && fn(e);

        e._handledByPE = true;
    },

    /*!
     * Sets up event listeners
     */
    listen : function(target, events) {
        events.forEach(function(e) {
            this.addEvent(target, e);
        }, this);
    },

    /*!
     * Removes event listeners
     */
    unlisten : function(target, events) {
        events.forEach(function(e) {
            this.removeEvent(target, e);
        }, this);
    },

    addEvent : function(target, eventName) {
        $(target).on(eventName, boundHandler);
    },

    removeEvent : function(target, eventName) {
        $(target).off(eventName, boundHandler);
    },

    getTarget : function(event) {
        return event._target;
    },

    /*!
     * Creates a new Event of type `type`, based on the information in `event`
     */
    makeEvent : function(type, event) {
        var e = new PointerEvent(type, event);
        if(event.preventDefault) {
            e.preventDefault = event.preventDefault;
        }

        e._target = e._target || event.target;

        return e;
    },

    /*!
     * Dispatches the event to its target
     */
    dispatchEvent : function(event) {
        var target = this.getTarget(event);
        if(target) {
            if(!event.target) {
                event.target = target;
            }

            return dispatchEvent(event, target);
        }
    },

    /*!
     * Makes and dispatch an event in one call
     */
    fireEvent : function(type, event) {
        var e = this.makeEvent(type, event);
        return this.dispatchEvent(e);
    }
};

function boundHandler() {
    dispatcher.eventHandler.apply(dispatcher, arguments);
}

var CLICK_COUNT_TIMEOUT = 200,
    // Radius around touchend that swallows mouse events
    MOUSE_DEDUP_DIST = 25,
    MOUSE_POINTER_ID = 1,
    // This should be long enough to ignore compat mouse events made by touch
    TOUCH_DEDUP_TIMEOUT = 2500,
    // A distance for which touchmove should fire pointercancel event
    TOUCHMOVE_HYSTERESIS = 20;

// handler block for native mouse events
var mouseEvents = {
    POINTER_TYPE : 'mouse',
    events : [
        'mousedown',
        'mousemove',
        'mouseup',
        'mouseover',
        'mouseout'
    ],

    register : function(target) {
        dispatcher.listen(target, this.events);
    },

    unregister : function(target) {
        dispatcher.unlisten(target, this.events);
    },

    lastTouches : [],

    // collide with the global mouse listener
    isEventSimulatedFromTouch : function(event) {
        var lts = this.lastTouches,
            x = event.clientX,
            y = event.clientY;

        for(var i = 0, l = lts.length, t; i < l && (t = lts[i]); i++) {
            // simulated mouse events will be swallowed near a primary touchend
            var dx = Math.abs(x - t.x), dy = Math.abs(y - t.y);
            if(dx <= MOUSE_DEDUP_DIST && dy <= MOUSE_DEDUP_DIST) {
                return true;
            }
        }
    },

    prepareEvent : function(event) {
        var e = cloneEvent(event);
        e.pointerId = MOUSE_POINTER_ID;
        e.isPrimary = true;
        e.pointerType = this.POINTER_TYPE;
        return e;
    },

    mousedown : function(event) {
        if(!this.isEventSimulatedFromTouch(event)) {
            if(pointerMap.has(MOUSE_POINTER_ID)) {
                // http://crbug/149091
                this.cancel(event);
            }

            pointerMap.set(MOUSE_POINTER_ID, event);

            var e = this.prepareEvent(event);
            dispatcher.down(e);
        }
    },

    mousemove : function(event) {
        if(!this.isEventSimulatedFromTouch(event)) {
            var e = this.prepareEvent(event);
            dispatcher.move(e);
        }
    },

    mouseup : function(event) {
        if(!this.isEventSimulatedFromTouch(event)) {
            var p = pointerMap.get(MOUSE_POINTER_ID);
            if(p && p.button === event.button) {
                var e = this.prepareEvent(event);
                dispatcher.up(e);
                this.cleanupMouse();
            }
        }
    },

    mouseover : function(event) {
        if(!this.isEventSimulatedFromTouch(event)) {
            var e = this.prepareEvent(event);
            dispatcher.enterOver(e);
        }
    },

    mouseout : function(event) {
        if(!this.isEventSimulatedFromTouch(event)) {
            var e = this.prepareEvent(event);
            dispatcher.leaveOut(e);
        }
    },

    cancel : function(inEvent) {
        var e = this.prepareEvent(inEvent);
        dispatcher.cancel(e);
        this.cleanupMouse();
    },

    cleanupMouse : function() {
        pointerMap['delete'](MOUSE_POINTER_ID);
    }
};

var touchEvents = {
    events : [
        'touchstart',
        'touchmove',
        'touchend',
        'touchcancel'
    ],

    register : function(target) {
        dispatcher.listen(target, this.events);
    },

    unregister : function(target) {
        dispatcher.unlisten(target, this.events);
    },

    POINTER_TYPE : 'touch',
    clickCount : 0,
    resetId : null,
    firstTouch : null,

    isPrimaryTouch : function(touch) {
        return this.firstTouch === touch.identifier;
    },

    /*!
     * Sets primary touch if there no pointers, or the only pointer is the mouse
     */
    setPrimaryTouch : function(touch) {
        if(pointerMap.size === 0 ||
                (pointerMap.size === 1 && pointerMap.has(MOUSE_POINTER_ID))) {
            this.firstTouch = touch.identifier;
            this.firstXY = { X : touch.clientX, Y : touch.clientY };
            this.scrolling = null;

            this.cancelResetClickCount();
        }
    },

    removePrimaryPointer : function(pointer) {
        if(pointer.isPrimary) {
            this.firstTouch = null;
            // TODO(@narqo): It seems that, flushing `firstXY` flag explicitly in `touchmove` handler is enough.
            // Original code from polymer doing `this.firstXY = null` on every `removePrimaryPointer` call, but looks
            // like it is harmful in some of our usecases.
            this.resetClickCount();
        }
    },

    resetClickCount : function() {
        var _this = this;
        this.resetId = setTimeout(function() {
            _this.clickCount = 0;
            _this.resetId = null;
        }, CLICK_COUNT_TIMEOUT);
    },

    cancelResetClickCount : function() {
        this.resetId && clearTimeout(this.resetId);
    },

    typeToButtons : function(type) {
        return type === 'touchstart' || type === 'touchmove'? 1 : 0;
    },

    findTarget : function(event) {
        // Currently we don't interested in shadow dom handling
        return doc.elementFromPoint(event.clientX, event.clientY);
    },

    touchToPointer : function(touch) {
        var cte = this.currentTouchEvent,
            e = cloneEvent(touch);

        // Spec specifies that pointerId 1 is reserved for Mouse.
        // Touch identifiers can start at 0.
        // Add 2 to the touch identifier for compatibility.
        e.pointerId = touch.identifier + 2;
        e.target = this.findTarget(e);
        e.bubbles = true;
        e.cancelable = true;
        e.detail = this.clickCount;
        e.button = 0;
        e.buttons = this.typeToButtons(cte.type);
        e.width = touch.webkitRadiusX || touch.radiusX || 0;
        e.height = touch.webkitRadiusY || touch.radiusY || 0;
        e.pressure = touch.mozPressure || touch.webkitForce || touch.force || 0.5;
        e.isPrimary = this.isPrimaryTouch(touch);
        e.pointerType = this.POINTER_TYPE;

        // forward touch preventDefaults
        var _this = this;
        e.preventDefault = function() {
            _this.scrolling = false;
            _this.firstXY = null;
            cte.preventDefault();
        };

        return e;
    },

    processTouches : function(event, fn) {
        var tl = event.originalEvent.changedTouches;
        this.currentTouchEvent = event;
        for(var i = 0, t; i < tl.length; i++) {
            t = tl[i];
            fn.call(this, this.touchToPointer(t));
        }
    },

    shouldScroll : function(touchEvent) {
        // return "true" for things to be much easier
        return true;
    },

    findTouch : function(touches, pointerId) {
        for(var i = 0, l = touches.length, t; i < l && (t = touches[i]); i++) {
            if(t.identifier === pointerId) {
                return true;
            }
        }
    },

    /*!
     * In some instances, a touchstart can happen without a touchend.
     * This leaves the pointermap in a broken state.
     * Therefore, on every touchstart, we remove the touches
     * that did not fire a touchend event.
     *
     * To keep state globally consistent, we fire a pointercancel
     * for this "abandoned" touch
     */
    vacuumTouches : function(touchEvent) {
        var touches = touchEvent.touches;
        // `pointermap.size` should be less than length of touches here, as the touchstart has not
        // been processed yet.
        if(pointerMap.size >= touches.length) {
            var d = [];

            pointerMap.forEach(function(pointer, pointerId) {
                // Never remove pointerId == 1, which is mouse.
                // Touch identifiers are 2 smaller than their pointerId, which is the
                // index in pointermap.
                if(pointerId === MOUSE_POINTER_ID || this.findTouch(touches, pointerId - 2)) return;
                d.push(pointer.outEvent);
            }, this);

            d.forEach(this.cancelOut, this);
        }
    },

    /*!
     * Prevents synth mouse events from creating pointer events
     */
    dedupSynthMouse : function(touchEvent) {
        var lts = mouseEvents.lastTouches,
            t = touchEvent.changedTouches[0];

        // only the primary finger will synth mouse events
        if(this.isPrimaryTouch(t)) {
            // remember x/y of last touch
            var lt = { x : t.clientX, y : t.clientY };
            lts.push(lt);

            setTimeout(function() {
                var i = lts.indexOf(lt);
                i > -1 && lts.splice(i, 1);
            }, TOUCH_DEDUP_TIMEOUT);
        }
    },

    touchstart : function(event) {
        var touchEvent = event.originalEvent;

        this.vacuumTouches(touchEvent);
        this.setPrimaryTouch(touchEvent.changedTouches[0]);
        this.dedupSynthMouse(touchEvent);

        if(!this.scrolling) {
            this.clickCount++;
            this.processTouches(event, this.overDown);
        }
    },

    touchmove : function(event) {
        var touchEvent = event.originalEvent;
        if(!this.scrolling) {
            if(this.scrolling === null && this.shouldScroll(touchEvent)) {
                this.scrolling = true;
            } else {
                event.preventDefault();
                this.processTouches(event, this.moveOverOut);
            }
        } else if(this.firstXY) {
            var firstXY = this.firstXY,
                touch = touchEvent.changedTouches[0],
                dx = touch.clientX - firstXY.X,
                dy = touch.clientY - firstXY.Y,
                dd = Math.sqrt(dx * dx + dy * dy);
            if(dd >= TOUCHMOVE_HYSTERESIS) {
                this.touchcancel(event);
                this.scrolling = true;
                this.firstXY = null;
            }
        }
    },

    touchend : function(event) {
        var touchEvent = event.originalEvent;
        this.dedupSynthMouse(touchEvent);
        this.processTouches(event, this.upOut);
    },

    touchcancel : function(event) {
        this.processTouches(event, this.cancelOut);
    },

    overDown : function(pEvent) {
        var target = pEvent.target;
        pointerMap.set(pEvent.pointerId, {
            target : target,
            outTarget : target,
            outEvent : pEvent
        });
        dispatcher.over(pEvent);
        dispatcher.enter(pEvent);
        dispatcher.down(pEvent);
    },

    moveOverOut : function(pEvent) {
        var pointer = pointerMap.get(pEvent.pointerId);

        // a finger drifted off the screen, ignore it
        if(!pointer) {
            return;
        }

        dispatcher.move(pEvent);

        var outEvent = pointer.outEvent,
            outTarget = pointer.outTarget;

        if(outEvent && outTarget !== pEvent.target) {
            pEvent.relatedTarget = outTarget;
            outEvent.relatedTarget = pEvent.target;
            // recover from retargeting by shadow
            outEvent.target = outTarget;

            if(pEvent.target) {
                dispatcher.leaveOut(outEvent);
                dispatcher.enterOver(pEvent);
            } else {
                // clean up case when finger leaves the screen
                pEvent.target = outTarget;
                pEvent.relatedTarget = null;
                this.cancelOut(pEvent);
            }
        }

        pointer.outEvent = pEvent;
        pointer.outTarget = pEvent.target;
    },

    upOut : function(pEvent) {
        dispatcher.up(pEvent);
        dispatcher.out(pEvent);
        dispatcher.leave(pEvent);

        this.cleanUpPointer(pEvent);
    },

    cancelOut : function(pEvent) {
        dispatcher.cancel(pEvent);
        dispatcher.out(pEvent);
        dispatcher.leave(pEvent);
        this.cleanUpPointer(pEvent);
    },

    cleanUpPointer : function(pEvent) {
        pointerMap['delete'](pEvent.pointerId);
        this.removePrimaryPointer(pEvent);
    }
};

var msEvents = {
    events : [
        'MSPointerDown',
        'MSPointerMove',
        'MSPointerUp',
        'MSPointerOut',
        'MSPointerOver',
        'MSPointerCancel'
    ],

    register : function(target) {
        dispatcher.listen(target, this.events);
    },

    unregister : function(target) {
        dispatcher.unlisten(target, this.events);
    },

    POINTER_TYPES : [
        '',
        'unavailable',
        'touch',
        'pen',
        'mouse'
    ],

    prepareEvent : function(event) {
        var e = cloneEvent(event);
        HAS_BITMAP_TYPE && (e.pointerType = this.POINTER_TYPES[event.pointerType]);
        return e;
    },

    MSPointerDown : function(event) {
        pointerMap.set(event.pointerId, event);
        var e = this.prepareEvent(event);
        dispatcher.down(e);
    },

    MSPointerMove : function(event) {
        var e = this.prepareEvent(event);
        dispatcher.move(e);
    },

    MSPointerUp : function(event) {
        var e = this.prepareEvent(event);
        dispatcher.up(e);
        this.cleanup(event.pointerId);
    },

    MSPointerOut : function(event) {
        var e = this.prepareEvent(event);
        dispatcher.leaveOut(e);
    },

    MSPointerOver : function(event) {
        var e = this.prepareEvent(event);
        dispatcher.enterOver(e);
    },

    MSPointerCancel : function(event) {
        var e = this.prepareEvent(event);
        dispatcher.cancel(e);
        this.cleanup(event.pointerId);
    },

    cleanup : function(id) {
        pointerMap['delete'](id);
    }
};

var navigator = window.navigator;
if(navigator.msPointerEnabled) {
    dispatcher.registerSource('ms', msEvents);
} else {
    dispatcher.registerSource('mouse', mouseEvents);
    if(typeof window.ontouchstart !== 'undefined') {
        dispatcher.registerSource('touch', touchEvents);
    }
}

dispatcher.register(doc);

}));

/* end: ../../common.blocks/jquery/__event/_type/jquery__event_type_pointernative.js */
/* begin: ../../common.blocks/keyboard/__codes/keyboard__codes.js */
/**
 * @module keyboard__codes
 */
modules.define('keyboard__codes', function(provide) {

provide(/** @exports */{
    /** @type {Number} */
    BACKSPACE : 8,
    /** @type {Number} */
    TAB : 9,
    /** @type {Number} */
    ENTER : 13,
    /** @type {Number} */
    CAPS_LOCK : 20,
    /** @type {Number} */
    ESC : 27,
    /** @type {Number} */
    SPACE : 32,
    /** @type {Number} */
    PAGE_UP : 33,
    /** @type {Number} */
    PAGE_DOWN : 34,
    /** @type {Number} */
    END : 35,
    /** @type {Number} */
    HOME : 36,
    /** @type {Number} */
    LEFT : 37,
    /** @type {Number} */
    UP : 38,
    /** @type {Number} */
    RIGHT : 39,
    /** @type {Number} */
    DOWN : 40,
    /** @type {Number} */
    INSERT : 45,
    /** @type {Number} */
    DELETE : 46
});

});

/* end: ../../common.blocks/keyboard/__codes/keyboard__codes.js */
/* begin: ../../common.blocks/loader/_type/loader_type_bundle.js */
/**
 * @module loader_type_bundle
 * @description Load BEM bundle (JS+CSS) from external URL.
 */

modules.define('loader_type_bundle', function(provide) {

var LOADING_TIMEOUT = 30000,
    global = this.global,
    doc = document,
    head,
    bundles = {},

    handleError = function(bundleId) {
        var bundleDesc = bundles[bundleId];

        if(!bundleDesc) return;

        var fns = bundleDesc.errorFns,
            fn;

        clearTimeout(bundleDesc.timer);

        while(fn = fns.shift()) fn();
        delete bundles[bundleId];
    },

    appendCss = function(css) {
        var style = doc.createElement('style');
        style.type = 'text/css';
        head.appendChild(style); // ie needs to insert style before setting content
        style.styleSheet?
            style.styleSheet.cssText = css :
            style.appendChild(doc.createTextNode(css));
    },

    /**
     * Loads bundle
     * @exports
     * @param {String} id
     * @param {String} url
     * @param {Function} onSuccess
     * @param {Function} [onError]
     */
    load = function(id, url, onSuccess, onError) {
        var bundle = bundles[id];
        if(bundle) {
            if(bundle.successFns) { // bundle is being loaded
                bundle.successFns.push(onSuccess);
                onError && bundle.errorFns.push(onError);
            } else { // bundle was loaded before
                setTimeout(onSuccess, 0);
            }
            return;
        }

        var script = doc.createElement('script'),
            errorFn = function() {
                handleError(id);
            };

        script.type = 'text/javascript';
        script.charset = 'utf-8';
        script.src = url;
        script.onerror = errorFn; // for browsers that support
        setTimeout(function() {
            (head || (head = doc.getElementsByTagName('head')[0])).insertBefore(script, head.firstChild);
        }, 0);

        bundles[id] = {
            successFns : [onSuccess],
            errorFns : onError? [onError] : [],
            timer : setTimeout(errorFn, LOADING_TIMEOUT)
        };
    };

load._loaded = function(bundle) {
    var bundleDesc = bundles[bundle.id];

    if(!bundleDesc) return;

    clearTimeout(bundleDesc.timer);

    bundle.js && bundle.js.call(global);

    bundle.css && appendCss(bundle.css);

    if(bundle.hcss) {
        var styles = [],
            _ycssjs = window._ycssjs;

        bundle.hcss.forEach(function(hsh) {
            if(_ycssjs) {
                if(hsh[0] in _ycssjs) return;
                _ycssjs(hsh[0]);
            }

            styles.push(hsh[1]);
        });

        styles.length && appendCss(styles.join(''));
    }

    function onSuccess() {
        var fns = bundleDesc.successFns, fn;
        while(fn = fns.shift()) fn();
        delete bundleDesc.successFns;
    }

    modules.isDefined('i-bem__dom_init')?
        modules.require(['i-bem__dom_init'], onSuccess) :
        onSuccess();
};

provide(load);

});

/* end: ../../common.blocks/loader/_type/loader_type_bundle.js */
/* begin: ../../common.blocks/strings/__escape/strings__escape.vanilla.js */
/**
 * @module strings__escape
 * @description A set of string escaping functions
 */

modules.define('strings__escape', function(provide) {

var symbols = {
        '"' : '&quot;',
        '\'' : '&apos;',
        '&' : '&amp;',
        '<' : '&lt;',
        '>' : '&gt;'
    },
    mapSymbol = function(s) {
        return symbols[s] || s;
    },
    buildEscape = function(regexp) {
        regexp = new RegExp(regexp, 'g');
        return function(str) {
            return ('' + str).replace(regexp, mapSymbol);
        };
    };

provide(/** @exports */{
    /**
     * Escape string to use in XML
     * @type Function
     * @param {String} str
     * @returns {String}
     */
    xml : buildEscape('[&<>]'),

    /**
     * Escape string to use in HTML
     * @type Function
     * @param {String} str
     * @returns {String}
     */
    html : buildEscape('[&<>]'),

    /**
     * Escape string to use in attributes
     * @type Function
     * @param {String} str
     * @returns {String}
     */
    attr : buildEscape('["\'&<>]')
});

});

/* end: ../../common.blocks/strings/__escape/strings__escape.vanilla.js */
/* begin: ../../common.blocks/tick/tick.vanilla.js */
/**
 * @module tick
 * @description Helpers for polling anything
 */

modules.define('tick', ['inherit', 'events'], function(provide, inherit, events) {

var TICK_INTERVAL = 50,
    global = this.global,

    /**
     * @class Tick
     * @augments events:Emitter
     */
    Tick = inherit(events.Emitter, /** @lends Tick.prototype */{
        /**
         * @constructor
         */
        __constructor : function() {
            this._timer = null;
            this._isStarted = false;
        },

        /**
         * Starts polling
         */
        start : function() {
            if(!this._isStarted) {
                this._isStarted = true;
                this._scheduleTick();
            }
        },

        /**
         * Stops polling
         */
        stop : function() {
            if(this._isStarted) {
                this._isStarted = false;
                global.clearTimeout(this._timer);
            }
        },

        _scheduleTick : function() {
            var _this = this;
            this._timer = global.setTimeout(
                function() {
                    _this._onTick();
                },
                TICK_INTERVAL);
        },

        _onTick : function() {
            this.emit('tick');

            this._isStarted && this._scheduleTick();
        }
    });

provide(
    /**
     * @exports
     * @type Tick
     */
    new Tick());

});

/* end: ../../common.blocks/tick/tick.vanilla.js */
/* begin: ../../common.blocks/tick/_start/tick_start_auto.vanilla.js */
/**
 * Automatically starts tick module
 */

modules.require(['tick'], function(tick) {

tick.start();

});

/* end: ../../common.blocks/tick/_start/tick_start_auto.vanilla.js */
/* begin: ../../common.blocks/uri/uri.vanilla.js */
/**
 * @module uri
 * @description A set of helpers to work with URI
 */

modules.define('uri',  function(provide) {

// Equivalency table for cp1251 and utf8.
var map = { '%D0' : '%D0%A0', '%C0' : '%D0%90', '%C1' : '%D0%91', '%C2' : '%D0%92', '%C3' : '%D0%93', '%C4' : '%D0%94', '%C5' : '%D0%95', '%A8' : '%D0%81', '%C6' : '%D0%96', '%C7' : '%D0%97', '%C8' : '%D0%98', '%C9' : '%D0%99', '%CA' : '%D0%9A', '%CB' : '%D0%9B', '%CC' : '%D0%9C', '%CD' : '%D0%9D', '%CE' : '%D0%9E', '%CF' : '%D0%9F', '%D1' : '%D0%A1', '%D2' : '%D0%A2', '%D3' : '%D0%A3', '%D4' : '%D0%A4', '%D5' : '%D0%A5', '%D6' : '%D0%A6', '%D7' : '%D0%A7', '%D8' : '%D0%A8', '%D9' : '%D0%A9', '%DA' : '%D0%AA', '%DB' : '%D0%AB', '%DC' : '%D0%AC', '%DD' : '%D0%AD', '%DE' : '%D0%AE', '%DF' : '%D0%AF', '%E0' : '%D0%B0', '%E1' : '%D0%B1', '%E2' : '%D0%B2', '%E3' : '%D0%B3', '%E4' : '%D0%B4', '%E5' : '%D0%B5', '%B8' : '%D1%91', '%E6' : '%D0%B6', '%E7' : '%D0%B7', '%E8' : '%D0%B8', '%E9' : '%D0%B9', '%EA' : '%D0%BA', '%EB' : '%D0%BB', '%EC' : '%D0%BC', '%ED' : '%D0%BD', '%EE' : '%D0%BE', '%EF' : '%D0%BF', '%F0' : '%D1%80', '%F1' : '%D1%81', '%F2' : '%D1%82', '%F3' : '%D1%83', '%F4' : '%D1%84', '%F5' : '%D1%85', '%F6' : '%D1%86', '%F7' : '%D1%87', '%F8' : '%D1%88', '%F9' : '%D1%89', '%FA' : '%D1%8A', '%FB' : '%D1%8B', '%FC' : '%D1%8C', '%FD' : '%D1%8D', '%FE' : '%D1%8E', '%FF' : '%D1%8F' };

function convert(str) {
    // Symbol code in cp1251 (hex) : symbol code in utf8)
    return str.replace(
        /%.{2}/g,
        function($0) {
            return map[$0] || $0;
        });
}

function decode(fn,  str) {
    var decoded = '';

    // Try/catch block for getting the encoding of the source string.
    // Error is thrown if a non-UTF8 string is input.
    // If the string was not decoded, it is returned without changes.
    try {
        decoded = fn(str);
    } catch (e1) {
        try {
            decoded = fn(convert(str));
        } catch (e2) {
            decoded = str;
        }
    }

    return decoded;
}

provide(/** @exports */{
    /**
     * Decodes URI string
     * @param {String} str
     * @returns {String}
     */
    decodeURI : function(str) {
        return decode(decodeURI,  str);
    },

    /**
     * Decodes URI component string
     * @param {String} str
     * @returns {String}
     */
    decodeURIComponent : function(str) {
        return decode(decodeURIComponent,  str);
    }
});

});

/* end: ../../common.blocks/uri/uri.vanilla.js */
/* begin: ../../common.blocks/uri/__querystring/uri__querystring.vanilla.js */
/**
 * @module uri__querystring
 * @description A set of helpers to work with query strings
 */

modules.define('uri__querystring', ['uri'], function(provide, uri) {

var hasOwnProperty = Object.prototype.hasOwnProperty;

function addParam(res, name, val) {
    /* jshint eqnull: true */
    res.push(encodeURIComponent(name) + '=' + (val == null? '' : encodeURIComponent(val)));
}

provide(/** @exports */{
    /**
     * Parse a query string to an object
     * @param {String} str
     * @returns {Object}
     */
    parse : function(str) {
        if(!str) {
            return {};
        }

        return str.split('&').reduce(
            function(res, pair) {
                if(!pair) {
                    return res;
                }

                var eq = pair.indexOf('='),
                    name, val;

                if(eq >= 0) {
                    name = pair.substr(0, eq);
                    val = pair.substr(eq + 1);
                } else {
                    name = pair;
                    val = '';
                }

                name = uri.decodeURIComponent(name);
                val = uri.decodeURIComponent(val);

                hasOwnProperty.call(res, name)?
                    Array.isArray(res[name])?
                        res[name].push(val) :
                        res[name] = [res[name], val] :
                    res[name] = val;

                return res;
            },
            {});
    },

    /**
     * Serialize an object to a query string
     * @param {Object} obj
     * @returns {String}
     */
    stringify : function(obj) {
        return Object.keys(obj)
            .reduce(
                function(res, name) {
                    var val = obj[name];
                    Array.isArray(val)?
                        val.forEach(function(val) {
                            addParam(res, name, val);
                        }) :
                        addParam(res, name, val);
                    return res;
                },
                [])
            .join('&');
    }
});

});

/* end: ../../common.blocks/uri/__querystring/uri__querystring.vanilla.js */
/* begin: ../../common.blocks/vow/vow.vanilla.js */
/**
 * @module vow
 * @author Filatov Dmitry <dfilatov@yandex-team.ru>
 * @version 0.4.13
 * @license
 * Dual licensed under the MIT and GPL licenses:
 *   * http://www.opensource.org/licenses/mit-license.php
 *   * http://www.gnu.org/licenses/gpl.html
 */

(function(global) {

var undef,
    nextTick = (function() {
        var fns = [],
            enqueueFn = function(fn) {
                fns.push(fn);
                return fns.length === 1;
            },
            callFns = function() {
                var fnsToCall = fns, i = 0, len = fns.length;
                fns = [];
                while(i < len) {
                    fnsToCall[i++]();
                }
            };

        if(typeof setImmediate === 'function') { // ie10, nodejs >= 0.10
            return function(fn) {
                enqueueFn(fn) && setImmediate(callFns);
            };
        }

        if(typeof process === 'object' && process.nextTick) { // nodejs < 0.10
            return function(fn) {
                enqueueFn(fn) && process.nextTick(callFns);
            };
        }

        var MutationObserver = global.MutationObserver || global.WebKitMutationObserver; // modern browsers
        if(MutationObserver) {
            var num = 1,
                node = document.createTextNode('');

            new MutationObserver(callFns).observe(node, { characterData : true });

            return function(fn) {
                enqueueFn(fn) && (node.data = (num *= -1));
            };
        }

        if(global.postMessage) {
            var isPostMessageAsync = true;
            if(global.attachEvent) {
                var checkAsync = function() {
                        isPostMessageAsync = false;
                    };
                global.attachEvent('onmessage', checkAsync);
                global.postMessage('__checkAsync', '*');
                global.detachEvent('onmessage', checkAsync);
            }

            if(isPostMessageAsync) {
                var msg = '__promise' + Math.random() + '_' +new Date,
                    onMessage = function(e) {
                        if(e.data === msg) {
                            e.stopPropagation && e.stopPropagation();
                            callFns();
                        }
                    };

                global.addEventListener?
                    global.addEventListener('message', onMessage, true) :
                    global.attachEvent('onmessage', onMessage);

                return function(fn) {
                    enqueueFn(fn) && global.postMessage(msg, '*');
                };
            }
        }

        var doc = global.document;
        if('onreadystatechange' in doc.createElement('script')) { // ie6-ie8
            var createScript = function() {
                    var script = doc.createElement('script');
                    script.onreadystatechange = function() {
                        script.parentNode.removeChild(script);
                        script = script.onreadystatechange = null;
                        callFns();
                };
                (doc.documentElement || doc.body).appendChild(script);
            };

            return function(fn) {
                enqueueFn(fn) && createScript();
            };
        }

        return function(fn) { // old browsers
            enqueueFn(fn) && setTimeout(callFns, 0);
        };
    })(),
    throwException = function(e) {
        nextTick(function() {
            throw e;
        });
    },
    isFunction = function(obj) {
        return typeof obj === 'function';
    },
    isObject = function(obj) {
        return obj !== null && typeof obj === 'object';
    },
    toStr = Object.prototype.toString,
    isArray = Array.isArray || function(obj) {
        return toStr.call(obj) === '[object Array]';
    },
    getArrayKeys = function(arr) {
        var res = [],
            i = 0, len = arr.length;
        while(i < len) {
            res.push(i++);
        }
        return res;
    },
    getObjectKeys = Object.keys || function(obj) {
        var res = [];
        for(var i in obj) {
            obj.hasOwnProperty(i) && res.push(i);
        }
        return res;
    },
    defineCustomErrorType = function(name) {
        var res = function(message) {
            this.name = name;
            this.message = message;
        };

        res.prototype = new Error();

        return res;
    },
    wrapOnFulfilled = function(onFulfilled, idx) {
        return function(val) {
            onFulfilled.call(this, val, idx);
        };
    };

/**
 * @class Deferred
 * @exports vow:Deferred
 * @description
 * The `Deferred` class is used to encapsulate newly-created promise object along with functions that resolve, reject or notify it.
 */

/**
 * @constructor
 * @description
 * You can use `vow.defer()` instead of using this constructor.
 *
 * `new vow.Deferred()` gives the same result as `vow.defer()`.
 */
var Deferred = function() {
    this._promise = new Promise();
};

Deferred.prototype = /** @lends Deferred.prototype */{
    /**
     * Returns the corresponding promise.
     *
     * @returns {vow:Promise}
     */
    promise : function() {
        return this._promise;
    },

    /**
     * Resolves the corresponding promise with the given `value`.
     *
     * @param {*} value
     *
     * @example
     * ```js
     * var defer = vow.defer(),
     *     promise = defer.promise();
     *
     * promise.then(function(value) {
     *     // value is "'success'" here
     * });
     *
     * defer.resolve('success');
     * ```
     */
    resolve : function(value) {
        this._promise.isResolved() || this._promise._resolve(value);
    },

    /**
     * Rejects the corresponding promise with the given `reason`.
     *
     * @param {*} reason
     *
     * @example
     * ```js
     * var defer = vow.defer(),
     *     promise = defer.promise();
     *
     * promise.fail(function(reason) {
     *     // reason is "'something is wrong'" here
     * });
     *
     * defer.reject('something is wrong');
     * ```
     */
    reject : function(reason) {
        if(this._promise.isResolved()) {
            return;
        }

        if(vow.isPromise(reason)) {
            reason = reason.then(function(val) {
                var defer = vow.defer();
                defer.reject(val);
                return defer.promise();
            });
            this._promise._resolve(reason);
        }
        else {
            this._promise._reject(reason);
        }
    },

    /**
     * Notifies the corresponding promise with the given `value`.
     *
     * @param {*} value
     *
     * @example
     * ```js
     * var defer = vow.defer(),
     *     promise = defer.promise();
     *
     * promise.progress(function(value) {
     *     // value is "'20%'", "'40%'" here
     * });
     *
     * defer.notify('20%');
     * defer.notify('40%');
     * ```
     */
    notify : function(value) {
        this._promise.isResolved() || this._promise._notify(value);
    }
};

var PROMISE_STATUS = {
    PENDING   : 0,
    RESOLVED  : 1,
    FULFILLED : 2,
    REJECTED  : 3
};

/**
 * @class Promise
 * @exports vow:Promise
 * @description
 * The `Promise` class is used when you want to give to the caller something to subscribe to,
 * but not the ability to resolve or reject the deferred.
 */

/**
 * @constructor
 * @param {Function} resolver See https://github.com/domenic/promises-unwrapping/blob/master/README.md#the-promise-constructor for details.
 * @description
 * You should use this constructor directly only if you are going to use `vow` as DOM Promises implementation.
 * In other case you should use `vow.defer()` and `defer.promise()` methods.
 * @example
 * ```js
 * function fetchJSON(url) {
 *     return new vow.Promise(function(resolve, reject, notify) {
 *         var xhr = new XMLHttpRequest();
 *         xhr.open('GET', url);
 *         xhr.responseType = 'json';
 *         xhr.send();
 *         xhr.onload = function() {
 *             if(xhr.response) {
 *                 resolve(xhr.response);
 *             }
 *             else {
 *                 reject(new TypeError());
 *             }
 *         };
 *     });
 * }
 * ```
 */
var Promise = function(resolver) {
    this._value = undef;
    this._status = PROMISE_STATUS.PENDING;

    this._fulfilledCallbacks = [];
    this._rejectedCallbacks = [];
    this._progressCallbacks = [];

    if(resolver) { // NOTE: see https://github.com/domenic/promises-unwrapping/blob/master/README.md
        var _this = this,
            resolverFnLen = resolver.length;

        resolver(
            function(val) {
                _this.isResolved() || _this._resolve(val);
            },
            resolverFnLen > 1?
                function(reason) {
                    _this.isResolved() || _this._reject(reason);
                } :
                undef,
            resolverFnLen > 2?
                function(val) {
                    _this.isResolved() || _this._notify(val);
                } :
                undef);
    }
};

Promise.prototype = /** @lends Promise.prototype */ {
    /**
     * Returns the value of the fulfilled promise or the reason in case of rejection.
     *
     * @returns {*}
     */
    valueOf : function() {
        return this._value;
    },

    /**
     * Returns `true` if the promise is resolved.
     *
     * @returns {Boolean}
     */
    isResolved : function() {
        return this._status !== PROMISE_STATUS.PENDING;
    },

    /**
     * Returns `true` if the promise is fulfilled.
     *
     * @returns {Boolean}
     */
    isFulfilled : function() {
        return this._status === PROMISE_STATUS.FULFILLED;
    },

    /**
     * Returns `true` if the promise is rejected.
     *
     * @returns {Boolean}
     */
    isRejected : function() {
        return this._status === PROMISE_STATUS.REJECTED;
    },

    /**
     * Adds reactions to the promise.
     *
     * @param {Function} [onFulfilled] Callback that will be invoked with a provided value after the promise has been fulfilled
     * @param {Function} [onRejected] Callback that will be invoked with a provided reason after the promise has been rejected
     * @param {Function} [onProgress] Callback that will be invoked with a provided value after the promise has been notified
     * @param {Object} [ctx] Context of the callbacks execution
     * @returns {vow:Promise} A new promise, see https://github.com/promises-aplus/promises-spec for details
     */
    then : function(onFulfilled, onRejected, onProgress, ctx) {
        var defer = new Deferred();
        this._addCallbacks(defer, onFulfilled, onRejected, onProgress, ctx);
        return defer.promise();
    },

    /**
     * Adds only a rejection reaction. This method is a shorthand for `promise.then(undefined, onRejected)`.
     *
     * @param {Function} onRejected Callback that will be called with a provided 'reason' as argument after the promise has been rejected
     * @param {Object} [ctx] Context of the callback execution
     * @returns {vow:Promise}
     */
    'catch' : function(onRejected, ctx) {
        return this.then(undef, onRejected, ctx);
    },

    /**
     * Adds only a rejection reaction. This method is a shorthand for `promise.then(null, onRejected)`. It's also an alias for `catch`.
     *
     * @param {Function} onRejected Callback to be called with the value after promise has been rejected
     * @param {Object} [ctx] Context of the callback execution
     * @returns {vow:Promise}
     */
    fail : function(onRejected, ctx) {
        return this.then(undef, onRejected, ctx);
    },

    /**
     * Adds a resolving reaction (for both fulfillment and rejection).
     *
     * @param {Function} onResolved Callback that will be invoked with the promise as an argument, after the promise has been resolved.
     * @param {Object} [ctx] Context of the callback execution
     * @returns {vow:Promise}
     */
    always : function(onResolved, ctx) {
        var _this = this,
            cb = function() {
                return onResolved.call(this, _this);
            };

        return this.then(cb, cb, ctx);
    },

    /**
     * Adds a progress reaction.
     *
     * @param {Function} onProgress Callback that will be called with a provided value when the promise has been notified
     * @param {Object} [ctx] Context of the callback execution
     * @returns {vow:Promise}
     */
    progress : function(onProgress, ctx) {
        return this.then(undef, undef, onProgress, ctx);
    },

    /**
     * Like `promise.then`, but "spreads" the array into a variadic value handler.
     * It is useful with the `vow.all` and the `vow.allResolved` methods.
     *
     * @param {Function} [onFulfilled] Callback that will be invoked with a provided value after the promise has been fulfilled
     * @param {Function} [onRejected] Callback that will be invoked with a provided reason after the promise has been rejected
     * @param {Object} [ctx] Context of the callbacks execution
     * @returns {vow:Promise}
     *
     * @example
     * ```js
     * var defer1 = vow.defer(),
     *     defer2 = vow.defer();
     *
     * vow.all([defer1.promise(), defer2.promise()]).spread(function(arg1, arg2) {
     *     // arg1 is "1", arg2 is "'two'" here
     * });
     *
     * defer1.resolve(1);
     * defer2.resolve('two');
     * ```
     */
    spread : function(onFulfilled, onRejected, ctx) {
        return this.then(
            function(val) {
                return onFulfilled.apply(this, val);
            },
            onRejected,
            ctx);
    },

    /**
     * Like `then`, but terminates a chain of promises.
     * If the promise has been rejected, this method throws it's "reason" as an exception in a future turn of the event loop.
     *
     * @param {Function} [onFulfilled] Callback that will be invoked with a provided value after the promise has been fulfilled
     * @param {Function} [onRejected] Callback that will be invoked with a provided reason after the promise has been rejected
     * @param {Function} [onProgress] Callback that will be invoked with a provided value after the promise has been notified
     * @param {Object} [ctx] Context of the callbacks execution
     *
     * @example
     * ```js
     * var defer = vow.defer();
     * defer.reject(Error('Internal error'));
     * defer.promise().done(); // exception to be thrown
     * ```
     */
    done : function(onFulfilled, onRejected, onProgress, ctx) {
        this
            .then(onFulfilled, onRejected, onProgress, ctx)
            .fail(throwException);
    },

    /**
     * Returns a new promise that will be fulfilled in `delay` milliseconds if the promise is fulfilled,
     * or immediately rejected if the promise is rejected.
     *
     * @param {Number} delay
     * @returns {vow:Promise}
     */
    delay : function(delay) {
        var timer,
            promise = this.then(function(val) {
                var defer = new Deferred();
                timer = setTimeout(
                    function() {
                        defer.resolve(val);
                    },
                    delay);

                return defer.promise();
            });

        promise.always(function() {
            clearTimeout(timer);
        });

        return promise;
    },

    /**
     * Returns a new promise that will be rejected in `timeout` milliseconds
     * if the promise is not resolved beforehand.
     *
     * @param {Number} timeout
     * @returns {vow:Promise}
     *
     * @example
     * ```js
     * var defer = vow.defer(),
     *     promiseWithTimeout1 = defer.promise().timeout(50),
     *     promiseWithTimeout2 = defer.promise().timeout(200);
     *
     * setTimeout(
     *     function() {
     *         defer.resolve('ok');
     *     },
     *     100);
     *
     * promiseWithTimeout1.fail(function(reason) {
     *     // promiseWithTimeout to be rejected in 50ms
     * });
     *
     * promiseWithTimeout2.then(function(value) {
     *     // promiseWithTimeout to be fulfilled with "'ok'" value
     * });
     * ```
     */
    timeout : function(timeout) {
        var defer = new Deferred(),
            timer = setTimeout(
                function() {
                    defer.reject(new vow.TimedOutError('timed out'));
                },
                timeout);

        this.then(
            function(val) {
                defer.resolve(val);
            },
            function(reason) {
                defer.reject(reason);
            });

        defer.promise().always(function() {
            clearTimeout(timer);
        });

        return defer.promise();
    },

    _vow : true,

    _resolve : function(val) {
        if(this._status > PROMISE_STATUS.RESOLVED) {
            return;
        }

        if(val === this) {
            this._reject(TypeError('Can\'t resolve promise with itself'));
            return;
        }

        this._status = PROMISE_STATUS.RESOLVED;

        if(val && !!val._vow) { // shortpath for vow.Promise
            val.isFulfilled()?
                this._fulfill(val.valueOf()) :
                val.isRejected()?
                    this._reject(val.valueOf()) :
                    val.then(
                        this._fulfill,
                        this._reject,
                        this._notify,
                        this);
            return;
        }

        if(isObject(val) || isFunction(val)) {
            var then;
            try {
                then = val.then;
            }
            catch(e) {
                this._reject(e);
                return;
            }

            if(isFunction(then)) {
                var _this = this,
                    isResolved = false;

                try {
                    then.call(
                        val,
                        function(val) {
                            if(isResolved) {
                                return;
                            }

                            isResolved = true;
                            _this._resolve(val);
                        },
                        function(err) {
                            if(isResolved) {
                                return;
                            }

                            isResolved = true;
                            _this._reject(err);
                        },
                        function(val) {
                            _this._notify(val);
                        });
                }
                catch(e) {
                    isResolved || this._reject(e);
                }

                return;
            }
        }

        this._fulfill(val);
    },

    _fulfill : function(val) {
        if(this._status > PROMISE_STATUS.RESOLVED) {
            return;
        }

        this._status = PROMISE_STATUS.FULFILLED;
        this._value = val;

        this._callCallbacks(this._fulfilledCallbacks, val);
        this._fulfilledCallbacks = this._rejectedCallbacks = this._progressCallbacks = undef;
    },

    _reject : function(reason) {
        if(this._status > PROMISE_STATUS.RESOLVED) {
            return;
        }

        this._status = PROMISE_STATUS.REJECTED;
        this._value = reason;

        this._callCallbacks(this._rejectedCallbacks, reason);
        this._fulfilledCallbacks = this._rejectedCallbacks = this._progressCallbacks = undef;
    },

    _notify : function(val) {
        this._callCallbacks(this._progressCallbacks, val);
    },

    _addCallbacks : function(defer, onFulfilled, onRejected, onProgress, ctx) {
        if(onRejected && !isFunction(onRejected)) {
            ctx = onRejected;
            onRejected = undef;
        }
        else if(onProgress && !isFunction(onProgress)) {
            ctx = onProgress;
            onProgress = undef;
        }

        var cb;

        if(!this.isRejected()) {
            cb = { defer : defer, fn : isFunction(onFulfilled)? onFulfilled : undef, ctx : ctx };
            this.isFulfilled()?
                this._callCallbacks([cb], this._value) :
                this._fulfilledCallbacks.push(cb);
        }

        if(!this.isFulfilled()) {
            cb = { defer : defer, fn : onRejected, ctx : ctx };
            this.isRejected()?
                this._callCallbacks([cb], this._value) :
                this._rejectedCallbacks.push(cb);
        }

        if(this._status <= PROMISE_STATUS.RESOLVED) {
            this._progressCallbacks.push({ defer : defer, fn : onProgress, ctx : ctx });
        }
    },

    _callCallbacks : function(callbacks, arg) {
        var len = callbacks.length;
        if(!len) {
            return;
        }

        var isResolved = this.isResolved(),
            isFulfilled = this.isFulfilled(),
            isRejected = this.isRejected();

        nextTick(function() {
            var i = 0, cb, defer, fn;
            while(i < len) {
                cb = callbacks[i++];
                defer = cb.defer;
                fn = cb.fn;

                if(fn) {
                    var ctx = cb.ctx,
                        res;
                    try {
                        res = ctx? fn.call(ctx, arg) : fn(arg);
                    }
                    catch(e) {
                        defer.reject(e);
                        continue;
                    }

                    isResolved?
                        defer.resolve(res) :
                        defer.notify(res);
                }
                else if(isFulfilled) {
                    defer.resolve(arg);
                }
                else if(isRejected) {
                    defer.reject(arg);
                }
                else {
                    defer.notify(arg);
                }
            }
        });
    }
};

/** @lends Promise */
var staticMethods = {
    /**
     * Coerces the given `value` to a promise, or returns the `value` if it's already a promise.
     *
     * @param {*} value
     * @returns {vow:Promise}
     */
    cast : function(value) {
        return vow.cast(value);
    },

    /**
     * Returns a promise, that will be fulfilled only after all the items in `iterable` are fulfilled.
     * If any of the `iterable` items gets rejected, then the returned promise will be rejected.
     *
     * @param {Array|Object} iterable
     * @returns {vow:Promise}
     */
    all : function(iterable) {
        return vow.all(iterable);
    },

    /**
     * Returns a promise, that will be fulfilled only when any of the items in `iterable` are fulfilled.
     * If any of the `iterable` items gets rejected, then the returned promise will be rejected.
     *
     * @param {Array} iterable
     * @returns {vow:Promise}
     */
    race : function(iterable) {
        return vow.anyResolved(iterable);
    },

    /**
     * Returns a promise that has already been resolved with the given `value`.
     * If `value` is a promise, the returned promise will have `value`'s state.
     *
     * @param {*} value
     * @returns {vow:Promise}
     */
    resolve : function(value) {
        return vow.resolve(value);
    },

    /**
     * Returns a promise that has already been rejected with the given `reason`.
     *
     * @param {*} reason
     * @returns {vow:Promise}
     */
    reject : function(reason) {
        return vow.reject(reason);
    }
};

for(var prop in staticMethods) {
    staticMethods.hasOwnProperty(prop) &&
        (Promise[prop] = staticMethods[prop]);
}

var vow = /** @exports vow */ {
    Deferred : Deferred,

    Promise : Promise,

    /**
     * Creates a new deferred. This method is a factory method for `vow:Deferred` class.
     * It's equivalent to `new vow.Deferred()`.
     *
     * @returns {vow:Deferred}
     */
    defer : function() {
        return new Deferred();
    },

    /**
     * Static equivalent to `promise.then`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @param {Function} [onFulfilled] Callback that will be invoked with a provided value after the promise has been fulfilled
     * @param {Function} [onRejected] Callback that will be invoked with a provided reason after the promise has been rejected
     * @param {Function} [onProgress] Callback that will be invoked with a provided value after the promise has been notified
     * @param {Object} [ctx] Context of the callbacks execution
     * @returns {vow:Promise}
     */
    when : function(value, onFulfilled, onRejected, onProgress, ctx) {
        return vow.cast(value).then(onFulfilled, onRejected, onProgress, ctx);
    },

    /**
     * Static equivalent to `promise.fail`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @param {Function} onRejected Callback that will be invoked with a provided reason after the promise has been rejected
     * @param {Object} [ctx] Context of the callback execution
     * @returns {vow:Promise}
     */
    fail : function(value, onRejected, ctx) {
        return vow.when(value, undef, onRejected, ctx);
    },

    /**
     * Static equivalent to `promise.always`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @param {Function} onResolved Callback that will be invoked with the promise as an argument, after the promise has been resolved.
     * @param {Object} [ctx] Context of the callback execution
     * @returns {vow:Promise}
     */
    always : function(value, onResolved, ctx) {
        return vow.when(value).always(onResolved, ctx);
    },

    /**
     * Static equivalent to `promise.progress`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @param {Function} onProgress Callback that will be invoked with a provided value after the promise has been notified
     * @param {Object} [ctx] Context of the callback execution
     * @returns {vow:Promise}
     */
    progress : function(value, onProgress, ctx) {
        return vow.when(value).progress(onProgress, ctx);
    },

    /**
     * Static equivalent to `promise.spread`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @param {Function} [onFulfilled] Callback that will be invoked with a provided value after the promise has been fulfilled
     * @param {Function} [onRejected] Callback that will be invoked with a provided reason after the promise has been rejected
     * @param {Object} [ctx] Context of the callbacks execution
     * @returns {vow:Promise}
     */
    spread : function(value, onFulfilled, onRejected, ctx) {
        return vow.when(value).spread(onFulfilled, onRejected, ctx);
    },

    /**
     * Static equivalent to `promise.done`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @param {Function} [onFulfilled] Callback that will be invoked with a provided value after the promise has been fulfilled
     * @param {Function} [onRejected] Callback that will be invoked with a provided reason after the promise has been rejected
     * @param {Function} [onProgress] Callback that will be invoked with a provided value after the promise has been notified
     * @param {Object} [ctx] Context of the callbacks execution
     */
    done : function(value, onFulfilled, onRejected, onProgress, ctx) {
        vow.when(value).done(onFulfilled, onRejected, onProgress, ctx);
    },

    /**
     * Checks whether the given `value` is a promise-like object
     *
     * @param {*} value
     * @returns {Boolean}
     *
     * @example
     * ```js
     * vow.isPromise('something'); // returns false
     * vow.isPromise(vow.defer().promise()); // returns true
     * vow.isPromise({ then : function() { }); // returns true
     * ```
     */
    isPromise : function(value) {
        return isObject(value) && isFunction(value.then);
    },

    /**
     * Coerces the given `value` to a promise, or returns the `value` if it's already a promise.
     *
     * @param {*} value
     * @returns {vow:Promise}
     */
    cast : function(value) {
        return value && !!value._vow?
            value :
            vow.resolve(value);
    },

    /**
     * Static equivalent to `promise.valueOf`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @returns {*}
     */
    valueOf : function(value) {
        return value && isFunction(value.valueOf)? value.valueOf() : value;
    },

    /**
     * Static equivalent to `promise.isFulfilled`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @returns {Boolean}
     */
    isFulfilled : function(value) {
        return value && isFunction(value.isFulfilled)? value.isFulfilled() : true;
    },

    /**
     * Static equivalent to `promise.isRejected`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @returns {Boolean}
     */
    isRejected : function(value) {
        return value && isFunction(value.isRejected)? value.isRejected() : false;
    },

    /**
     * Static equivalent to `promise.isResolved`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @returns {Boolean}
     */
    isResolved : function(value) {
        return value && isFunction(value.isResolved)? value.isResolved() : true;
    },

    /**
     * Returns a promise that has already been resolved with the given `value`.
     * If `value` is a promise, the returned promise will have `value`'s state.
     *
     * @param {*} value
     * @returns {vow:Promise}
     */
    resolve : function(value) {
        var res = vow.defer();
        res.resolve(value);
        return res.promise();
    },

    /**
     * Returns a promise that has already been fulfilled with the given `value`.
     * If `value` is a promise, the returned promise will be fulfilled with the fulfill/rejection value of `value`.
     *
     * @param {*} value
     * @returns {vow:Promise}
     */
    fulfill : function(value) {
        var defer = vow.defer(),
            promise = defer.promise();

        defer.resolve(value);

        return promise.isFulfilled()?
            promise :
            promise.then(null, function(reason) {
                return reason;
            });
    },

    /**
     * Returns a promise that has already been rejected with the given `reason`.
     * If `reason` is a promise, the returned promise will be rejected with the fulfill/rejection value of `reason`.
     *
     * @param {*} reason
     * @returns {vow:Promise}
     */
    reject : function(reason) {
        var defer = vow.defer();
        defer.reject(reason);
        return defer.promise();
    },

    /**
     * Invokes the given function `fn` with arguments `args`
     *
     * @param {Function} fn
     * @param {...*} [args]
     * @returns {vow:Promise}
     *
     * @example
     * ```js
     * var promise1 = vow.invoke(function(value) {
     *         return value;
     *     }, 'ok'),
     *     promise2 = vow.invoke(function() {
     *         throw Error();
     *     });
     *
     * promise1.isFulfilled(); // true
     * promise1.valueOf(); // 'ok'
     * promise2.isRejected(); // true
     * promise2.valueOf(); // instance of Error
     * ```
     */
    invoke : function(fn, args) {
        var len = Math.max(arguments.length - 1, 0),
            callArgs;
        if(len) { // optimization for V8
            callArgs = Array(len);
            var i = 0;
            while(i < len) {
                callArgs[i++] = arguments[i];
            }
        }

        try {
            return vow.resolve(callArgs?
                fn.apply(global, callArgs) :
                fn.call(global));
        }
        catch(e) {
            return vow.reject(e);
        }
    },

    /**
     * Returns a promise, that will be fulfilled only after all the items in `iterable` are fulfilled.
     * If any of the `iterable` items gets rejected, the promise will be rejected.
     *
     * @param {Array|Object} iterable
     * @returns {vow:Promise}
     *
     * @example
     * with array:
     * ```js
     * var defer1 = vow.defer(),
     *     defer2 = vow.defer();
     *
     * vow.all([defer1.promise(), defer2.promise(), 3])
     *     .then(function(value) {
     *          // value is "[1, 2, 3]" here
     *     });
     *
     * defer1.resolve(1);
     * defer2.resolve(2);
     * ```
     *
     * @example
     * with object:
     * ```js
     * var defer1 = vow.defer(),
     *     defer2 = vow.defer();
     *
     * vow.all({ p1 : defer1.promise(), p2 : defer2.promise(), p3 : 3 })
     *     .then(function(value) {
     *          // value is "{ p1 : 1, p2 : 2, p3 : 3 }" here
     *     });
     *
     * defer1.resolve(1);
     * defer2.resolve(2);
     * ```
     */
    all : function(iterable) {
        var defer = new Deferred(),
            isPromisesArray = isArray(iterable),
            keys = isPromisesArray?
                getArrayKeys(iterable) :
                getObjectKeys(iterable),
            len = keys.length,
            res = isPromisesArray? [] : {};

        if(!len) {
            defer.resolve(res);
            return defer.promise();
        }

        var i = len;
        vow._forEach(
            iterable,
            function(value, idx) {
                res[keys[idx]] = value;
                if(!--i) {
                    defer.resolve(res);
                }
            },
            defer.reject,
            defer.notify,
            defer,
            keys);

        return defer.promise();
    },

    /**
     * Returns a promise, that will be fulfilled only after all the items in `iterable` are resolved.
     *
     * @param {Array|Object} iterable
     * @returns {vow:Promise}
     *
     * @example
     * ```js
     * var defer1 = vow.defer(),
     *     defer2 = vow.defer();
     *
     * vow.allResolved([defer1.promise(), defer2.promise()]).spread(function(promise1, promise2) {
     *     promise1.isRejected(); // returns true
     *     promise1.valueOf(); // returns "'error'"
     *     promise2.isFulfilled(); // returns true
     *     promise2.valueOf(); // returns "'ok'"
     * });
     *
     * defer1.reject('error');
     * defer2.resolve('ok');
     * ```
     */
    allResolved : function(iterable) {
        var defer = new Deferred(),
            isPromisesArray = isArray(iterable),
            keys = isPromisesArray?
                getArrayKeys(iterable) :
                getObjectKeys(iterable),
            i = keys.length,
            res = isPromisesArray? [] : {};

        if(!i) {
            defer.resolve(res);
            return defer.promise();
        }

        var onResolved = function() {
                --i || defer.resolve(iterable);
            };

        vow._forEach(
            iterable,
            onResolved,
            onResolved,
            defer.notify,
            defer,
            keys);

        return defer.promise();
    },

    allPatiently : function(iterable) {
        return vow.allResolved(iterable).then(function() {
            var isPromisesArray = isArray(iterable),
                keys = isPromisesArray?
                    getArrayKeys(iterable) :
                    getObjectKeys(iterable),
                rejectedPromises, fulfilledPromises,
                len = keys.length, i = 0, key, promise;

            if(!len) {
                return isPromisesArray? [] : {};
            }

            while(i < len) {
                key = keys[i++];
                promise = iterable[key];
                if(vow.isRejected(promise)) {
                    rejectedPromises || (rejectedPromises = isPromisesArray? [] : {});
                    isPromisesArray?
                        rejectedPromises.push(promise.valueOf()) :
                        rejectedPromises[key] = promise.valueOf();
                }
                else if(!rejectedPromises) {
                    (fulfilledPromises || (fulfilledPromises = isPromisesArray? [] : {}))[key] = vow.valueOf(promise);
                }
            }

            if(rejectedPromises) {
                throw rejectedPromises;
            }

            return fulfilledPromises;
        });
    },

    /**
     * Returns a promise, that will be fulfilled if any of the items in `iterable` is fulfilled.
     * If all of the `iterable` items get rejected, the promise will be rejected (with the reason of the first rejected item).
     *
     * @param {Array} iterable
     * @returns {vow:Promise}
     */
    any : function(iterable) {
        var defer = new Deferred(),
            len = iterable.length;

        if(!len) {
            defer.reject(Error());
            return defer.promise();
        }

        var i = 0, reason;
        vow._forEach(
            iterable,
            defer.resolve,
            function(e) {
                i || (reason = e);
                ++i === len && defer.reject(reason);
            },
            defer.notify,
            defer);

        return defer.promise();
    },

    /**
     * Returns a promise, that will be fulfilled only when any of the items in `iterable` is fulfilled.
     * If any of the `iterable` items gets rejected, the promise will be rejected.
     *
     * @param {Array} iterable
     * @returns {vow:Promise}
     */
    anyResolved : function(iterable) {
        var defer = new Deferred(),
            len = iterable.length;

        if(!len) {
            defer.reject(Error());
            return defer.promise();
        }

        vow._forEach(
            iterable,
            defer.resolve,
            defer.reject,
            defer.notify,
            defer);

        return defer.promise();
    },

    /**
     * Static equivalent to `promise.delay`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @param {Number} delay
     * @returns {vow:Promise}
     */
    delay : function(value, delay) {
        return vow.resolve(value).delay(delay);
    },

    /**
     * Static equivalent to `promise.timeout`.
     * If `value` is not a promise, then `value` is treated as a fulfilled promise.
     *
     * @param {*} value
     * @param {Number} timeout
     * @returns {vow:Promise}
     */
    timeout : function(value, timeout) {
        return vow.resolve(value).timeout(timeout);
    },

    _forEach : function(promises, onFulfilled, onRejected, onProgress, ctx, keys) {
        var len = keys? keys.length : promises.length,
            i = 0;

        while(i < len) {
            vow.when(
                promises[keys? keys[i] : i],
                wrapOnFulfilled(onFulfilled, i),
                onRejected,
                onProgress,
                ctx);
            ++i;
        }
    },

    TimedOutError : defineCustomErrorType('TimedOut')
};

var defineAsGlobal = true;
if(typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = vow;
    defineAsGlobal = false;
}

if(typeof modules === 'object' && isFunction(modules.define)) {
    modules.define('vow', function(provide) {
        provide(vow);
    });
    defineAsGlobal = false;
}

if(typeof define === 'function') {
    define(function(require, exports, module) {
        module.exports = vow;
    });
    defineAsGlobal = false;
}

defineAsGlobal && (global.vow = vow);

})(typeof window !== 'undefined'? window : global);

/* end: ../../common.blocks/vow/vow.vanilla.js */
/* begin: ../../desktop.blocks/jquery/__event/_type/jquery__event_type_winresize.js */
/**
 * @module jquery
 */

modules.define('jquery', ['ua'], function(provide, ua, $) {

// IE8 and below, https://msdn.microsoft.com/en-us/library/ie/ms536959%28v=vs.85%29.aspx
if(ua.msie && document.documentMode < 9) {
    var win = window,
        $win = $(window),
        winWidth = $win.width(),
        winHeight = $win.height();

    ($.event.special.resize || ($.event.special.resize = {})).preDispatch = function(e) {
        if(e.target === win) {
            var curWinWidth = $win.width(),
                curWinHeight = $win.height();

            if(curWinWidth === winWidth && curWinHeight === winHeight) {
                return false;
            } else {
                winWidth = curWinWidth;
                winHeight = curWinHeight;
            }
        }
    };
}

provide($);

});

/* end: ../../desktop.blocks/jquery/__event/_type/jquery__event_type_winresize.js */
/* begin: ../../common.blocks/loader/_type/loader_type_js.js */
/**
 * @module loader_type_js
 * @description Load JS from external URL.
 */

modules.define('loader_type_js', function(provide) {

var loading = {},
    loaded = {},
    head = document.getElementsByTagName('head')[0],
    runCallbacks = function(path, type) {
        var cbs = loading[path], cb, i = 0;
        delete loading[path];
        while(cb = cbs[i++]) {
            cb[type] && cb[type]();
        }
    },
    onSuccess = function(path) {
        loaded[path] = true;
        runCallbacks(path, 'success');
    },
    onError = function(path) {
        runCallbacks(path, 'error');
    };

provide(
    /**
     * @exports
     * @param {String} path resource link
     * @param {Function} [success] to be called if the script succeeds
     * @param {Function} [error] to be called if the script fails
     */
    function(path, success, error) {
        if(loaded[path]) {
            success && success();
            return;
        }

        if(loading[path]) {
            loading[path].push({ success : success, error : error });
            return;
        }

        loading[path] = [{ success : success, error : error }];

        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.charset = 'utf-8';
        script.src = (location.protocol === 'file:' && !path.indexOf('//')? 'http:' : '') + path;

        if('onload' in script) {
            script.onload = function() {
                script.onload = script.onerror = null;
                onSuccess(path);
            };

            script.onerror = function() {
                script.onload = script.onerror = null;
                onError(path);
            };
        } else {
            script.onreadystatechange = function() {
                var readyState = this.readyState;
                if(readyState === 'loaded' || readyState === 'complete') {
                    script.onreadystatechange = null;
                    onSuccess(path);
                }
            };
        }

        head.insertBefore(script, head.lastChild);
    }
);

});

/* end: ../../common.blocks/loader/_type/loader_type_js.js */
/* begin: ../../common.blocks/events/__observable/_type/events__observable_type_bem-dom.js */
/**
 * @module events__observable
 */

modules.define(
    'events__observable',
    ['i-bem-dom'],
    function(provide, bemDom, observable) {

provide(
    /**
     * Creates new observable
     * @exports
     * @param {i-bem-dom:Block|i-bem-dom:Elem|events:Emitter} bemEntity
     * @returns {Observable}
     */
    function(bemEntity) {
        return observable(bemDom.isEntity(bemEntity)?
            bemEntity._events() :
            bemEntity);
    }
);

});

/* end: ../../common.blocks/events/__observable/_type/events__observable_type_bem-dom.js */
/* begin: ../../common.blocks/i-bem-dom/__events/_type/i-bem-dom__events_type_dom.js */
/**
 * @module i-bem-dom__events_type_dom
 */
modules.define(
    'i-bem-dom__events_type_dom',
    [
        'i-bem-dom__events',
        'inherit',
        'jquery'
    ],
    function(
        provide,
        bemDomEvents,
        inherit,
        $) {

var eventBuilder = function(e) {
        return e;
    },
    /**
     * @class EventManagerFactory
     * @augments i-bem-dom__events:EventManagerFactory
     * @exports i-bem-dom__events_type_dom:EventManagerFactory
     */
    EventManagerFactory = inherit(bemDomEvents.EventManagerFactory,/** @lends EventManagerFactory.prototype */{
        /** @override */
        _createEventManager : function(ctx, params, isInstance) {
            function wrapperFn(fn) {
                return function(e) {
                    var instance;

                    if(isInstance) {
                        instance = ctx;
                    } else {
                        // TODO: we could optimize all these "closest" to a single traversing
                        var entityDomNode = $(e.target).closest(params.ctxSelector);
                        entityDomNode.length && (instance = entityDomNode.bem(ctx));
                    }

                    if(instance) {
                        params.bindEntityCls && (e.bemTarget = $(this).bem(params.bindEntityCls));
                        fn.call(instance, e);
                    }
                };
            }

            return new this._eventManagerCls(params, wrapperFn, eventBuilder);
        }
    });

provide({ EventManagerFactory : EventManagerFactory });

});

/* end: ../../common.blocks/i-bem-dom/__events/_type/i-bem-dom__events_type_dom.js */
/* begin: ../../common.blocks/jquery/__event/_type/jquery__event_type_pointerpressrelease.js */
modules.define('jquery', function(provide, $) {

$.each({
    pointerpress : 'pointerdown',
    pointerrelease : 'pointerup pointercancel'
}, function(fix, origEvent) {
    function eventHandler(e) {
        if(e.which === 1) {
            var fixedEvent = cloneEvent(e);
            fixedEvent.type = fix;
            fixedEvent.originalEvent = e;
            return $.event.dispatch.call(this, fixedEvent);
        }
    }

    $.event.special[fix] = {
        setup : function() {
            $(this).on(origEvent, eventHandler);
            return false;
        },
        teardown : function() {
            $(this).off(origEvent, eventHandler);
            return false;
        }
    };
});

function cloneEvent(event) {
    var eventCopy = $.extend(new $.Event(), event);
    if(event.preventDefault) {
        eventCopy.preventDefault = function() {
            event.preventDefault();
        };
    }
    return eventCopy;
}

provide($);

});

/* end: ../../common.blocks/jquery/__event/_type/jquery__event_type_pointerpressrelease.js */


(function (global) {
    var __i18n__ = ((function () {
            var data;

            /**
             * @exports
             * @param {String} keyset
             * @param {String} key
             * @param {Object} [params]
             * @returns {String}
             */
            function i18n(keyset, key, params) {
                if(!data) throw Error('i18n need to be filled with data');
                var val = data[keyset] && data[keyset][key];
                return typeof val === 'undefined'?
                keyset + ':' + key :
                    typeof val === 'string'?
                        val :
                        val.call(i18n, params, i18n);
            }

            i18n.decl = function(i18nData) {
                if(!data) {
                    data = i18nData;
                    return this;
                }

                for(var ks in i18nData) {
                    var dataKs = data[ks] || (data[ks] = {}),
                        i18nDataKs = i18nData[ks];

                    for(var k in i18nDataKs)
                        dataKs[k] = i18nDataKs[k];
                }

                return this;
            };

            return i18n;
        })()).decl({}),
        defineAsGlobal = true;


    // YModules
    if (typeof modules === "object") {
        modules.define("i18n", function (provide) {
            provide(__i18n__);
        });

    }

    if (defineAsGlobal) {

        (global.BEM || (global.BEM = {})).I18N = __i18n__;
    }
})(typeof window !== "undefined" ? window : global);
(function (global) {
var BH = (function() {

var lastGenId = 0;

/**
 * BH: BEMJSON -> HTML процессор.
 * @constructor
 */
function BH() {
    /**
     * Используется для идентификации шаблонов.
     * Каждому шаблону дается уникальный id для того, чтобы избежать повторного применения
     * шаблона к одному и тому же узлу BEMJSON-дерева.
     * @type {Number}
     * @private
     */
    this._lastMatchId = 0;
    /**
     * Плоский массив для хранения матчеров.
     * Каждый элемент — массив с двумя элементами: [{String} выражение, {Function} шаблон}]
     * @type {Array}
     * @private
     */
    this._matchers = [];
    /**
     * Флаг, включающий автоматическую систему поиска зацикливаний. Следует использовать в development-режиме,
     * чтобы определять причины зацикливания.
     * @type {Boolean}
     * @private
     */
    this._infiniteLoopDetection = false;

    /**
     * Неймспейс для библиотек. Сюда можно писать различный функционал для дальнейшего использования в шаблонах.
     * ```javascript
     * bh.lib.i18n = BEM.I18N;
     * bh.lib.objects = bh.lib.objects || {};
     * bh.lib.objects.inverse = bh.lib.objects.inverse || function(obj) { ... };
     * ```
     * @type {Object}
     */
    this.lib = {};
    /**
     * Оптимизация коротких тегов. Они могут быть расширены через setOptions({ shortTags: [...] })
     */
    this._shortTags = {};
    for (var i = 0; i < SHORT_TAGS.length; i++) {
        this._shortTags[SHORT_TAGS[i]] = 1;
    }
    /**
     * Опции BH. Задаются через setOptions.
     * @type {Object}
     */
    this._options = {};
    this._optJsAttrName = 'onclick';
    this._optJsAttrIsJs = true;
    this._optJsCls = 'i-bem';
    this._optJsElem = true;
    this._optEscapeContent = false;
    this._optNobaseMods = false;
    this._optDelimElem = '__';
    this._optDelimMod = '_';
    this._optShortTagCloser = '/>';
    this.utils = {
        _expandoId: new Date().getTime(),
        bh: this,
        /**
         * Проверяет, что объект является примитивом.
         * ```javascript
         * bh.match('link', function(ctx) {
         *     ctx.tag(ctx.isSimple(ctx.content()) ? 'span' : 'div');
         * });
         * ```
         * @param {*} obj
         * @returns {Boolean}
         */
        isSimple: function(obj) {
            if (!obj || obj === true) return true;
            var t = typeof obj;
            return t === 'string' || t === 'number';
        },
        /**
         * Расширяет один объект свойствами другого (других).
         * Аналог jQuery.extend.
         * ```javascript
         * obj = ctx.extend(obj, {a: 1});
         * ```
         * @param {Object} target
         * @returns {Object}
         */
        extend: function(target) {
            if (!target || typeof target !== 'object') {
                target = {};
            }
            for (var i = 1, len = arguments.length; i < len; i++) {
                var obj = arguments[i],
                    key;
                /* istanbul ignore else */
                if (obj) {
                    for (key in obj) {
                        target[key] = obj[key];
                    }
                }
            }
            return target;
        },
        /**
         * Возвращает позицию элемента в рамках родителя.
         * Отсчет производится с 1 (единицы).
         * ```javascript
         * bh.match('list__item', function(ctx) {
         *     ctx.mod('pos', ctx.position());
         * });
         * ```
         * @returns {Number}
         */
        position: function() {
            var node = this.node;
            return node.index === 'content' ? 1 : node.position;
        },
        /**
         * Возвращает true, если текущий BEMJSON-элемент первый в рамках родительского BEMJSON-элемента.
         * ```javascript
         * bh.match('list__item', function(ctx) {
         *     if (ctx.isFirst()) {
         *         ctx.mod('first', 'yes');
         *     }
         * });
         * ```
         * @returns {Boolean}
         */
        isFirst: function() {
            var node = this.node;
            return node.index === 'content' || node.position === 1;
        },
        /**
         * Возвращает true, если текущий BEMJSON-элемент последний в рамках родительского BEMJSON-элемента.
         * ```javascript
         * bh.match('list__item', function(ctx) {
         *     if (ctx.isLast()) {
         *         ctx.mod('last', 'yes');
         *     }
         * });
         * ```
         * @returns {Boolean}
         */
        isLast: function() {
            var node = this.node;
            return node.index === 'content' || node.position === node.arr._listLength;
        },
        /**
         * Передает параметр вглубь BEMJSON-дерева.
         * **force** — задать значение параметра даже если оно было задано ранее.
         * ```javascript
         * bh.match('input', function(ctx) {
         *     ctx.content({ elem: 'control' });
         *     ctx.tParam('value', ctx.param('value'));
         * });
         * bh.match('input__control', function(ctx) {
         *     ctx.attr('value', ctx.tParam('value'));
         * });
         * ```
         * @param {String} key
         * @param {*} value
         * @param {Boolean} [force]
         * @returns {*|Ctx}
         */
        tParam: function(key, value, force) {
            var keyName = '__tp_' + key;
            var node = this.node;
            if (arguments.length > 1) {
                if (force || !this.tParam(key))
                    node[keyName] = value;
                return this;
            } else {
                while (node) {
                    if (node.hasOwnProperty(keyName)) {
                        return node[keyName];
                    }
                    node = node.parentNode;
                }
                return undefined;
            }
        },
        /**
         * Применяет матчинг для переданного фрагмента BEMJSON.
         * Возвращает результат преобразований.
         * @param {BemJson} bemJson
         * @returns {Object|Array}
         */
        process: function(bemJson) {
            var prevCtx = this.ctx,
                prevNode = this.node;
            var res = this.bh.processBemJson(bemJson, prevCtx.block);
            this.ctx = prevCtx;
            this.node = prevNode;
            return res;
        },
        /**
         * Выполняет преобразования данного BEMJSON-элемента остальными шаблонами.
         * Может понадобиться, например, чтобы добавить элемент в самый конец содержимого, если в базовых шаблонах в конец содержимого добавляются другие элементы.
         * Пример:
         * ```javascript
         * bh.match('header', function(ctx) {
         *    ctx.content([
         *        ctx.content(),
         *        { elem: 'under' }
         *    ], true);
         * });
         * bh.match('header_float_yes', function(ctx) {
         *    ctx.applyBase();
         *    ctx.content([
         *        ctx.content(),
         *        { elem: 'clear' }
         *    ], true);
         * });
         * ```
         * @returns {Ctx}
         */
        applyBase: function() {
            var node = this.node;
            var json = node.json;
            var block = json.block;
            var blockMods = json.mods;

            var subRes = this.bh._fastMatcher(this, json);
            if (subRes !== undefined) {
                this.ctx = node.arr[node.index] = node.json = subRes;
                node.block = block;
                node.mods = blockMods;
            }
            return this;
        },
        /**
         * Останавливает выполнение прочих шаблонов для данного BEMJSON-элемента.
         * Пример:
         * ```javascript
         * bh.match('button', function(ctx) {
         *     ctx.tag('button', true);
         * });
         * bh.match('button', function(ctx) {
         *     ctx.tag('span');
         *     ctx.stop();
         * });
         * ```
         * @returns {Ctx}
         */
        stop: function() {
            this.ctx._stop = true;
            return this;
        },
        /**
         * Возвращает уникальный идентификатор. Может использоваться, например,
         * чтобы задать соответствие между `label` и `input`.
         * @returns {String}
         */
        generateId: function() {
            return 'uniq' + this._expandoId + (++lastGenId);
        },
        /**
         * Возвращает/устанавливает модификатор в зависимости от аргументов.
         * **force** — задать модификатор даже если он был задан ранее.
         * ```javascript
         * bh.match('input', function(ctx) {
         *     ctx.mod('native', 'yes');
         *     ctx.mod('disabled', true);
         * });
         * bh.match('input_islands_yes', function(ctx) {
         *     ctx.mod('native', '', true);
         *     ctx.mod('disabled', false, true);
         * });
         * ```
         * @param {String} key
         * @param {String|Boolean} [value]
         * @param {Boolean} [force]
         * @returns {String|undefined|Ctx}
         */
        mod: function(key, value, force) {
            var field = this.ctx.elem ? 'elemMods' : 'mods';
            if (arguments.length > 1) {
                var mods = this.ctx[field];
                mods[key] = !mods.hasOwnProperty(key) || force ? value : mods[key];
                return this;
            } else {
                return this.ctx[field][key];
            }
        },
        /**
         * Возвращает/устанавливает модификаторы в зависимости от аргументов.
         * **force** — задать модификаторы даже если они были заданы ранее.
         * ```javascript
         * bh.match('paranja', function(ctx) {
         *     ctx.mods({
         *         theme: 'normal',
         *         disabled: true
         *     });
         * });
         * ```
         * @param {Object} [values]
         * @param {Boolean} [force]
         * @returns {Object|Ctx}
         */
        mods: function(values, force) {
            var field = this.ctx.elem ? 'elemMods' : 'mods';
            var mods = this.ctx[field];
            if (values !== undefined) {
                this.ctx[field] = force ? this.extend(mods, values) : this.extend(values, mods);
                return this;
            } else {
                return mods;
            }
        },
        /**
         * Возвращает/устанавливает тег в зависимости от аргументов.
         * **force** — задать значение тега даже если оно было задано ранее.
         * ```javascript
         * bh.match('input', function(ctx) {
         *     ctx.tag('input');
         * });
         * ```
         * @param {String} [value]
         * @param {Boolean} [force]
         * @returns {String|undefined|Ctx}
         */
        tag: function(value, force) {
            if (value === undefined) {
                return this.ctx.tag;
            }
            if (force || this.ctx.tag === undefined) {
                this.ctx.tag = value;
            }
            return this;
        },
        /**
         * Возвращает/устанавливает значение mix в зависимости от аргументов.
         * При установке значения, если force равен true, то переданный микс заменяет прежнее значение,
         * в противном случае миксы складываются.
         * ```javascript
         * bh.match('button_pseudo_yes', function(ctx) {
         *     ctx.mix({ block: 'link', mods: { pseudo: 'yes' } });
         *     ctx.mix([
         *         { elem: 'text' },
         *         { block: 'ajax' }
         *     ]);
         * });
         * ```
         * @param {Array|BemJson} [mix]
         * @param {Boolean} [force]
         * @returns {Array|undefined|Ctx}
         */
        mix: function(mix, force) {
            if (mix === undefined) {
                return this.ctx.mix;
            }
            this.ctx.mix = (force || !this.ctx.mix) ?
                mix :
                (Array.isArray(this.ctx.mix) ? this.ctx.mix : [this.ctx.mix])
                    .concat(mix);
            return this;
        },
        /**
         * Возвращает/устанавливает значение атрибута в зависимости от аргументов.
         * **force** — задать значение атрибута даже если оно было задано ранее.
         * @param {String} key
         * @param {String} [value]
         * @param {Boolean} [force]
         * @returns {String|undefined|Ctx}
         */
        attr: function(key, value, force) {
            var attrs;
            if (arguments.length > 1) {
                attrs = this.ctx.attrs || (this.ctx.attrs = {});
                attrs[key] = !attrs.hasOwnProperty(key) || force ? value : attrs[key];
                return this;
            } else {
                attrs = this.ctx.attrs;
                return attrs ? attrs[key] : undefined;
            }
        },
        /**
         * Возвращает/устанавливает атрибуты в зависимости от аргументов.
         * **force** — задать атрибуты даже если они были заданы ранее.
         * ```javascript
         * bh.match('input', function(ctx) {
         *     ctx.attrs({
         *         name: ctx.param('name'),
         *         autocomplete: 'off'
         *     });
         * });
         * ```
         * @param {Object} [values]
         * @param {Boolean} [force]
         * @returns {Object|Ctx}
         */
        attrs: function(values, force) {
            var attrs = this.ctx.attrs || {};
            if (values === undefined) {
                return attrs;
            }
            this.ctx.attrs = force ? this.extend(attrs, values) : this.extend(values, attrs);
            return this;
        },
        /**
         * Возвращает/устанавливает значение bem в зависимости от аргументов.
         * **force** — задать значение bem даже если оно было задано ранее.
         * Если `bem` имеет значение `false`, то для элемента не будут генерироваться BEM-классы.
         * ```javascript
         * bh.match('meta', function(ctx) {
         *     ctx.bem(false);
         * });
         * ```
         * @param {Boolean} [value]
         * @param {Boolean} [force]
         * @returns {Boolean|undefined|Ctx}
         */
        bem: function(value, force) {
            if (value === undefined) {
                return this.ctx.bem;
            }
            if (force || this.ctx.bem === undefined) {
                this.ctx.bem = value;
            }
            return this;
        },
        /**
         * Возвращает/устанавливает значение `js` в зависимости от аргументов.
         * **force** — задать значение `js` даже если оно было задано ранее.
         * Значение `js` используется для инициализации блоков в браузере через `BEM.DOM.init()`.
         * ```javascript
         * bh.match('input', function(ctx) {
         *     ctx.js(true);
         * });
         * ```
         * @param {Boolean|Object} [js]
         * @param {Boolean} [force]
         * @returns {Boolean|Object|Ctx}
         */
        js: function(js, force) {
            var ctx = this.ctx;
            if (js === undefined) return ctx.js;
            if (force || ctx.js === undefined) ctx.js = js;
            else if (ctx.js !== false) ctx.js = this.extend(ctx.js, js);
            return this;
        },
        /**
         * Возвращает/устанавливает значение CSS-класса в зависимости от аргументов.
         * **force** — задать значение CSS-класса даже если оно было задано ранее.
         * ```javascript
         * bh.match('page', function(ctx) {
         *     ctx.cls('ua_js_no ua_css_standard');
         * });
         * ```
         * @param {String} [value]
         * @param {Boolean} [force]
         * @returns {String|Ctx}
         */
        cls: function(value, force) {
            if (value === undefined) {
                return this.ctx.cls;
            }
            if (force || this.ctx.cls === undefined) {
                this.ctx.cls = value;
            }
            return this;
        },
        /**
         * Возвращает/устанавливает параметр текущего BEMJSON-элемента.
         * **force** — задать значение параметра, даже если оно было задано ранее.
         * Например:
         * ```javascript
         * // Пример входного BEMJSON: { block: 'search', action: '/act' }
         * bh.match('search', function(ctx) {
         *     ctx.attr('action', ctx.param('action') || '/');
         * });
         * ```
         * @param {String} key
         * @param {*} [value]
         * @param {Boolean} [force]
         * @returns {*|Ctx}
         */
        param: function(key, value, force) {
            if (value === undefined) {
                return this.ctx[key];
            }
            if (force || this.ctx[key] === undefined) {
                this.ctx[key] = value;
            }
            return this;
        },
        /**
         * Возвращает/устанавливает защищенное содержимое в зависимости от аргументов.
         * **force** — задать содержимое даже если оно было задано ранее.
         * ```javascript
         * bh.match('input', function(ctx) {
         *     ctx.content({ elem: 'control' });
         * });
         * ```
         * @param {BemJson} [value]
         * @param {Boolean} [force]
         * @returns {BemJson|Ctx}
         */
        content: function(value, force) {
            if (value === undefined) {
                return this.ctx.content;
            }
            if (force || this.ctx.content === undefined) {
                this.ctx.content = value;
            }
            return this;
        },
        /**
         * Возвращает/устанавливает незащищенное содержимое в зависимости от аргументов.
         * **force** — задать содержимое даже если оно было задано ранее.
         * ```javascript
         * bh.match('input', function(ctx) {
         *     ctx.html({ elem: 'control' });
         * });
         * ```
         * @param {String} [value]
         * @param {Boolean} [force]
         * @returns {String|Ctx}
         */
        html: function(value, force) {
            if (value === undefined) {
                return this.ctx.html;
            }
            if (force || this.ctx.html === undefined) {
                this.ctx.html = value;
            }
            return this;
        },
        /**
         * Возвращает текущий фрагмент BEMJSON-дерева.
         * Может использоваться в связке с `return` для враппинга и подобных целей.
         * ```javascript
         * bh.match('input', function(ctx) {
         *     return {
         *         elem: 'wrapper',
         *         content: ctx.json()
         *     };
         * });
         * ```
         * @returns {Object|Array}
         */
        json: function() {
            return this.ctx;
        }
    };
}

BH.prototype = {
    constructor: BH,

    /**
     * Задает опции шаблонизации.
     *
     * @param {Object} options
     *        {String} options[jsAttrName] Атрибут, в который записывается значение поля `js`. По умолчанию, `onclick`.
     *        {String} options[jsAttrScheme] Схема данных для `js`-значения.
     *                 Форматы:
     *                     `js` — значение по умолчанию. Получаем `return { ... }`.
     *                     `json` — JSON-формат. Получаем `{ ... }`.
     * @returns {BH}
     */
    setOptions: function(options) {
        var i;
        for (i in options) {
            this._options[i] = options[i];
        }
        if (options.jsAttrName) {
            this._optJsAttrName = options.jsAttrName;
        }
        if (options.jsAttrScheme) {
            this._optJsAttrIsJs = options.jsAttrScheme === 'js';
        }
        if (options.jsCls !== undefined) {
            this._optJsCls = options.jsCls;
        }
        if (options.hasOwnProperty('jsElem')) {
            this._optJsElem = options.jsElem;
        }
        if (options.clsNobaseMods) {
            this._optNobaseMods = true;
        }
        if (options.escapeContent) {
            this._optEscapeContent = options.escapeContent;
        }
        if (options.delimElem) {
            this._optDelimElem = options.delimElem;
        }
        if (options.delimMod) {
            this._optDelimMod = options.delimMod;
        }
        if (options.xhtml === false) {
            this._optShortTagCloser = '>';
        }
        if (options.shortTags) {
            for (var j = 0; j < options.shortTags.length; j++) {
                this._shortTags[options.shortTags[j]] = 1;
            }
        }

        return this;
    },

    /**
     * Возвращает опции шаблонизации.
     *
     * @returns {Object}
     */
    getOptions: function() {
        return this._options;
    },

    /**
     * Включает/выключает механизм определения зацикливаний.
     *
     * @param {Boolean} enable
     * @returns {BH}
     */
    enableInfiniteLoopDetection: function(enable) {
        this._infiniteLoopDetection = enable;
        return this;
    },

    /**
     * Преобразует BEMJSON в HTML-код.
     * @param {BemJson} bemJson
     * @returns {String}
     */
    apply: function(bemJson) {
        return this.toHtml(this.processBemJson(bemJson));
    },

    /**
     * Объявляет шаблон.
     * ```javascript
     * bh.match('page', function(ctx) {
     *     ctx.mix([{ block: 'ua' }]);
     *     ctx.cls('ua_js_no ua_css_standard');
     * });
     * bh.match('block_mod_modVal', function(ctx) {
     *     ctx.tag('span');
     * });
     * bh.match('block__elem', function(ctx) {
     *     ctx.attr('disabled', 'disabled');
     * });
     * bh.match('block__elem_elemMod', function(ctx) {
     *     ctx.mix([{ block: 'link' }]);
     * });
     * bh.match('block__elem_elemMod_elemModVal', function(ctx) {
     *     ctx.mod('active', 'yes');
     * });
     * bh.match('block_blockMod__elem', function(ctx) {
     *     ctx.param('checked', true);
     * });
     * bh.match('block_blockMod_blockModVal__elem', function(ctx) {
     *     ctx.content({
     *         elem: 'wrapper',
     *         content: ctx
     *     };
     * });
     * ```
     * @param {String|Array|Object} expr
     * @param {Function} matcher
     * @returns {BH}
     */
    match: function(expr, matcher) {
        if (!expr) return this;

        if (Array.isArray(expr)) {
            expr.forEach(function(match, i) {
                this.match(expr[i], matcher);
            }, this);
            return this;
        }

        if (typeof expr === 'object') {
            for (var i in expr) {
                this.match(i, expr[i]);
            }
            return this;
        }

        matcher.__id = '__func' + (this._lastMatchId++);
        this._matchers.push([expr, matcher]);
        this._fastMatcher = null;
        return this;
    },

    /**
     * Объявляет глобальный шаблон, применяемый перед остальными.
     * ```javascript
     * bh.beforeEach(function(ctx, json) {
     *     ctx.attr('onclick', json.counter);
     * });
     * ```
     * @param {Function} matcher
     * @returns {BH}
     */
    beforeEach: function(matcher) {
        return this.match('$before', matcher);
    },

    /**
     * Объявляет глобальный шаблон, применяемый после остальных.
     * ```javascript
     * bh.afterEach(function(ctx) {
     *     ctx.tag('xdiv');
     * });
     * ```
     * @param {Function} matcher
     * @returns {BH}
     */
    afterEach: function(matcher) {
        return this.match('$after', matcher);
    },

    /**
     * Вспомогательный метод для компиляции шаблонов с целью их быстрого дальнейшего исполнения.
     * @returns {String}
     */
    buildMatcher: function() {

        /**
         * Группирует селекторы матчеров по указанному ключу.
         * @param {Array} data
         * @param {String} key
         * @returns {Object}
         */
        function groupBy(data, key) {
            var res = {};
            for (var i = 0, l = data.length; i < l; i++) {
                var item = data[i];
                var value = item[key] || '__no_value__';
                (res[value] || (res[value] = [])).push(item);
            }
            return res;
        }

        /**
         * Вставляет вызов шаблона в очередь вызова.
         * @param {Array} res
         * @param {String} fnId
         * @returns {Number} index
         */
        function pushMatcher(res, fnId, index) {
            res.push(
                'json.' + fnId + ' = true;',
                'subRes = _m' + index + '(ctx, json);',
                'if (subRes !== undefined) return (subRes || "");',
                'if (json._stop) return;');
        }

        var i, j, l;
        var res = [];
        var vars = ['bh = this'];
        var allMatchers = this._matchers;
        var decl, expr, matcherInfo;
        var declarations = [], exprBits, blockExprBits;
        for (i = allMatchers.length - 1; i >= 0; i--) {
            matcherInfo = allMatchers[i];
            expr = matcherInfo[0];
            vars.push('_m' + i + ' = ms[' + i + '][1]');
            decl = { fn: matcherInfo[1], index: i };
            if (~expr.indexOf(this._optDelimElem)) {
                exprBits = expr.split(this._optDelimElem);
                blockExprBits = exprBits[0].split(this._optDelimMod);
                decl.block = blockExprBits[0];
                if (blockExprBits.length > 1) {
                    decl.blockMod = blockExprBits[1];
                    decl.blockModVal = blockExprBits[2] || true;
                }
                exprBits = exprBits[1].split(this._optDelimMod);
                decl.elem = exprBits[0];
                if (exprBits.length > 1) {
                    decl.elemMod = exprBits[1];
                    decl.elemModVal = exprBits[2] || true;
                }
            } else {
                exprBits = expr.split(this._optDelimMod);
                decl.block = exprBits[0];
                if (exprBits.length > 1) {
                    decl.blockMod = exprBits[1];
                    decl.blockModVal = exprBits[2] || true;
                }
            }
            declarations.push(decl);
        }
        var declByBlock = groupBy(declarations, 'block');

        var beforeEach = declByBlock.$before;
        var afterEach = declByBlock.$after;
        if (afterEach) delete declByBlock.$after;

        res.push(
            'var ' + vars.join(', ') + ';',
            'function applyMatchers(ctx, json) {',
            'var subRes;');

        if (beforeEach) {
            delete declByBlock.$before;
            for (j = 0, l = beforeEach.length; j < l; j++) {
                decl = beforeEach[j];
                pushMatcher(res, decl.fn.__id, decl.index);
            }
        }

        res.push('switch (json.block) {');
        for (var blockName in declByBlock) {
            res.push('case "' + blockName + '":');
            var declsByElem = groupBy(declByBlock[blockName], 'elem');

            res.push('switch (json.elem) {');
            for (var elemName in declsByElem) {
                if (elemName === '__no_value__') {
                    res.push('case undefined:');
                } else {
                    res.push('case "' + elemName + '":');
                }
                var decls = declsByElem[elemName];
                for (j = 0, l = decls.length; j < l; j++) {
                    decl = decls[j];
                    var fn = decl.fn;
                    var conds = [];
                    conds.push('!json.' + fn.__id);
                    if (decl.elemMod) {
                        conds.push(
                            'json.elemMods && json.elemMods["' + decl.elemMod + '"] === ' +
                                (decl.elemModVal === true || '"' + decl.elemModVal + '"'));
                    }
                    if (decl.blockMod) {
                        conds.push(
                            'json.mods && json.mods["' + decl.blockMod + '"] === ' +
                                (decl.blockModVal === true || '"' + decl.blockModVal + '"'));
                    }
                    res.push('if (' + conds.join(' && ') + ') {');
                    pushMatcher(res, fn.__id, decl.index);
                    res.push('}');
                }
                res.push('break;');
            }
            res.push(
                '}',
                'break;');
        }
        res.push('}');

        if (afterEach) {
            for (j = 0, l = afterEach.length; j < l; j++) {
                decl = afterEach[j];
                pushMatcher(res, decl.fn.__id, decl.index);
            }
        }

        res.push(
            '};',
            'return applyMatchers;');
        return res.join('\n');
    },

    /**
     * Раскрывает BEMJSON, превращая его из краткого в полный.
     * @param {BemJson} bemJson
     * @param {String} [blockName]
     * @param {Boolean} [ignoreContent]
     * @returns {Object|Array}
     */
    processBemJson: function(bemJson, blockName, ignoreContent) {
        if (bemJson == null) return;
        var resultArr = [bemJson];
        var nodes = [{
                json: bemJson,
                arr: resultArr,
                index: 0,
                block: blockName,
                mods: null
            }];
        var node, json, block, blockMods, i, j, l, p, child, subRes;
        var compiledMatcher = (this._fastMatcher || (this._fastMatcher = Function('ms', this.buildMatcher())(this._matchers)));
        var processContent = !ignoreContent;
        var infiniteLoopDetection = this._infiniteLoopDetection;

        /**
         * Враппер для json-узла.
         * @constructor
         */
        function Ctx() {
            this.ctx = null;
        }
        Ctx.prototype = this.utils;
        var ctx = new Ctx();
        while (node = nodes.shift()) {
            json = node.json;
            block = node.block;
            blockMods = node.mods;
            if (Array.isArray(json)) {
                for (i = 0, j = 0, l = json.length; i < l; i++) {
                    child = json[i];
                    if (child !== false && child != null && typeof child === 'object') {
                        nodes.push({
                            json: child,
                            arr: json,
                            index: i,
                            position: ++j,
                            block: block,
                            mods: blockMods,
                            parentNode: node
                        });
                    }
                }
                json._listLength = j;
            } else {
                var content, stopProcess = false;
                if (json.elem) {
                    block = json.block = json.block || block;
                    if (!json.elemMods) {
                        json.elemMods = json.mods || {};
                        json.mods = null;
                    }
                    blockMods = json.mods = json.mods || blockMods;
                } else if (json.block) {
                    block = json.block;
                    blockMods = json.mods = json.mods || {};
                }

                if (typeof json === 'object') {
                    if (infiniteLoopDetection) {
                        json.__processCounter = (json.__processCounter || 0) + 1;
                        compiledMatcher.__processCounter = (compiledMatcher.__processCounter || 0) + 1;
                        if (json.__processCounter > 100) {
                            throw new Error('Infinite json loop detected at "' + json.block + (json.elem ? this._optDelimElem + json.elem : '') + '".');
                        }
                        if (compiledMatcher.__processCounter > 1000) {
                            throw new Error('Infinite matcher loop detected at "' + json.block + (json.elem ? this._optDelimElem + json.elem : '') + '".');
                        }
                    }

                    subRes = undefined;

                    /* istanbul ignore else */
                    if (!json._stop) {
                        ctx.node = node;
                        ctx.ctx = json;
                        subRes = compiledMatcher(ctx, json);
                        if (subRes !== undefined) {
                            json = subRes;
                            node.json = json;
                            node.block = block;
                            node.mods = blockMods;
                            nodes.push(node);
                            stopProcess = true;
                        }
                    }
                }

                if (!stopProcess) {
                    if (processContent && (content = json.content)) {
                        if (Array.isArray(content)) {
                            var flatten;
                            do {
                                flatten = false;
                                for (i = 0, l = content.length; i < l; i++) {
                                    if (Array.isArray(content[i])) {
                                        flatten = true;
                                        break;
                                    }
                                }
                                if (flatten) {
                                    json.content = content = content.concat.apply([], content);
                                }
                            } while (flatten);
                            for (i = 0, j = 0, l = content.length, p = l - 1; i < l; i++) {
                                child = content[i];
                                if (child !== false && child != null && typeof child === 'object') {
                                    nodes.push({ json: child, arr: content, index: i, position: ++j, block: block, mods: blockMods, parentNode: node });
                                }
                            }
                            content._listLength = j;
                        } else {
                            nodes.push({ json: content, arr: json, index: 'content', block: block, mods: blockMods, parentNode: node });
                        }
                    }
                }
            }
            node.arr[node.index] = json;
        }
        return resultArr[0];
    },

    /**
     * Превращает раскрытый BEMJSON в HTML.
     * @param {BemJson} json
     * @returns {String}
     */
    toHtml: function(json) {
        this._buf = '';
        this._html(json);
        var buf = this._buf;
        delete this._buf;
        return buf;
    },

    /**
     * Наполняет HTML-строку.
     * @param {BemJson} json
     * @returns {undefined}
     */
    _html: function(json) {
        var i, l, item;
        if (json === false || json == null) return;
        if (typeof json !== 'object') {
            this._buf += this._optEscapeContent ? xmlEscape(json) : json;
        } else if (Array.isArray(json)) {
            for (i = 0, l = json.length; i < l; i++) {
                item = json[i];
                if (item !== false && item != null) {
                    this._html(item);
                }
            }
        } else {
            if (json.toHtml) {
                var html = json.toHtml.call(this, json) || '';
                this._buf += html;
                return;
            }
            var isBEM = json.bem !== false;
            if (typeof json.tag !== 'undefined' && !json.tag) {
                if (json.html) {
                    this._buf += json.html;
                } else {
                    this._html(json.content);
                }
                return;
            }
            if (json.mix && !Array.isArray(json.mix)) {
                json.mix = [json.mix];
            }
            var cls = '',
                jattr, jval, attrs = '', jsParams, hasMixJsParams = false;

            if (jattr = json.attrs) {
                for (i in jattr) {
                    jval = jattr[i];
                    if (jval === true) {
                        attrs += ' ' + i;
                    } else if (jval !== false && jval !== null && jval !== undefined) {
                        attrs += ' ' + i + '="' + attrEscape(jval) + '"';
                    }
                }
            }

            if (isBEM) {
                var base = json.block + (json.elem ? this._optDelimElem + json.elem : '');

                if (json.block) {
                    cls = toBemCssClasses(json, base, null, this._optNobaseMods, this._optDelimMod);
                    if (json.js) {
                        (jsParams = {})[base] = json.js === true ? {} : json.js;
                    }
                }

                var addJSInitClass = this._optJsCls && (this._optJsElem || !json.elem);

                var mixes = json.mix;
                if (mixes && mixes.length) {
                    for (i = 0, l = mixes.length; i < l; i++) {
                        var mix = mixes[i];
                        if (mix && mix.bem !== false) {
                            var mixBlock = mix.block || json.block || '',
                                mixElem = mix.elem || (mix.block ? null : json.block && json.elem),
                                mixBase = mixBlock + (mixElem ? this._optDelimElem + mixElem : '');

                            if (mixBlock) {
                                cls += toBemCssClasses(mix, mixBase, base, this._optNobaseMods, this._optDelimMod);
                                if (mix.js) {
                                    (jsParams = jsParams || {})[mixBase] = mix.js === true ? {} : mix.js;
                                    hasMixJsParams = true;
                                    if (!addJSInitClass) {
                                        addJSInitClass = mixBlock && (this._optJsCls && (this._optJsElem || !mixElem));
                                    }
                                }
                            }
                        }
                    }
                }

                if (jsParams) {
                    if (addJSInitClass) cls += ' ' + this._optJsCls;
                    var jsData = (!hasMixJsParams && json.js === true ?
                        '{"' + base + '":{}}' :
                        jsAttrEscape(JSON.stringify(jsParams)));
                    attrs += ' ' + (json.jsAttr || this._optJsAttrName) + '=\'' +
                        (this._optJsAttrIsJs ? 'return ' + jsData : jsData) + '\'';
                }
            }

            if (json.cls) {
                cls = (cls ? cls + ' ' : '') + attrEscape(json.cls).trim();
            }

            var tag = (json.tag || 'div');
            this._buf += '<' + tag + (cls ? ' class="' + cls + '"' : '') + (attrs ? attrs : '');

            if (this._shortTags[tag]) {
                this._buf += this._optShortTagCloser;
            } else {
                this._buf += '>';
                if (json.html) {
                    this._buf += json.html;
                } else {
                    this._html(json.content);
                }
                this._buf += '</' + tag + '>';
            }
        }
    }
};

var SHORT_TAGS = 'area base br col command embed hr img input keygen link menuitem meta param source track wbr'.split(' ');

var xmlEscape = BH.prototype.xmlEscape = function(str) {
    return (str + '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
};
var attrEscape = BH.prototype.attrEscape = function(str) {
    return (str + '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
};
var jsAttrEscape = BH.prototype.jsAttrEscape = function(str) {
    return (str + '').replace(/&/g, '&amp;').replace(/'/g, '&#39;');
};

var toBemCssClasses = function(json, base, parentBase, nobase, delimMod) {
    var mods, mod, res = '', i;

    if (parentBase !== base) {
        if (parentBase) res += ' ';
        res += base;
    }

    if (mods = json.elem && json.elemMods || json.mods) {
        for (i in mods) {
            mod = mods[i];
            if (mod || mod === 0) {
                res += ' ' + (nobase ? delimMod : base + delimMod) + i + (mod === true ? '' : delimMod + mod);
            }
        }
    }
    return res;
};

return BH;
})();

/* istanbul ignore else */
if (typeof module !== 'undefined') {
    module.exports = BH;
}

var bh = new BH();
bh.setOptions({"jsAttrName":"data-bem","jsAttrScheme":"json"});
var init = function (global, BH) {
(function () {
// begin: ../../common.blocks/ua/ua.bh.js


    bh.match('ua', function(ctx) {
        ctx
            .bem(false)
            .tag('script')
            .content([
                '(function(e,c){',
                    'e[c]=e[c].replace(/(ua_js_)no/g,"$1yes");',
                '})(document.documentElement,"className");'
            ], true);
    });


// end: ../../common.blocks/ua/ua.bh.js
}());
(function () {
// begin: ../../common.blocks/page/page.bh.js


    bh.match('page', function(ctx, json) {
        ctx
            .tag('body')
            .tParam('nonceCsp', json.nonce)
            .content([
                ctx.content(),
                json.scripts
            ], true);

        return [
            { html : json.doctype || '<!DOCTYPE html>', tag : false },
            {
                tag : 'html',
                attrs : { lang : json.lang },
                cls : 'ua_js_no',
                content : [
                    {
                        elem : 'head',
                        content : [
                            { tag : 'meta', attrs : { charset : 'utf-8' } },
                            json.uaCompatible === false? '' : {
                                tag : 'meta',
                                attrs : {
                                    'http-equiv' : 'X-UA-Compatible',
                                    content : json.uaCompatible || 'IE=edge'
                                }
                            },
                            { tag : 'title', content : json.title },
                            { block : 'ua',  attrs : { nonce : json.nonce } },
                            json.head,
                            json.styles,
                            json.favicon? { elem : 'favicon', url : json.favicon } : '',
                        ]
                    },
                    json
                ]
            }
        ];
    });

    bh.match('page__head', function(ctx) {
        ctx.bem(false).tag('head');
    });

    bh.match('page__meta', function(ctx) {
        ctx.bem(false).tag('meta');
    });

    bh.match('page__link', function(ctx) {
        ctx.bem(false).tag('link');
    });

    bh.match('page__favicon', function(ctx, json) {
        ctx
            .bem(false)
            .tag('link')
            .attr('rel', 'shortcut icon')
            .attr('href', json.url);
    });


// end: ../../common.blocks/page/page.bh.js
}());
(function () {
// begin: ../../common.blocks/page/__css/page__css.bh.js


    bh.match('page__css', function(ctx, json) {
        ctx.bem(false);

        if(json.url) {
            ctx
                .tag('link')
                .attr('rel', 'stylesheet')
                .attr('href', json.url);
        } else {
            ctx.tag('style');
        }

    });


// end: ../../common.blocks/page/__css/page__css.bh.js
}());
(function () {
// begin: ../../common.blocks/page/__js/page__js.bh.js


    bh.match('page__js', function(ctx, json) {
        var nonce = ctx.tParam('nonceCsp');
        ctx
            .bem(false)
            .tag('script');

        if(json.url) {
            ctx.attr('src', json.url);
        } else if(nonce) {
            ctx.attr('nonce', nonce);
        }
    });


// end: ../../common.blocks/page/__js/page__js.bh.js
}());
(function () {
// begin: ../../common.blocks/ua/__svg/ua__svg.bh.js

    bh.match('ua', function(ctx, json) {
        ctx.applyBase();
        ctx.content([
            json.content,
            {
                tag : false,
                html : [
                    '(function(d,n){',
                        'd.documentElement.className+=',
                        '" ua_svg_"+(d[n]&&d[n]("http://www.w3.org/2000/svg","svg").createSVGRect?"yes":"no");',
                    '})(document,"createElementNS");'
                ].join('')
            }
        ], true);
    });

// end: ../../common.blocks/ua/__svg/ua__svg.bh.js
}());
(function () {
// begin: ../../desktop.blocks/page/__conditional-comment/page__conditional-comment.bh.js


    bh.match('page__conditional-comment', function(ctx, json) {
        ctx.tag(false);

        var cond = json.condition
                .replace('<', 'lt')
                .replace('>', 'gt')
                .replace('=', 'e'),
            hasNegation = cond.indexOf('!') > -1,
            includeOthers = json.msieOnly === false,
            hasNegationOrIncludeOthers = hasNegation || includeOthers;

        return [
            { html : '<!--[if ' + cond + ']>', tag : false },
            includeOthers? { html : '<!', tag : false } : '',
            hasNegationOrIncludeOthers? { html : '-->', tag : false } : '',
            json,
            hasNegationOrIncludeOthers? { html : '<!--', tag : false } : '',
            { html : '<![endif]-->', tag : false }
        ];
    });


// end: ../../desktop.blocks/page/__conditional-comment/page__conditional-comment.bh.js
}());
};

var defineAsGlobal = true;
if (typeof modules === "object") {
    modules.define("BH", [], function(provide) {


init();
        provide(bh);
    });
    modules.define("bh", ["BH"], function(provide) {



        provide(bh);
    });
    modules.define("BEMHTML", ["BH"], function(provide) {



        provide(bh);
    });
    defineAsGlobal = false;
} else if (typeof exports === "object") {
    init();
    bh["bh"] = bh;
    bh["BEMHTML"] = bh;
    module.exports = bh;
    defineAsGlobal = false;
}
if (defineAsGlobal) {

    init();
    global.BH = bh;
    global["bh"] = bh;
    global["BEMHTML"] = bh;
}
}(typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : this));
