var BH=function(){function t(){this._lastMatchId=0,this._matchers=[],this._infiniteLoopDetection=!1,this.lib={},this._inited=!1,this._options={},this._optJsAttrName="onclick",this._optJsAttrIsJs=!0,this._optEscapeContent=!1,this.utils={_expandoId:(new Date).getTime(),bh:this,isSimple:function(t){if(!t||t===!0)return!0;var e=typeof t;return"string"===e||"number"===e},extend:function(t){t&&"object"==typeof t||(t={});for(var e=1,n=arguments.length;n>e;e++){var s,o=arguments[e];if(o)for(s in o)t[s]=o[s]}return t},position:function(){var t=this.node;return"content"===t.index?1:t.position},isFirst:function(){var t=this.node;return"content"===t.index||1===t.position},isLast:function(){var t=this.node;return"content"===t.index||t.position===t.arr._listLength},tParam:function(t,e,n){var s="__tp_"+t,o=this.node;if(arguments.length>1)return(n||!o.hasOwnProperty(s))&&(o[s]=e),this;for(;o;){if(o.hasOwnProperty(s))return o[s];o=o.parentNode}return void 0},apply:function(t){var e=this.ctx,n=this.node,s=this.bh.processBemJson(t,e.block);return this.ctx=e,this.node=n,s},applyBase:function(){var t=this.node,e=t.json;!e.elem&&e.mods&&(e.blockMods=e.mods);var n=e.block,s=e.blockMods,o=this.bh._fastMatcher(this,e);return void 0!==o&&(this.ctx=t.arr[t.index]=t.json=o,t.blockName=n,t.blockMods=s),this},stop:function(){return this.ctx._stop=!0,this},generateId:function(){return"uniq"+this._expandoId+ ++e},mod:function(t,e,n){var s;return arguments.length>1?(s=this.ctx.mods||(this.ctx.mods={}),s[t]=!s.hasOwnProperty(t)||n?e:s[t],this):(s=this.ctx.mods,s?s[t]:void 0)},mods:function(t,e){var n=this.ctx.mods||(this.ctx.mods={});return void 0!==t?(this.ctx.mods=e?this.extend(n,t):this.extend(t,n),this):n},tag:function(t,e){return void 0!==t?(this.ctx.tag=void 0===this.ctx.tag||e?t:this.ctx.tag,this):this.ctx.tag},mix:function(t,e){return void 0!==t?(this.ctx.mix=e?t:this.ctx.mix?Array.isArray(this.ctx.mix)?this.ctx.mix.concat(t):[this.ctx.mix].concat(t):t,this):this.ctx.mix},attr:function(t,e,n){var s;return arguments.length>1?(s=this.ctx.attrs||(this.ctx.attrs={}),s[t]=!s.hasOwnProperty(t)||n?e:s[t],this):(s=this.ctx.attrs,s?s[t]:void 0)},attrs:function(t,e){var n=this.ctx.attrs||{};return void 0!==t?(this.ctx.attrs=e?this.extend(n,t):this.extend(t,n),this):n},bem:function(t,e){return void 0!==t?(this.ctx.bem=void 0===this.ctx.bem||e?t:this.ctx.bem,this):this.ctx.bem},js:function(t,e){return void 0!==t?(this.ctx.js=e?t===!0?{}:t:t?this.extend(this.ctx.js,t):this.ctx.js,this):this.ctx.js},cls:function(t,e){return void 0!==t?(this.ctx.cls=void 0===this.ctx.cls||e?t:this.ctx.cls,this):this.ctx.cls},param:function(t,e,n){return void 0!==e?(this.ctx[t]=void 0===this.ctx[t]||n?e:this.ctx[t],this):this.ctx[t]},content:function(t,e){return arguments.length>0?(this.ctx.content=void 0===this.ctx.content||e?t:this.ctx.content,this):this.ctx.content},html:function(t,e){return arguments.length>0?(this.ctx.html=void 0===this.ctx.html||e?t:this.ctx.html,this):this.ctx.html},json:function(){return this.ctx}}}var e=0;t.prototype={setOptions:function(t){var e;for(e in t)this._options[e]=t[e];return t.jsAttrName&&(this._optJsAttrName=t.jsAttrName),t.jsAttrScheme&&(this._optJsAttrIsJs="js"===t.jsAttrScheme),t.escapeContent&&(this._optEscapeContent=t.escapeContent),this},getOptions:function(){return this._options},enableInfiniteLoopDetection:function(t){return this._infiniteLoopDetection=t,this},apply:function(t){return this.toHtml(this.processBemJson(t))},match:function(t,e){if(!t)return this;if(Array.isArray(t))return t.forEach(function(n,s){this.match(t[s],e)},this),this;if("object"==typeof t){for(var n in t)this.match(n,t[n]);return this}return e.__id="__func"+this._lastMatchId++,this._matchers.push([t,e]),this._fastMatcher=null,this},buildMatcher:function(){function t(t,e){for(var n={},s=0,o=t.length;o>s;s++){var i=t[s],r=i[e]||"__no_value__";(n[r]||(n[r]=[])).push(i)}return n}var e,n,s,o,i,r,c,a,h=[],l=["bh = this"],u=this._matchers,m=[];for(e=u.length-1;e>=0;e--)r=u[e],i=r[0],l.push("_m"+e+" = ms["+e+"][1]"),o={fn:r[1],index:e},~i.indexOf("__")?(c=i.split("__"),a=c[0].split("_"),o.block=a[0],a.length>1&&(o.blockMod=a[1],o.blockModVal=a[2]||!0),c=c[1].split("_"),o.elem=c[0],c.length>1&&(o.elemMod=c[1],o.elemModVal=c[2]||!0)):(c=i.split("_"),o.block=c[0],c.length>1&&(o.blockMod=c[1],o.blockModVal=c[2]||!0)),m.push(o);var p=t(m,"block");h.push("var "+l.join(", ")+";"),h.push("function applyMatchers(ctx, json) {"),h.push("var subRes;"),h.push("switch (json.block) {");for(var d in p){h.push('case "'+d+'":');var f=t(p[d],"elem");h.push("switch (json.elem) {");for(var b in f){h.push("__no_value__"===b?"case undefined:":'case "'+b+'":');var _=f[b];for(n=0,s=_.length;s>n;n++){o=_[n];var x=o.fn,g=[];g.push("!json."+x.__id),o.elemMod&&g.push('json.mods && json.mods["'+o.elemMod+'"] === '+(o.elemModVal===!0||'"'+o.elemModVal+'"')),o.blockMod&&g.push('json.blockMods["'+o.blockMod+'"] === '+(o.blockModVal===!0||'"'+o.blockModVal+'"')),h.push("if ("+g.join(" && ")+") {"),h.push("json."+x.__id+" = true;"),h.push("subRes = _m"+o.index+"(ctx, json);"),h.push('if (subRes !== undefined) { return (subRes || "") }'),h.push("if (json._stop) return;"),h.push("}")}h.push("return;")}h.push("}"),h.push("return;")}return h.push("}"),h.push("};"),h.push("return applyMatchers;"),h.join("\n")},processBemJson:function(t,e,n){function s(){this.ctx=null}if(null!=t){this._inited||this._init();var o,i,r,c,a,h,l,u,m,p,d=[t],f=[{json:t,arr:d,index:0,blockName:e,blockMods:!t.elem&&t.mods||{}}],b=this._fastMatcher||(this._fastMatcher=Function("ms",this.buildMatcher())(this._matchers)),_=!n,x=this._infiniteLoopDetection;s.prototype=this.utils;for(var g=new s;o=f.shift();){if(i=o.json,r=o.blockName,c=o.blockMods,Array.isArray(i)){for(a=0,h=0,l=i.length;l>a;a++)m=i[a],m!==!1&&null!=m&&"object"==typeof m&&f.push({json:m,arr:i,index:a,position:++h,blockName:r,blockMods:c,parentNode:o});i._listLength=h}else{var v,k=!1;if(i.elem?(r=i.block=i.block||r,c=i.blockMods=i.blockMods||c,i.elemMods&&(i.mods=i.elemMods)):i.block&&(r=i.block,c=i.blockMods=i.mods||{}),i.block){if(x){if(i.__processCounter=(i.__processCounter||0)+1,b.__processCounter=(b.__processCounter||0)+1,i.__processCounter>100)throw new Error('Infinite json loop detected at "'+i.block+(i.elem?"__"+i.elem:"")+'".');if(b.__processCounter>1e3)throw new Error('Infinite matcher loop detected at "'+i.block+(i.elem?"__"+i.elem:"")+'".')}p=void 0,i._stop||(g.node=o,g.ctx=i,p=b(g,i),void 0!==p&&(i=p,o.json=i,o.blockName=r,o.blockMods=c,f.push(o),k=!0))}if(!k&&_&&(v=i.content))if(Array.isArray(v)){var y;do{for(y=!1,a=0,l=v.length;l>a;a++)if(Array.isArray(v[a])){y=!0;break}y&&(i.content=v=v.concat.apply([],v))}while(y);for(a=0,h=0,l=v.length,u=l-1;l>a;a++)m=v[a],m!==!1&&null!=m&&"object"==typeof m&&f.push({json:m,arr:v,index:a,position:++h,blockName:r,blockMods:c,parentNode:o});v._listLength=h}else f.push({json:v,arr:i,index:"content",blockName:r,blockMods:c,parentNode:o})}o.arr[o.index]=i}return d[0]}},toHtml:function(t){var e,r,c,a;if(t===!1||null==t)return"";if("object"!=typeof t)return this._optEscapeContent?s(t):t;if(Array.isArray(t)){for(e="",r=0,c=t.length;c>r;r++)a=t[r],a!==!1&&null!=a&&(e+=this.toHtml(a));return e}var h=t.bem!==!1;if("undefined"!=typeof t.tag&&!t.tag)return t.html||t.content?this.toHtml(t.content):"";t.mix&&!Array.isArray(t.mix)&&(t.mix=[t.mix]);var l,u,m,p="",d="",f=!1;if(l=t.attrs)for(r in l)u=l[r],null!==u&&void 0!==u&&(d+=" "+r+'="'+o(u)+'"');if(h){var b=t.block+(t.elem?"__"+t.elem:"");t.block&&(p=i(t,b),t.js&&((m={})[b]=t.js===!0?{}:t.js));var _=m&&!t.elem,x=t.mix;if(x&&x.length)for(r=0,c=x.length;c>r;r++){var g=x[r];if(g&&g.bem!==!1){var v=g.block||t.block||"",k=g.elem||(g.block?null:t.block&&t.elem),y=v+(k?"__"+k:"");v&&(p+=i(g,y,b),g.js&&((m=m||{})[y]=g.js===!0?{}:g.js,f=!0,_||(_=v&&!k)))}}if(m){_&&(p+=" i-bem");var j=f||t.js!==!0?o(JSON.stringify(m)):"{&quot;"+b+"&quot;:{}}";d+=" "+(t.jsAttr||this._optJsAttrName)+'="'+(this._optJsAttrIsJs?"return "+j:j)+'"'}}t.cls&&(p=p?p+" "+t.cls:t.cls);var M,A=t.tag||"div";if(e="<"+A+(p?' class="'+o(p)+'"':"")+(d?d:""),n[A])e+="/>";else{if(e+=">",t.html)e+=t.html;else if(null!=(M=t.content))if(Array.isArray(M))for(r=0,c=M.length;c>r;r++)a=M[r],a!==!1&&null!=a&&(e+=this.toHtml(a));else e+=this.toHtml(M);e+="</"+A+">"}return e},_init:function(){this._inited=!0,"undefined"!=typeof BEM&&"undefined"!=typeof BEM.I18N&&(this.lib.i18n=this.lib.i18n||BEM.I18N)}},t.prototype.processBemjson=t.prototype.processBemJson;var n={area:1,base:1,br:1,col:1,command:1,embed:1,hr:1,img:1,input:1,keygen:1,link:1,menuitem:1,meta:1,param:1,source:1,track:1,wbr:1},s=t.prototype.xmlEscape=function(t){return(t+"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")},o=t.prototype.attrEscape=function(t){return(t+"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")},i=function(t,e,n){var s,o,i,r="";if(n!==e&&(n&&(r+=" "),r+=e),s=t.mods||t.elem&&t.elemMods)for(i in s)o=s[i],(o||0===o)&&(r+=" "+e+"_"+i+(o===!0?"":"_"+o));return r};return t}();"undefined"!=typeof module&&(module.exports=BH);var bh=new BH;bh.setOptions({jsAttrName:"data-bem",jsAttrScheme:"json"}),bh.match("i-bem__i18n",function(t,e){if(!e)return"";var n=e.keyset,s=e.key,o=e.params||{};return n||s?(("undefined"==typeof e.content||null!==e.content)&&(o.content=bh.apply(e.content)),bh.lib.i18n(n,s,o)):""}),bh.match("page",function(t,e){return t.tag("body").tParam("nonceCsp",e.nonce).content([t.content(),e.scripts],!0),[e.doctype||"<!DOCTYPE html>",{tag:"html",cls:"ua_js_no",content:[{elem:"head",content:[{tag:"meta",attrs:{charset:"utf-8"}},e.uaCompatible===!1?"":{tag:"meta",attrs:{"http-equiv":"X-UA-Compatible",content:e.uaCompatible||"IE=edge"}},{tag:"title",content:e.title},{block:"ua",attrs:{nonce:e.nonce}},e.head,e.styles,e.favicon?{elem:"favicon",url:e.favicon}:""]},e]}]}),bh.match("page__head",function(t){t.bem(!1).tag("head")}),bh.match("page__meta",function(t){t.bem(!1).tag("meta")}),bh.match("page__link",function(t){t.bem(!1).tag("link")}),bh.match("page__favicon",function(t,e){t.bem(!1).tag("link").attr("rel","shortcut icon").attr("href",e.url)}),bh.match("page",function(t,e){t.mix({block:"ua",js:!0}).tParam("zoom",e.zoom)}),bh.match("page__head",function(t,e){t.applyBase().content([e.content,{elem:"meta",attrs:{name:"viewport",content:"width=device-width,"+(t.tParam("zoom")?"initial-scale=1":"maximum-scale=1,initial-scale=1,user-scalable=0")}},{elem:"meta",attrs:{name:"format-detection",content:"telephone=no"}},{elem:"link",attrs:{name:"apple-mobile-web-app-capable",content:"yes"}}],!0)}),bh.match("ua",function(t){t.bem(!1).tag("script").content(["(function(e,c){",'e[c]=e[c].replace(/(ua_js_)no/g,"$1yes");','})(document.documentElement,"className");'],!0)}),bh.match("ua",function(t){t.js(!0)}),bh.match("page__css",function(t,e){t.bem(!1),e.url?t.tag("link").attr("rel","stylesheet").attr("href",e.url):t.tag("style")}),bh.match("page__js",function(t,e){var n=t.tParam("nonceCsp");t.bem(!1).tag("script"),e.url?t.attr("src",e.url):n&&t.attr("nonce",n)}),bh.match("ua",function(t,e){t.applyBase(),t.content([e.content,"(function(d,n){","d.documentElement.className+=",'" ua_svg_"+(d[n]&&d[n]("http://www.w3.org/2000/svg","svg").createSVGRect?"yes":"no");','})(document,"createElementNS");'],!0)}),bh.match("page__icon",function(t,e){t.content([e.src16&&{elem:"link",attrs:{rel:"shortcut icon",href:e.src16}},e.src114&&{elem:"link",attrs:{rel:"apple-touch-icon-precomposed",sizes:"114x114",href:e.src114}},e.src72&&{elem:"link",attrs:{rel:"apple-touch-icon-precomposed",sizes:"72x72",href:e.src72}},e.src57&&{elem:"link",attrs:{rel:"apple-touch-icon-precomposed",href:e.src57}}],!0)}),module.exports=bh;