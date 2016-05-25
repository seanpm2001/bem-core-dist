!function(t){var e=function(){function t(){this._lastMatchId=0,this._matchers=[],this._infiniteLoopDetection=!1,this.lib={},this._shortTags={};for(var t=0;t<s.length;t++)this._shortTags[s[t]]=1;this._options={},this._optJsAttrName="onclick",this._optJsAttrIsJs=!0,this._optJsCls="i-bem",this._optJsElem=!0,this._optEscapeContent=!1,this._optNobaseMods=!1,this._optDelimElem="__",this._optDelimMod="_",this.utils={_expandoId:(new Date).getTime(),bh:this,isSimple:function(t){if(!t||t===!0)return!0;var e=typeof t;return"string"===e||"number"===e},extend:function(t){t&&"object"==typeof t||(t={});for(var e=1,s=arguments.length;s>e;e++){var o,n=arguments[e];if(n)for(o in n)t[o]=n[o]}return t},position:function(){var t=this.node;return"content"===t.index?1:t.position},isFirst:function(){var t=this.node;return"content"===t.index||1===t.position},isLast:function(){var t=this.node;return"content"===t.index||t.position===t.arr._listLength},tParam:function(t,e,s){var o="__tp_"+t,n=this.node;if(arguments.length>1)return!s&&n.hasOwnProperty(o)||(n[o]=e),this;for(;n;){if(n.hasOwnProperty(o))return n[o];n=n.parentNode}},process:function(t){var e=this.ctx,s=this.node,o=this.bh.processBemJson(t,e.block);return this.ctx=e,this.node=s,o},applyBase:function(){var t=this.node,e=t.json,s=e.block,o=e.mods,n=this.bh._fastMatcher(this,e);return void 0!==n&&(this.ctx=t.arr[t.index]=t.json=n,t.block=s,t.mods=o),this},stop:function(){return this.ctx._stop=!0,this},generateId:function(){return"uniq"+this._expandoId+ ++e},mod:function(t,e,s){var o=this.ctx.elem?"elemMods":"mods";if(arguments.length>1){var n=this.ctx[o];return n[t]=!n.hasOwnProperty(t)||s?e:n[t],this}return this.ctx[o][t]},mods:function(t,e){var s=this.ctx.elem?"elemMods":"mods",o=this.ctx[s];return void 0!==t?(this.ctx[s]=e?this.extend(o,t):this.extend(t,o),this):o},tag:function(t,e){return void 0===t?this.ctx.tag:((e||void 0===this.ctx.tag)&&(this.ctx.tag=t),this)},mix:function(t,e){return void 0===t?this.ctx.mix:(this.ctx.mix=e||!this.ctx.mix?t:(Array.isArray(this.ctx.mix)?this.ctx.mix:[this.ctx.mix]).concat(t),this)},attr:function(t,e,s){var o;return arguments.length>1?(o=this.ctx.attrs||(this.ctx.attrs={}),o[t]=!o.hasOwnProperty(t)||s?e:o[t],this):(o=this.ctx.attrs,o?o[t]:void 0)},attrs:function(t,e){var s=this.ctx.attrs||{};return void 0===t?s:(this.ctx.attrs=e?this.extend(s,t):this.extend(t,s),this)},bem:function(t,e){return void 0===t?this.ctx.bem:((e||void 0===this.ctx.bem)&&(this.ctx.bem=t),this)},js:function(t,e){var s=this.ctx;return void 0===t?s.js:(e||void 0===s.js?s.js=t:s.js!==!1&&(s.js=this.extend(s.js,t)),this)},cls:function(t,e){return void 0===t?this.ctx.cls:((e||void 0===this.ctx.cls)&&(this.ctx.cls=t),this)},param:function(t,e,s){return void 0===e?this.ctx[t]:((s||void 0===this.ctx[t])&&(this.ctx[t]=e),this)},content:function(t,e){return void 0===t?this.ctx.content:((e||void 0===this.ctx.content)&&(this.ctx.content=t),this)},html:function(t,e){return void 0===t?this.ctx.html:((e||void 0===this.ctx.html)&&(this.ctx.html=t),this)},json:function(){return this.ctx}}}var e=0;t.prototype={setOptions:function(t){var e;for(e in t)this._options[e]=t[e];if(t.jsAttrName&&(this._optJsAttrName=t.jsAttrName),t.jsAttrScheme&&(this._optJsAttrIsJs="js"===t.jsAttrScheme),void 0!==t.jsCls&&(this._optJsCls=t.jsCls),t.hasOwnProperty("jsElem")&&(this._optJsElem=t.jsElem),t.clsNobaseMods&&(this._optNobaseMods=!0),t.escapeContent&&(this._optEscapeContent=t.escapeContent),t.delimElem&&(this._optDelimElem=t.delimElem),t.delimMod&&(this._optDelimMod=t.delimMod),t.shortTags)for(var s=0;s<t.shortTags.length;s++)this._shortTags[t.shortTags[s]]=1;return this},getOptions:function(){return this._options},enableInfiniteLoopDetection:function(t){return this._infiniteLoopDetection=t,this},apply:function(t){return this.toHtml(this.processBemJson(t))},match:function(t,e){if(!t)return this;if(Array.isArray(t))return t.forEach(function(s,o){this.match(t[o],e)},this),this;if("object"==typeof t){for(var s in t)this.match(s,t[s]);return this}return e.__id="__func"+this._lastMatchId++,this._matchers.push([t,e]),this._fastMatcher=null,this},beforeEach:function(t){return this.match("$before",t)},afterEach:function(t){return this.match("$after",t)},buildMatcher:function(){function t(t,e){for(var s={},o=0,n=t.length;n>o;o++){var i=t[o],r=i[e]||"__no_value__";(s[r]||(s[r]=[])).push(i)}return s}function e(t,e,s){t.push("json."+e+" = true;","subRes = _m"+s+"(ctx, json);",'if (subRes !== undefined) return (subRes || "");',"if (json._stop) return;")}var s,o,n,i,r,c,a,h,l=[],u=["bh = this"],m=this._matchers,f=[];for(s=m.length-1;s>=0;s--)c=m[s],r=c[0],u.push("_m"+s+" = ms["+s+"][1]"),i={fn:c[1],index:s},~r.indexOf(this._optDelimElem)?(a=r.split(this._optDelimElem),h=a[0].split(this._optDelimMod),i.block=h[0],h.length>1&&(i.blockMod=h[1],i.blockModVal=h[2]||!0),a=a[1].split(this._optDelimMod),i.elem=a[0],a.length>1&&(i.elemMod=a[1],i.elemModVal=a[2]||!0)):(a=r.split(this._optDelimMod),i.block=a[0],a.length>1&&(i.blockMod=a[1],i.blockModVal=a[2]||!0)),f.push(i);var p=t(f,"block"),d=p.$before,_=p.$after;if(_&&delete p.$after,l.push("var "+u.join(", ")+";","function applyMatchers(ctx, json) {","var subRes;"),d)for(delete p.$before,o=0,n=d.length;n>o;o++)i=d[o],e(l,i.fn.__id,i.index);l.push("switch (json.block) {");for(var b in p){l.push('case "'+b+'":');var v=t(p[b],"elem");l.push("switch (json.elem) {");for(var g in v){"__no_value__"===g?l.push("case undefined:"):l.push('case "'+g+'":');var x=v[g];for(o=0,n=x.length;n>o;o++){i=x[o];var j=i.fn,y=[];y.push("!json."+j.__id),i.elemMod&&y.push('json.elemMods && json.elemMods["'+i.elemMod+'"] === '+(i.elemModVal===!0||'"'+i.elemModVal+'"')),i.blockMod&&y.push('json.mods && json.mods["'+i.blockMod+'"] === '+(i.blockModVal===!0||'"'+i.blockModVal+'"')),l.push("if ("+y.join(" && ")+") {"),e(l,j.__id,i.index),l.push("}")}l.push("break;")}l.push("}","break;")}if(l.push("}"),_)for(o=0,n=_.length;n>o;o++)i=_[o],e(l,i.fn.__id,i.index);return l.push("};","return applyMatchers;"),l.join("\n")},processBemJson:function(t,e,s){function o(){this.ctx=null}if(null!=t){var n,i,r,c,a,h,l,u,m,f,p=[t],d=[{json:t,arr:p,index:0,block:e,mods:null}],_=this._fastMatcher||(this._fastMatcher=Function("ms",this.buildMatcher())(this._matchers)),b=!s,v=this._infiniteLoopDetection;o.prototype=this.utils;for(var g=new o;n=d.shift();){if(i=n.json,r=n.block,c=n.mods,Array.isArray(i)){for(a=0,h=0,l=i.length;l>a;a++)m=i[a],m!==!1&&null!=m&&"object"==typeof m&&d.push({json:m,arr:i,index:a,position:++h,block:r,mods:c,parentNode:n});i._listLength=h}else{var x,j=!1;if(i.elem?(r=i.block=i.block||r,i.elemMods||(i.elemMods=i.mods||{},i.mods=null),c=i.mods=i.mods||c):i.block&&(r=i.block,c=i.mods=i.mods||{}),"object"==typeof i){if(v){if(i.__processCounter=(i.__processCounter||0)+1,_.__processCounter=(_.__processCounter||0)+1,i.__processCounter>100)throw new Error('Infinite json loop detected at "'+i.block+(i.elem?this._optDelimElem+i.elem:"")+'".');if(_.__processCounter>1e3)throw new Error('Infinite matcher loop detected at "'+i.block+(i.elem?this._optDelimElem+i.elem:"")+'".')}f=void 0,i._stop||(g.node=n,g.ctx=i,f=_(g,i),void 0!==f&&(i=f,n.json=i,n.block=r,n.mods=c,d.push(n),j=!0))}if(!j&&b&&(x=i.content))if(Array.isArray(x)){var y;do{for(y=!1,a=0,l=x.length;l>a;a++)if(Array.isArray(x[a])){y=!0;break}y&&(i.content=x=x.concat.apply([],x))}while(y);for(a=0,h=0,l=x.length,u=l-1;l>a;a++)m=x[a],m!==!1&&null!=m&&"object"==typeof m&&d.push({json:m,arr:x,index:a,position:++h,block:r,mods:c,parentNode:n});x._listLength=h}else d.push({json:x,arr:i,index:"content",block:r,mods:c,parentNode:n})}n.arr[n.index]=i}return p[0]}},toHtml:function(t){this._buf="",this._html(t);var e=this._buf;return delete this._buf,e},_html:function(t){var e,s,c;if(t!==!1&&null!=t)if("object"!=typeof t)this._buf+=this._optEscapeContent?o(t):t;else if(Array.isArray(t))for(e=0,s=t.length;s>e;e++)c=t[e],c!==!1&&null!=c&&this._html(c);else{if(t.toHtml){var a=t.toHtml.call(this,t)||"";return void(this._buf+=a)}var h=t.bem!==!1;if("undefined"!=typeof t.tag&&!t.tag)return void(t.html?this._buf+=t.html:this._html(t.content));t.mix&&!Array.isArray(t.mix)&&(t.mix=[t.mix]);var l,u,m,f="",p="",d=!1;if(l=t.attrs)for(e in l)u=l[e],u===!0?p+=" "+e:u!==!1&&null!==u&&void 0!==u&&(p+=" "+e+'="'+n(u)+'"');if(h){var _=t.block+(t.elem?this._optDelimElem+t.elem:"");t.block&&(f=r(t,_,null,this._optNobaseMods,this._optDelimMod),t.js&&((m={})[_]=t.js===!0?{}:t.js));var b=this._optJsCls&&(this._optJsElem||!t.elem),v=t.mix;if(v&&v.length)for(e=0,s=v.length;s>e;e++){var g=v[e];if(g&&g.bem!==!1){var x=g.block||t.block||"",j=g.elem||(g.block?null:t.block&&t.elem),y=x+(j?this._optDelimElem+j:"");x&&(f+=r(g,y,_,this._optNobaseMods,this._optDelimMod),g.js&&((m=m||{})[y]=g.js===!0?{}:g.js,d=!0,b||(b=x&&this._optJsCls&&(this._optJsElem||!j))))}}if(m){b&&(f+=" "+this._optJsCls);var M=d||t.js!==!0?i(JSON.stringify(m)):'{"'+_+'":{}}';p+=" "+(t.jsAttr||this._optJsAttrName)+"='"+(this._optJsAttrIsJs?"return "+M:M)+"'"}}t.cls&&(f=(f?f+" ":"")+n(t.cls).trim());var k=t.tag||"div";this._buf+="<"+k+(f?' class="'+f+'"':"")+(p?p:""),this._shortTags[k]?this._buf+="/>":(this._buf+=">",t.html?this._buf+=t.html:this._html(t.content),this._buf+="</"+k+">")}}};var s="area base br col command embed hr img input keygen link menuitem meta param source track wbr".split(" "),o=t.prototype.xmlEscape=function(t){return(t+"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")},n=t.prototype.attrEscape=function(t){return(t+"").replace(/&/g,"&amp;").replace(/"/g,"&quot;")},i=t.prototype.jsAttrEscape=function(t){return(t+"").replace(/&/g,"&amp;").replace(/'/g,"&#39;")},r=function(t,e,s,o,n){var i,r,c,a="";if(s!==e&&(s&&(a+=" "),a+=e),i=t.elem&&t.elemMods||t.mods)for(c in i)r=i[c],(r||0===r)&&(a+=" "+(o?n:e+n)+c+(r===!0?"":n+r));return a};return t}();"undefined"!=typeof module&&(module.exports=e);var s=new e;s.setOptions({jsAttrName:"data-bem",jsAttrScheme:"json"});var o=function(t,e){!function(){s.match("ua",function(t){t.bem(!1).tag("script").content(["(function(e,c){",'e[c]=e[c].replace(/(ua_js_)no/g,"$1yes");','})(document.documentElement,"className");'],!0)})}(),function(){s.match("page",function(t,e){return t.tag("body").tParam("nonceCsp",e.nonce).content([t.content(),e.scripts],!0),[e.doctype||"<!DOCTYPE html>",{tag:"html",cls:"ua_js_no",content:[{elem:"head",content:[{tag:"meta",attrs:{charset:"utf-8"}},e.uaCompatible===!1?"":{tag:"meta",attrs:{"http-equiv":"X-UA-Compatible",content:e.uaCompatible||"IE=edge"}},{tag:"title",content:e.title},{block:"ua",attrs:{nonce:e.nonce}},e.head,e.styles,e.favicon?{elem:"favicon",url:e.favicon}:""]},e]}]}),s.match("page__head",function(t){t.bem(!1).tag("head")}),s.match("page__meta",function(t){t.bem(!1).tag("meta")}),s.match("page__link",function(t){t.bem(!1).tag("link")}),s.match("page__favicon",function(t,e){t.bem(!1).tag("link").attr("rel","shortcut icon").attr("href",e.url)})}(),function(){s.match("page__css",function(t,e){t.bem(!1),e.url?t.tag("link").attr("rel","stylesheet").attr("href",e.url):t.tag("style")})}(),function(){s.match("page__css",function(t,e){if(e.hasOwnProperty("ie")){var s=e.ie;if(s===!0){var o=e.url;return[6,7,8,9].map(function(t){return{elem:"css",url:o+".ie"+t+".css",ie:"IE "+t}})}var n=s?"!IE"===s?[s,"<!-->","<!--"]:[s,"",""]:["gt IE 9","<!-->","<!--"];return["<!--[if "+n[0]+"]>"+n[1],e,n[2]+"<![endif]-->"]}})}(),function(){s.match("page__js",function(t,e){var s=t.tParam("nonceCsp");t.bem(!1).tag("script"),e.url?t.attr("src",e.url):s&&t.attr("nonce",s)})}(),function(){s.match("ua",function(t,e){t.applyBase(),t.content([e.content,"(function(d,n){","d.documentElement.className+=",'" ua_svg_"+(d[n]&&d[n]("http://www.w3.org/2000/svg","svg").createSVGRect?"yes":"no");','})(document,"createElementNS");'],!0)})}(),function(){s.match("page__conditional-comment",function(t,e){t.tag(!1);var s=e.condition.replace("<","lt").replace(">","gt").replace("=","e"),o=s.indexOf("!")>-1,n=e.msieOnly===!1,i=o||n;return["<!--[if "+s+"]>",n?"<!":"",i?"-->":"",e,i?"<!--":"","<![endif]-->"]})}()},n=!0;"object"==typeof modules?(modules.define("BH",[],function(t){o(),t(s)}),modules.define("bh",["BH"],function(t){t(s)}),modules.define("BEMHTML",["BH"],function(t){t(s)}),n=!1):"object"==typeof exports&&(o(),s.bh=s,s.BEMHTML=s,module.exports=s,n=!1),n&&(o(),t.BH=s,t.bh=s,t.BEMHTML=s)}("undefined"!=typeof window?window:global);