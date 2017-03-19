var BEMHTML;!function(t){function e(e){var n={},i=function(e,n){return function(i){if("object"==typeof n&&"undefined"!=typeof e)e.exports=i();else if("function"==typeof define&&define.amd)define([],i);else{var s;s="undefined"!=typeof window?window:"undefined"!=typeof t?t:"undefined"!=typeof self?self:this,s.bemhtml=i()}}(function(){return function t(e,n,i){function s(r,h){if(!n[r]){if(!e[r]){var c="function"==typeof require&&require;if(!h&&c)return c(r,!0);if(o)return o(r,!0);var a=new Error("Cannot find module '"+r+"'");throw a.code="MODULE_NOT_FOUND",a}var l=n[r]={exports:{}};e[r][0].call(l.exports,function(t){var n=e[r][1][t];return s(n?n:t)},l,l.exports,t,e,n,i)}return n[r].exports}for(var o="function"==typeof require&&require,r=0;r<i.length;r++)s(i[r]);return s}({1:[function(t,e,n){function i(t){this.bemxjst=t,this.jsClass=null,this.tag=new o(this,"tag"),this.attrs=new o(this,"attrs"),this.bem=new o(this,"bem"),this.cls=new o(this,"cls"),r.apply(this,arguments)}var s=t("inherits"),o=t("../bemxjst/match").Match,r=t("../bemxjst/entity").Entity;s(i,r),n.Entity=i,i.prototype.init=function(t,e){this.block=t,this.elem=e,this.jsClass=this.bemxjst.classBuilder.build(this.block,this.elem)},i.prototype._keys={tag:1,content:1,attrs:1,mix:1,js:1,mods:1,elemMods:1,cls:1,bem:1},i.prototype.defaultBody=function(t){return t.mods=this.mods.exec(t),t.ctx.elem&&(t.elemMods=this.elemMods.exec(t)),this.bemxjst.render(t,this,this.tag.exec(t),this.js.exec(t),this.bem.exec(t),this.cls.exec(t),this.mix.exec(t),this.attrs.exec(t),this.content.exec(t),t.mods,t.elemMods)}},{"../bemxjst/entity":5,"../bemxjst/match":8,inherits:11}],2:[function(t,e,n){function i(t){h.apply(this,arguments),this._shortTagCloser="undefined"!=typeof t.xhtml&&t.xhtml?"/>":">",this._elemJsInstances=t.elemJsInstances,this._omitOptionalEndTags=t.omitOptionalEndTags,this._unquotedAttrs="undefined"!=typeof t.unquotedAttrs&&t.unquotedAttrs}var s=t("inherits"),o=t("../bemxjst/utils"),r=t("./entity").Entity,h=t("../bemxjst");s(i,h),e.exports=i,i.prototype.Entity=r,i.prototype.runMany=function(t){var e="",n=this.context,i=n.position,s=n._notNewList;if(s?n._listLength+=t.length-1:(n.position=0,n._listLength=t.length),n._notNewList=!0,this.canFlush)for(var o=0;o<t.length;o++)e+=n._flush(this._run(t[o]));else for(var o=0;o<t.length;o++)e+=this._run(t[o]);return s||(n.position=i),e},i.prototype.render=function(t,e,n,i,s,r,h,c,a,l,u){var p=t.ctx;if(void 0===n)n="div";else if(!n)return a||0===a?this._run(a):"";var f="<"+n;i===!0&&(i={});var d;i&&(d={},d[e.jsClass]=i);var m="undefined"!=typeof s?s:e.block||e.elem;m=!!m;var y=d&&(this._elemJsInstances?e.block:e.block&&!e.elem);if(!m&&!r)return this.renderClose(f,t,n,c,m,p,a);f+=" class=";var v="";if(m){if(v+=e.jsClass,v+=this.buildModsClasses(e.block,e.elem,e.elem?u:l),h){var x=this.renderMix(e,h,d,y);v+=x.out,d=x.jsParams,y=x.addJSInitClass}r&&(v+=" "+("string"==typeof r?o.attrEscape(r).trim():r))}else v+="string"==typeof r?o.attrEscape(r).trim():r;return y&&(v+=" i-bem"),f+=this._unquotedAttrs&&o.isUnquotedAttr(v)?v:'"'+v+'"',m&&d&&(f+=" data-bem='"+o.jsAttrEscape(JSON.stringify(d))+"'"),this.renderClose(f,t,n,c,m,p,a)};var c={html:1,head:1,body:1,p:1,ul:1,ol:1,li:1,dt:1,dd:1,colgroup:1,thead:1,tbody:1,tfoot:1,tr:1,th:1,td:1,option:1,rb:1,rt:1,rtc:1,rp:1,optgroup:1};i.prototype.renderClose=function(t,e,n,i,s,r,h){var a=t;return a+=this.renderAttrs(i),o.isShortTag(n)?(a+=this._shortTagCloser,this.canFlush&&(a=e._flush(a))):(a+=">",this.canFlush&&(a=e._flush(a)),(h||0===h)&&(a+=this.renderContent(h,s)),this._omitOptionalEndTags&&c.hasOwnProperty(n)||(a+="</"+n+">")),this.canFlush&&(a=e._flush(a)),a},i.prototype.renderAttrs=function(t){var e="";if(o.isObj(t))for(var n in t){var i=t[n];if(void 0!==i&&i!==!1&&null!==i)if(i===!0)e+=" "+n;else{var s=o.isSimple(i)?i:this.context.reapply(i);e+=" "+n+"=",e+=this._unquotedAttrs&&o.isUnquotedAttr(s)?s:'"'+o.attrEscape(s)+'"'}}return e},i.prototype.renderMix=function(t,e,n,i){var s={},o=this.context,r=n,h=i;s[t.jsClass]=!0,Array.isArray(e)||(e=[e]);for(var c=this.classBuilder,a="",l=0;l<e.length;l++){var u=e[l];if(u){"string"==typeof u&&(u={block:u,elem:void 0});var p=!1;u.elem?p=u.elem!==t.elem&&u.elem!==o.elem||u.block&&u.block!==t.block:u.block&&(p=!(u.block===t.block&&u.mods)||u.mods&&t.elem);var f=u.block||u._block||o.block,d=u.elem||u._elem||o.elem,m=c.build(f,d),y=u.elem||u._elem||(u.block?void 0:o.elem);if(p&&(a+=" "+c.build(f,y)),a+=this.buildModsClasses(f,y,u.elem||!u.block&&(u._elem||o.elem)?u.elemMods:u.mods),u.js&&(r||(r={}),r[c.build(f,u.elem)]=u.js===!0?{}:u.js,h||(h=f&&!u.elem)),p&&!s[m]){s[m]=!0;var v=this.entities[m];if(v){var x=o.block,b=o.elem,g=v.mix.exec(o);if(o.elem=b,o.block=x,g)for(var k=0;k<g.length;k++){var w=g[k];if(w&&(!w.block&&!w.elem||!s[c.build(w.block,w.elem)])){if(w.block)continue;w._block=f,w._elem=d,e=e.slice(0,l+1).concat(w,e.slice(l+1))}}}}}}return{out:a,jsParams:r,addJSInitClass:h}},i.prototype.buildModsClasses=function(t,e,n){if(!n)return"";var i,s="";for(i in n)if(n.hasOwnProperty(i)&&""!==i){var o=n[i];if(o||0===o){"boolean"!=typeof o&&(o+="");var r=this.classBuilder;s+=" "+(e?r.buildElemClass(t,e,i,o):r.buildBlockClass(t,i,o))}}return s}},{"../bemxjst":7,"../bemxjst/utils":10,"./entity":1,inherits:11}],3:[function(t,e,n){function i(t){this.modDelim=t.mod||"_",this.elemDelim=t.elem||"__"}n.ClassBuilder=i,i.prototype.build=function(t,e){return e?t+this.elemDelim+e:t},i.prototype.buildModPostfix=function(t,e){var n=this.modDelim+t;return e!==!0&&(n+=this.modDelim+e),n},i.prototype.buildBlockClass=function(t,e,n){var i=t;return n&&(i+=this.buildModPostfix(e,n)),i},i.prototype.buildElemClass=function(t,e,n,i){return this.buildBlockClass(t)+this.elemDelim+e+this.buildModPostfix(n,i)},i.prototype.split=function(t){return t.split(this.elemDelim,2)}},{}],4:[function(t,e,n){function i(t){this._bemxjst=t,this.ctx=null,this.block="",this._currBlock="",this.elem=null,this.mods={},this.elemMods={},this.position=0,this._listLength=0,this._notNewList=!1,this.escapeContent=t.options.escapeContent!==!1}var s=t("./utils");n.Context=i,i.prototype._flush=null,i.prototype.isSimple=s.isSimple,i.prototype.isShortTag=s.isShortTag,i.prototype.extend=s.extend,i.prototype.identify=s.identify,i.prototype.xmlEscape=s.xmlEscape,i.prototype.attrEscape=s.attrEscape,i.prototype.jsAttrEscape=s.jsAttrEscape,i.prototype.isFirst=function(){return 1===this.position},i.prototype.isLast=function(){return this.position===this._listLength},i.prototype.generateId=function(){return s.identify(this.ctx)},i.prototype.reapply=function(t){return this._bemxjst.run(t)}},{"./utils":10}],5:[function(t,e,n){function i(t,e,n,i){this.bemxjst=t,this.block=null,this.elem=null,this.options={},this.canFlush=!0,this.def=new r(this),this.mix=new r(this,"mix"),this.js=new r(this,"js"),this.mods=new r(this,"mods"),this.elemMods=new r(this,"elemMods"),this.content=new r(this,"content"),this.rest={},this.init(e,n),this.initModes(i)}function s(){return this.ctx.content}var o=t("./utils"),r=t("./match").Match,h=t("./tree"),c=h.Template,a=h.PropertyMatch,l=h.CompilerOptions;n.Entity=i,i.prototype.init=function(t,e){this.block=t,this.elem=e},i.prototype._keys={content:1,mix:1,js:1,mods:1,elemMods:1},i.prototype._initRest=function(t){"default"===t?this.rest[t]=this.def:this._keys[t]?this.rest[t]=this[t]:this.rest[t]=this.rest[t]||new r(this,t)},i.prototype.initModes=function(t){for(var e=0;e<t.length;e++){for(var n=t[e],i=n.predicates.length-1;i>=0;i--){var s=n.predicates[i];if(s instanceof a&&"_mode"===s.key){n.predicates.splice(i,1),this._initRest(s.value),this.rest[s.value].push(n);break}}i===-1&&this.def.push(n);for(var i=n.predicates.length-1;i>=0;i--){var s=n.predicates[i];s instanceof l&&(this.options=o.extend(this.options,s.options))}}},i.prototype.prepend=function(t){for(var e=Object.keys(this.rest),n=0;n<e.length;n++){var i=e[n];t.rest[i]&&this.rest[i].prepend(t.rest[i])}e=Object.keys(t.rest);for(var n=0;n<e.length;n++){var i=e[n];this.rest[i]||(this._initRest(i),this.rest[i].prepend(t.rest[i]))}},i.prototype.run=function(t){return 0!==this.def.count?this.def.exec(t):this.defaultBody(t)},i.prototype.setDefaults=function(){if(0!==this.content.count&&this.content.push(new c([],s)),0!==this.def.count){this.canFlush=this.options.flush||!1;var t=this;this.def.push(new c([],function(){return t.defaultBody(this)}))}}},{"./match":8,"./tree":9,"./utils":10}],6:[function(t,e,n){function i(t,e){this.name="BEMXJSTError",this.message=t,Error.captureStackTrace?Error.captureStackTrace(this,e||this.constructor):this.stack=(new Error).stack}i.prototype=Object.create(Error.prototype),i.prototype.constructor=i,n.BEMXJSTError=i},{}],7:[function(t,e,n){function i(t){this.options=t,this.entities=null,this.defaultEnt=null,this.tree=null,this.match=null,this.contextConstructor=function(t){c.call(this,t)},s(this.contextConstructor,c),this.context=null,this.classBuilder=new a(this.options.naming||{}),this.depth=0,this.canFlush=!1,this.oninit=null,this.defaultEnt=new this.Entity(this,"","",[]),this.defaultElemEnt=new this.Entity(this,"","",[])}var s=t("inherits"),o=t("./tree").Tree,r=t("./tree").PropertyMatch,h=t("./tree").AddMatch,c=t("./context").Context,a=t("./class-builder").ClassBuilder,l=t("./utils");e.exports=i,i.prototype.locals=o.methods.concat("local","applyCtx","applyNext","apply"),i.prototype.compile=function(t){function e(){return r._run(r.context.ctx)}function n(t,n){return n?r.local(n,function(){return r.local({ctx:t},e)}):r.local({ctx:t},e)}function i(t,e){return r.applyMode(t,e)}function s(t){return function(e){return r.local(t,e)}}var r=this,h=new o({refs:{applyCtx:n,apply:i}}),c=this.recompileInput(t),a=h.build(c,[s,n,function t(e){return e?r.local(e,t):r.applyNext()},i]);this.tree&&(a={templates:a.templates.concat(this.tree.templates),oninit:this.tree.oninit.concat(a.oninit)}),this.tree=a;var l=this.groupEntities(a.templates);l=this.transformEntities(l),this.entities=l,this.oninit=a.oninit},i.prototype.getTemplate=function(t,e){return this.compile(t,e),this.exportApply()},i.prototype.recompileInput=function(t){var e=i.prototype.locals;return"function"==typeof t&&t.length===e.length?t:new Function(e.join(", "),l.fnToString(t))},i.prototype.groupEntities=function(e){for(var n={},i=0;i<e.length;i++){var s,o=e[i].clone(),c=null;s=void 0;for(var a=0;a<o.predicates.length;a++){var l=o.predicates[a];if(l instanceof r||l instanceof h){if("block"===l.key)c=l.value;else{if("elem"!==l.key)continue;s=l.value}o.predicates.splice(a,1),a--}}if(null===c){for(var u="block(…) subpredicate is not found.\n    See template with subpredicates:\n     * ",a=0;a<o.predicates.length;a++){var l=o.predicates[a];0!==a&&(u+="\n     * "),u+="_mode"===l.key?l.value+"()":Array.isArray(l.key)?l.key[0].replace("mods","mod").replace("elemMods","elemMod")+"('"+l.key[1]+"', '"+l.value+"')":"match(…)"}throw u+="\n    And template body: \n    ("+("function"==typeof o.body?o.body:JSON.stringify(o.body))+")","undefined"==typeof BEMXJSTError&&(BEMXJSTError=t("./error").BEMXJSTError),new BEMXJSTError(u)}var p=this.classBuilder.build(c,s);n[p]||(n[p]=[]),n[p].push(o)}return n},i.prototype.transformEntities=function(t){for(var e=[],n=Object.keys(t),i=0;i<n.length;i++){var s=n[i],o=this.classBuilder.split(s),r=o[0],h=o[1];"*"===h&&e.push(r),t[s]=new this.Entity(this,r,h,t[s])}if(t.hasOwnProperty("*")){for(var c=t["*"],i=0;i<n.length;i++){var s=n[i];"*"!==s&&t[s].prepend(c)}this.defaultEnt.prepend(c),this.defaultElemEnt.prepend(c)}for(var i=0;i<e.length;i++){for(var r=e[i],a=this.classBuilder.build(r,"*"),c=t[a],i=0;i<n.length;i++){var s=n[i];if(s!==a){var l=t[s];l.block===r&&void 0!==l.elem&&t[s].prepend(c)}}this.defaultElemEnt.prepend(c)}for(var i=0;i<n.length;i++){var s=n[i];t[s].setDefaults(),this.defaultEnt.setDefaults(),this.defaultElemEnt.setDefaults()}return t},i.prototype._run=function(t){return void 0===t||""===t||null===t?this.runEmpty():Array.isArray(t)?this.runMany(t):"string"!=typeof t.html||t.tag||"undefined"!=typeof t.block||"undefined"!=typeof t.elem||"undefined"!=typeof t.cls||"undefined"!=typeof t.attrs?l.isSimple(t)?this.runSimple(t):this.runOne(t):this.runUnescaped(t)},i.prototype.run=function(t){var e=this.match,n=this.context;this.match=null,this.context=new this.contextConstructor(this),this.canFlush=null!==this.context._flush,this.depth=0;var i=this._run(t);return this.canFlush&&(i=this.context._flush(i)),this.match=e,this.context=n,i},i.prototype.runEmpty=function(){return this.context._listLength--,""},i.prototype.runUnescaped=function(t){return this.context._listLength--,""+t.html},i.prototype.runSimple=function(t){return this.context._listLength--,!t&&0!==t||t===!0?"":"string"==typeof t&&this.context.escapeContent?l.xmlEscape(t):t},i.prototype.runOne=function(t){var e=this.context,n=e.ctx,i=e.block,s=e._currBlock,o=e.elem,r=e.mods,h=e.elemMods;t.block||t.elem?e._currBlock="":e._currBlock=e.block,e.ctx=t,t.block?(e.block=t.block,t.mods?e.mods=t.mods:t.block===i&&t.elem||(e.mods={})):t.elem?s&&(e.block=s):e.block="",e.elem=t.elem,t.elemMods?e.elemMods=t.elemMods:e.elemMods={};var c=e.block||"",a=e.elem;c||a?e.position++:e._listLength--,this.depth++;var l=!1,u=this.entities[this.classBuilder.build(c,a)];u?this.canFlush&&!u.canFlush&&(l=!0,this.canFlush=!1):(u=this.defaultEnt,void 0!==a&&(u=this.defaultElemEnt),u.init(c,a));var p=this.options.production===!0?this.tryRun(e,u):u.run(e);return e.ctx=n,e.block=i,e.elem=o,e.mods=r,e.elemMods=h,e._currBlock=s,this.depth--,l&&(this.canFlush=!0),p},i.prototype.tryRun=function(t,e){try{return e.run(t)}catch(e){return console.error("BEMXJST ERROR: cannot render "+["block "+t.block,"elem "+t.elem,"mods "+JSON.stringify(t.mods),"elemMods "+JSON.stringify(t.elemMods)].join(", "),e),""}},i.prototype.renderContent=function(t,e){var n=this.context,i=n.position,s=n._listLength,o=n._notNewList;n._notNewList=!1,e&&(n.position=0,n._listLength=1);var r=this._run(t);return n.position=i,n._listLength=s,n._notNewList=o,r},i.prototype.local=function(t,e){for(var n=Object.keys(t),i=[],s=0;s<n.length;s++){for(var o=n[s],r=o.split("."),h=this.context,c=0;c<r.length-1;c++)h=h[r[c]];i.push({parts:r,value:h[r[c]]}),h[r[c]]=t[o]}for(var a=e.call(this.context),s=0;s<i.length;s++){for(var r=i[s].parts,h=this.context,c=0;c<r.length-1;c++)h=h[r[c]];h[r[c]]=i[s].value}return a},i.prototype.applyNext=function(){return this.match.exec(this.context)},i.prototype.applyMode=function(t,e){var n,i=this.match;if(i)i=this.match.entity.rest[t];else{var n=this.classBuilder.build(this.context.block,this.context.elem);i=this.entities[n].rest[t]}if(!i)return"mods"===t?this.context.mods:"elemMods"===t?this.context.elemMods:this.context.ctx[t];if(!e)return i.exec(this.context);var s=this,o=function(){return i.exec(s.context)};return this.local(e,o)},i.prototype.exportApply=function(t){var e=this,n=t||{};n.apply=function(t){return e.run(t)},n.compile=function(t){return e.compile(t),n},n.BEMContext=this.contextConstructor;for(var i=0;i<this.oninit.length;i++){var s=e.oninit[i];s(n,{BEMContext:n.BEMContext})}return n}},{"./class-builder":3,"./context":4,"./error":6,"./tree":9,"./utils":10,inherits:11}],8:[function(t,e,n){function i(t,e){this.template=t,this.keys=e.key,this.value=e.value}function s(t,e){this.template=t,this.body=e.body}function o(t){this.template=t,this.wrap=null}function r(t){this.template=t,this.wrap=null}function h(t,e){this.template=t,this.key=e.key,this.value=e.value}function c(t,e){this.mode=t,this.predicates=new Array(e.predicates.length),this.body=e.body;for(var n=[],c=0,a=0;c<this.predicates.length;c++,a++){var l=e.predicates[c];l instanceof u?this.predicates[a]=new i(this,l):l instanceof d?(a--,n.push(new r(this))):l instanceof p?this.predicates[a]=new h(this,l):l instanceof m?this.predicates[a]=new s(this,l):l instanceof f?(a--,n.push(new o(this))):a--}for(var c=0;c<n.length;c++,a++)this.predicates[a]=n[c];this.predicates.length!==a&&(this.predicates.length=a)}function a(t,e){this.entity=t,this.modeName=e,this.bemxjst=this.entity.bemxjst,this.templates=[],this.mask=[0],this.maskSize=0,this.maskOffset=0,this.count=0,this.depth=-1,this.thrownError=null}var l=t("./tree"),u=l.PropertyMatch,p=l.AddMatch,f=l.WrapMatch,d=l.ExtendMatch,m=l.CustomMatch;i.prototype.exec=function(t){for(var e=t,n=0;n<this.keys.length-1;n++)if(e=e[this.keys[n]],!e)return!1;return e=e[this.keys[n]],this.value===!0?void 0!==e&&""!==e&&e!==!1&&null!==e:String(e)===this.value},s.prototype.exec=function(t){return this.body.call(t,t,t.ctx)},o.prototype.exec=function(t){var e=this.wrap!==t.ctx;return this.wrap=t.ctx,e},r.prototype.exec=function(t){var e=this.ext!==t.ctx;return this.ext=t.ctx,e},h.prototype.exec=function(t){return t[this.key]===this.value},n.MatchTemplate=c,n.Match=a,a.prototype.prepend=function(t){for(this.templates=t.templates.concat(this.templates),this.count+=t.count;Math.ceil(this.count/31)>this.mask.length;)this.mask.push(0);this.maskSize=this.mask.length},a.prototype.push=function(t){this.templates.push(new c(this,t)),this.count++,Math.ceil(this.count/31)>this.mask.length&&this.mask.push(0),this.maskSize=this.mask.length},a.prototype.tryCatch=function(t,e){try{return t.call(e,e,e.ctx)}catch(t){this.thrownError=t}},a.prototype.exec=function(t){for(var e,n=this.checkDepth(),i=this.maskOffset,s=this.mask[i],o=1,r=0;r<this.count;r++){if(0===(s&o)){e=this.templates[r];for(var h=0;h<e.predicates.length;h++){var c=e.predicates[h];if(!c.exec(t))break}if(h===e.predicates.length)break}1073741824===o?(i++,s=this.mask[i],o=1):o<<=1}if(r===this.count)return"mods"===this.modeName?t.mods:"elemMods"===this.modeName?t.elemMods:t.ctx[this.modeName];var a=s,l=this.bemxjst.match;this.mask[i]|=o,this.bemxjst.match=this,this.thrownError=null;var u;u="function"==typeof e.body?this.tryCatch(e.body,t):e.body,this.mask[i]=a,this.bemxjst.match=l,this.restoreDepth(n);var p=this.thrownError;if(null!==p)throw this.thrownError=null,p;return u},a.prototype.checkDepth=function(){if(this.depth===-1)return this.depth=this.bemxjst.depth,-1;if(this.bemxjst.depth===this.depth)return this.depth;var t=this.depth;for(this.depth=this.bemxjst.depth,this.maskOffset+=this.maskSize;this.mask.length<this.maskOffset+this.maskSize;)this.mask.push(0);return t},a.prototype.restoreDepth=function(t){t!==-1&&t!==this.depth&&(this.maskOffset-=this.maskSize),this.depth=t}},{"./tree":9}],9:[function(t,e,n){function i(t,e){this.predicates=t,this.body=e}function s(){}function o(t,e){this.conditions=[],this.children=[];for(var n=e.length-1;n>=0;n--){var i=e[n];i instanceof s?this.conditions.push(i):i===t.boundBody?this.children[n]=t.queue.pop():this.children[n]=i}}function r(t){s.call(this),this.refs=t}function h(t){s.call(this),this.refs=t}function c(t){s.call(this),this.refs=t}function a(t,e){s.call(this),this.mode=t,this.refs=e}function l(t){s.call(this),this.options=t}function u(t,e){s.call(this),this.key=t,this.value=e}function p(t){s.call(this),this.body=t}function f(t){this.options=t,this.refs=this.options.refs,this.boundBody=this.body.bind(this);for(var e=this.methods("body"),n=0;n<e.length;n++){var i=e[n];this.boundBody[f.methods[n]]=i}this.queue=[],this.templates=[],this.initializers=[]}function d(t,e,n){var i=t[n],s=t.boundBody;return"body"!==e?"replace"===n||"extend"===n||"wrap"===n?function(){return i.apply(t,arguments)}:function(){return i.apply(t,arguments),s}:function(){var e=i.apply(t,arguments),o=t.queue.pop(),r=t.queue[t.queue.length-1];return r.conditions=r.conditions.concat(o.conditions),r.children=r.children.concat(o.children),"replace"===n||"extend"===n||"wrap"===n?e:s}}function m(t){return t[0].toUpperCase()+t.slice(1)}var y=t("inherits"),v=t("./utils");n.Template=i,i.prototype.wrap=function(){for(var t=this.body,e=0;e<this.predicates.length;e++){var n=this.predicates[e];t=n.wrapBody(t)}this.body=t},i.prototype.clone=function(){return new i(this.predicates.slice(),this.body)},n.MatchBase=s,s.prototype.wrapBody=function(t){return t},y(r,s),n.WrapMatch=r,r.prototype.wrapBody=function(t){var e=this.refs.applyCtx;return"function"!=typeof t?function(){return e(t)}:function(){return e(t.call(this,this,this.ctx))}},y(h,s),n.ReplaceMatch=h,h.prototype.wrapBody=function(t){var e=this.refs.applyCtx;return"function"!=typeof t?function(){return e(t,{position:this.position-1})}:function(){return e(t.call(this,this,this.ctx),{position:this.position-1})}},y(c,s),n.ExtendMatch=c,c.prototype.wrapBody=function(t){var e=this.refs,n=e.applyCtx;return"function"!=typeof t?function(){for(var e={},i=Object.keys(t),s=0;s<i.length;s++)e[i[s]]=t[i[s]];return n(this.ctx,e)}:function(){for(var e={},i=t.call(this,this,this.ctx),s=Object.keys(i),o=0;o<s.length;o++)e[s[o]]=i[s[o]];return n(this.ctx,e)}},y(a,s),n.AddMatch=a,a.prototype.wrapBody=function(t){return this[this.mode+"WrapBody"](t)},a.prototype.appendContentWrapBody=function(t){var e=this.refs.apply;return"function"!=typeof t?function(){return[e("content"),t]}:function(){return[e("content"),t.call(this,this,this.ctx)]}},a.prototype.prependContentWrapBody=function(t){var e=this.refs.apply;return"function"!=typeof t?function(){return[t,e("content")]}:function(){return[t.call(this,this,this.ctx),e("content")]}},a.prototype.mixWrapBody=function(t){var e=this.refs.apply;return"function"!=typeof t?function(){var n=e("mix");return Array.isArray(n)||(n=[n]),n.concat(t)}:function(){var n=e("mix");return Array.isArray(n)||(n=[n]),n.concat(t.call(this,this,this.ctx))}},["attrs","js","mods","elemMods"].forEach(function(t){a.prototype[t+"WrapBody"]=function(e){var n=this.refs.apply;return"function"!=typeof e?function(){return this[t]=v.extend(n(t)||{},e)}:function(){return this[t]=v.extend(n(t)||{},e.call(this,this,this.ctx))}}}),y(l,s),n.CompilerOptions=l,y(u,s),n.PropertyMatch=u,y(p,s),n.CustomMatch=p,n.Tree=f,f.methods=["match","block","elem","mod","elemMod","oninit","xjstOptions","wrap","replace","extend","mode","def","content","appendContent","prependContent","attrs","addAttrs","js","addJs","mix","addMix","mods","addMods","addElemMods","elemMods","tag","cls","bem"],f.prototype.build=function(t,e){var n=this.methods("global").concat(e);return n[0]=this.match.bind(this),t.apply({},n),{templates:this.templates.slice().reverse(),oninit:this.initializers}},f.prototype.methods=function(t){for(var e=new Array(f.methods.length),n=0;n<e.length;n++){var i=f.methods[n];e[n]=d(this,t,i)}return e},f.prototype.flush=function(t,e){for(var n=e.conditions?t.concat(e.conditions):e.conditions,s=0;s<e.children.length;s++){var r=e.children[s];if(r instanceof o)this.flush(n,e.children[s]);else{var h=new i(t,r);h.wrap(),this.templates.push(h)}}},f.prototype.body=function(){for(var t=new Array(arguments.length),e=0;e<arguments.length;e++)t[e]=arguments[e];var n=new o(this,t);return this.queue[this.queue.length-1].children.push(n),1===this.queue.length&&this.flush([],this.queue.shift()),this.boundBody},f.prototype.match=function(){var t=new Array(arguments.length);if(!arguments.length)throw new Error(".match() must have argument");for(var e=0;e<arguments.length;e++){var n=arguments[e];if("function"==typeof n&&(n=new p(n)),!(n instanceof s))throw new Error("Wrong .match() argument");t[e]=n}return this.queue.push(new o(this,t)),this.boundBody},f.prototype.applyMode=function(t,e){if(t.length)throw new Error("Predicate should not have arguments but "+JSON.stringify(t)+" passed");return this.mode(e)},f.prototype.xjstOptions=function(t){return this.queue.push(new o(this,[new l(t)])),this.boundBody},["mode","elem","block"].forEach(function(t){f.prototype[t]=function(e){return this.match(new u("mode"===t?"_mode":t,e))}}),["mod","elemMod"].forEach(function(t){f.prototype[t]=function(e,n){return this.match(new u([t+"s",e],void 0===n||String(n)))}}),f.prototype.def=function(){return this.applyMode(arguments,"default")},["content","mix","bem","js","cls","attrs","tag","elemMods","mods"].forEach(function(t){f.prototype[t]=function(){return this.applyMode(arguments,t)}}),["appendContent","prependContent"].forEach(function(t){f.prototype[t]=function(){return this.content.apply(this,arguments).match(new a(t,this.refs))}}),["mods","elemMods","attrs","js","mix"].forEach(function(t){f.prototype["add"+m(t)]=function(){return this[t].apply(this,arguments).match(new a(t,this.refs))}}),f.prototype.wrap=function(){return this.def.apply(this,arguments).match(new r(this.refs))},f.prototype.replace=function(){return this.def.apply(this,arguments).match(new h(this.refs))},f.prototype.extend=function(){return this.def.apply(this,arguments).match(new c(this.refs))},f.prototype.oninit=function(t){this.initializers.push(t)}},{"./utils":10,inherits:11}],10:[function(t,e,n){function i(t){return"undefined"==typeof t||null===t||"number"==typeof t&&isNaN(t)}function s(){return v+ ++d}var o="&amp;",r="&lt;",h="&gt;",c="&quot;",a="&#39;",l=/[&<>]/;n.xmlEscape=function(t){if(i(t))return"";var e=""+t,n=l.exec(e);if(!n)return e;var s,c="",a=0,u=0;for(a=n.index;a<e.length;a++){switch(e.charCodeAt(a)){case 38:s=o;break;case 60:s=r;break;case 62:s=h;break;default:continue}u!==a&&(c+=e.substring(u,a)),u=a+1,c+=s}return u!==a?c+e.substring(u,a):c};var u=/["&]/;n.attrEscape=function(t){if(i(t))return"";var e=""+t,n=u.exec(e);if(!n)return e;var s,r="",h=0,a=0;for(h=n.index;h<e.length;h++){switch(e.charCodeAt(h)){case 34:s=c;break;case 38:s=o;break;default:continue}a!==h&&(r+=e.substring(a,h)),a=h+1,r+=s}return a!==h?r+e.substring(a,h):r};var p=/['&]/;n.jsAttrEscape=function(t){if(i(t))return"";var e=""+t,n=p.exec(e);if(!n)return e;var s,r="",h=0,c=0;for(h=n.index;h<e.length;h++){switch(e.charCodeAt(h)){case 38:s=o;break;case 39:s=a;break;default:continue}c!==h&&(r+=e.substring(c,h)),c=h+1,r+=s}return c!==h?r+e.substring(c,h):r},n.extend=function(t,e){if(!t||!e)return t||e;var n,i={};for(n in t)t.hasOwnProperty(n)&&(i[n]=t[n]);for(n in e)e.hasOwnProperty(n)&&(i[n]=e[n]);return i};var f={area:1,base:1,br:1,col:1,command:1,embed:1,hr:1,img:1,input:1,keygen:1,link:1,meta:1,param:1,source:1,wbr:1};n.isShortTag=function(t){return f.hasOwnProperty(t)},n.isSimple=function t(e){return!e||e===!0||(!(e.block||e.elem||e.tag||e.cls||e.attrs||!e.hasOwnProperty("html")||!t(e.html))||("string"==typeof e||"number"==typeof e))},n.isObj=function(t){return t&&"object"==typeof t&&!Array.isArray(t)&&null!==t};var d=0,m=+new Date,y="__"+m,v="uniq"+m;n.getUniq=s,n.identify=function(t,e){if(!t)return s();if(e||t[y])return t[y];var n=s();return t[y]=n,n},n.fnToString=function(t){return t?("function"==typeof t&&(t=t.toString(),t=t.replace(0===t.indexOf("function")?/^function\s*[^{]+{|}$/g:/^(_|\(\w|[^=>]+\))\s=>\s{|}$/g,"")),t):""};var x=/^[:\w.-]+$/;n.isUnquotedAttr=function(t){return t&&x.exec(t)}},{}],11:[function(t,e,n){"function"==typeof Object.create?e.exports=function(t,e){t.super_=e,t.prototype=Object.create(e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}})}:e.exports=function(t,e){t.super_=e;var n=function(){};n.prototype=e.prototype,t.prototype=new n,t.prototype.constructor=t}},{}]},{},[2])(2)}),e.exports||n.BEMHTML}({},{}),s=new i({elemJsInstances:!0});return s.compile(function(t,n,i,s,o,r,h,c,a,l,u,p,f,d,m,y,v,x,b,g,k,w,E,M,_,j,C,B,O,A,S,T){n("ua")(j()("script"),B()(!1),f()(["(function(e,c){",'e[c]=e[c].replace(/(ua_js_)no/g,"$1yes");','})(document.documentElement,"className");'])),n("page")(u("doctype")(function(){return{html:this.ctx.doctype||"<!DOCTYPE html>"}}),c()(function(){var t=this.ctx;return this._nonceCsp=t.nonce,[T("doctype"),{tag:"html",attrs:{lang:t.lang},cls:"ua_js_no",content:[{elem:"head",content:[{tag:"meta",attrs:{charset:"utf-8"}},t.uaCompatible===!1?"":{tag:"meta",attrs:{"http-equiv":"X-UA-Compatible",content:t.uaCompatible||"IE=edge"}},{tag:"title",content:t.title},{block:"ua",attrs:{nonce:t.nonce}},t.head,t.styles,t.favicon?{elem:"favicon",url:t.favicon}:""]},t]}]}),j()("body"),f()(function(){return[S(),this.ctx.scripts]}),i("head")(B()(!1),j()("head")),i("meta")(B()(!1),j()("meta")),i("link")(B()(!1),j()("link")),i("favicon")(B()(!1),j()("link"),y()(function(){return this.extend(S()||{},{rel:"shortcut icon",href:this.ctx.url})}))),n("page").elem("css")(B()(!1),j()("style"),t(function(){return this.ctx.url})(j()("link"),y()(function(){return this.extend(S()||{},{rel:"stylesheet",href:this.ctx.url})}))),n("page").elem("js")(B()(!1),j()("script"),y()(function(){var t={};return this.ctx.url?t.src=this.ctx.url:this._nonceCsp&&(t.nonce=this._nonceCsp),this.extend(S()||{},t)})),n("ua").content()(function(){return[S(),{html:["(function(d,n){","d.documentElement.className+=",'" ua_svg_"+(d[n]&&d[n]("http://www.w3.org/2000/svg","svg").createSVGRect?"yes":"no");','})(document,"createElementNS");'].join("")}]}),n("page").elem("conditional-comment")(j()(!1),f()(function(){var t=this.ctx,e=t.condition.replace("<","lt").replace(">","gt").replace("=","e"),n=e.indexOf("!")>-1,i=t.msieOnly===!1,s=n||i;return[{html:"<!--[if "+e+"]>"},i?{html:"<!"}:"",s?{html:"-->"}:"",S(),s?{html:"<!--"}:"",{html:"<![endif]-->"}]})),r(function(t,n){var i=t.BEMContext||n.BEMContext;i.prototype.require=function(t){return e[t]}})}),s.exportApply(n),n}var n=!0;"object"==typeof module&&"object"==typeof module.exports&&(exports.BEMHTML=e({}),n=!1),"object"==typeof modules&&(modules.define("BEMHTML",[],function(t){t(e({}))}),n=!1),n&&(BEMHTML=e({}),t.BEMHTML=BEMHTML)}("undefined"!=typeof window?window:"undefined"!=typeof global?global:this);