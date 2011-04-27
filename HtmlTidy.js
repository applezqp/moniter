(function(){

/*
 * HTML Parser By John Resig (ejohn.org)
 * //http://ejohn.org/apps/htmlparser/
 * Original code by Erik Arvidsson, Mozilla Public License
 * http://erik.eae.net/simplehtmlparser/simplehtmlparser.js
 *
 * // Use like so:
 * HTMLParser(htmlString, {
 *     start: function(tag, attrs, unary) {},
 *     end: function(tag) {},
 *     chars: function(text) {},
 *     comment: function(text) {}
 * });
 *
 * // or to get an XML string:
 * HTMLtoXML(htmlString);
 *
 * // or to get an XML DOM Document
 * HTMLtoDOM(htmlString);
 *
 * // or to inject into an existing document/DOM node
 * HTMLtoDOM(htmlString, document);
 * HTMLtoDOM(htmlString, document.body);
 *
 */


// Regular Expressions for parsing tags and attributes
var startTag = /^<(\w+)((?:\s+\w+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*(\/?)>/,
	endTag = /^<\/(\w+)[^>]*>/,
	attr = /(\w+)(?:\s*=\s*(?:(?:"((?:\\.|[^"])*)")|(?:'((?:\\.|[^'])*)')|([^>\s]+)))?/g;
	
// Empty Elements - HTML 4.01
var empty = makeMap("meta,area,base,basefont,br,col,frame,hr,img,input,isindex,link,meta,param,embed");

// Block Elements - HTML 4.01
var block = makeMap("address,applet,blockquote,button,center,dd,del,dir,div,dl,dt,fieldset,form,frameset,hr,iframe,ins,isindex,li,map,menu,noframes,noscript,object,ol,p,pre,script,table,tbody,td,tfoot,th,thead,tr,ul");

// Inline Elements - HTML 4.01
var inline = makeMap("a,abbr,acronym,applet,b,basefont,bdo,big,br,button,cite,code,del,dfn,em,font,i,iframe,img,input,ins,kbd,label,map,object,q,s,samp,script,select,small,span,strike,strong,sub,sup,textarea,tt,u,var");

// Elements that you can, intentionally, leave open
// (and which close themselves)
var closeSelf = makeMap("colgroup,dd,dt,li,options,p,td,tfoot,th,thead,tr");

// Attributes that have their values filled in disabled="disabled"
var fillAttrs = makeMap("checked,compact,declare,defer,disabled,ismap,multiple,nohref,noresize,noshade,nowrap,readonly,selected");

// Special Elements (can contain anything)
var special = makeMap("script,style");

var HTMLParser = this.HTMLParser = function( html, handler ) {
	var index, chars, match, stack = [], last = html, tid = 0;
	stack.last = function(){
		var len = this.length; 
		if (len == 0){
			return this[ len - 1 ];
		} else {
			return this[ len - 1 ][0];
		}
	};

	while ( html ) {
		chars = true;

		// Make sure we're not in a script or style element
		if ( !stack.last() || !special[ stack.last() ] ) {

			if ( html.indexOf("<!DOCTYPE") == 0) {
				if ( handler.doctype )
					handler.doctype(html);

				html = html.substring( html.indexOf("\n") )
				chars = false;
			// Comment
			} else if ( html.indexOf("<!--") == 0 ) {
				index = html.indexOf("-->");

				if ( index >= 0 ) {
					if ( handler.comment )
						handler.comment( html.substring( 4, index ) );
					html = html.substring( index + 3 );
					chars = false;
				}

			// end tag
			} else if ( html.indexOf("</") == 0 ) {
				match = html.match( endTag );

				if ( match ) {
					html = html.substring( match[0].length );
					match[0].replace( endTag, parseEndTag );
					chars = false;
				}

			// start tag
			} else if ( html.indexOf("<") == 0 ) {
				match = html.match( startTag );

				if ( match ) {
					html = html.substring( match[0].length );
					match[0].replace( startTag, parseStartTag );
					chars = false;
				}

			} else if ( html.indexOf("\n") == 0 ) {
				html = html.substring( html.indexOf("\n")+1 );
				chars = false;

				if ( handler.spelchars )
					handler.spelchars();
			}


			if ( chars ) {
				index = html.indexOf("<");
				
				var text = index < 0 ? html : html.substring( 0, index );
				html = index < 0 ? "" : html.substring( index );
				
				if ( handler.chars )
					handler.chars( text );
			}

		} else {
			html = html.replace(new RegExp("([\\s\\S]*?)<\/" + stack.last() + "[^>]*>").valueOf(), function(all, text){
				text = text.replace(/<!--(.*?)-->/g, "$1")
					.replace(/<!\[CDATA\[(.*?)]]>/g, "$1");

				if ( handler.chars )
					handler.chars( text );

				return "";
			});

			parseEndTag( "", stack.last() );
		}

		if ( html == last )
			throw "Parse Error: " + html;
		last = html;
	}
	
	// Clean up any remaining tags
	parseEndTag();

	function parseStartTag( tag, tagName, rest, unary ) {
		if ( block[ tagName ] ) {
			while ( stack.last() && inline[ stack.last() ] ) {
				parseEndTag( "", stack.last() );
			}
		}

		if ( closeSelf[ tagName ] && stack.last() == tagName ) {
			parseEndTag( "", tagName );
		}

		unary = empty[ tagName ] || !!unary;
		
		if ( handler.start ) {
			var attrs = [];
			tid++;	

			rest.replace(attr, function(match, name) {
				var value = arguments[2] ? arguments[2] :
					arguments[3] ? arguments[3] :
					arguments[4] ? arguments[4] :
					fillAttrs[name] ? name : "";
				
				attrs.push({
					name: name,
					value: value,
					escaped: value.replace(/(^|[^\\])"/g, '$1\\\"') //"
				});
			});

			handler.start( tagName, attrs, unary, tid);
		}

		if ( !unary )
			stack.push( [tagName, tid] );
	}

	function parseEndTag( tag, tagName ) {
		var ln, i, len, pos;
		// If no tag name is provided, clean shop
		if ( !tagName ){
			for (i = 0, len = stack.length; i<len; i++)
				data.tagClosedTid.push(stack[i][1]);
		} else {
			// Find the closest opened tag of the same type
			for ( pos = stack.length - 1; pos >= 0; pos-- )
				if ( stack[ pos ][0] == tagName )
					break;
		}
		
		if ( pos >= 0 ) {
			// Close all the open elements, up the stack
			var end = stack.length - 1;
			for ( var i = end; i >= pos; i-- ) {
				if ( handler.end )
					handler.end( stack[ i ][0] );
			
				if ( pos != end && pos != i) {
					data.tagClosedTid.push(stack[i][1]);
				}
			}

			// Remove the open elements from the stack
			stack.length = pos;
		} else if( pos < 0 ) {

		}
	}
};

this.HTMLtoXML = function( html ) {
	var results = "";
	
	HTMLParser(html, {
		start: function( tag, attrs, unary ) {
			results += "<" + tag;
	
			for ( var i = 0; i < attrs.length; i++ )
				results += " " + attrs[i].name + '="' + attrs[i].escaped + '"';
	
			results += (unary ? "/" : "") + ">";
		},
		end: function( tag ) {
			results += "</" + tag + ">";
		},
		chars: function( text ) {
			results += text;
		},
		comment: function( text ) {
			results += "<!--" + text + "-->";
		}
	});
	
	return results;
};

this.HTMLtoDOM = function( html, doc ) {
	// There can be only one of these elements
	var results = '',
		tid = 0;
	var one = makeMap("html,head,body,title");
	
	// Enforce a structure for the document
	var structure = {
		link: "head",
		base: "head"
	};

	if ( !doc ) {
		if ( typeof DOMDocument != "undefined" )
			doc = new DOMDocument();
		else if ( typeof document != "undefined" && document.implementation && document.implementation.createDocument )
			doc = document.implementation.createDocument("", "", null);
		else if ( window.ActiveXObject ) {
			var prefix = ["MSXML2", "Microsoft", "MSXML", "MSXML3"];
			for(var i=0; i < prefix.length; i++){
				try{
					doc  = new ActiveXObject(prefix[i] + ".DOMDocument");
					break;
				}catch(e){
					continue;
				}
			}
		}

	} else {

		doc = doc.ownerDocument ||
			doc.getOwnerDocument && doc.getOwnerDocument() ||
			doc;

	}
	
	var elems = [],
		documentElement = doc.documentElement ||
			doc.getDocumentElement && doc.getDocumentElement();
			
	// If we're dealing with an empty document then we
	// need to pre-populate it with the HTML document structure
	if ( !documentElement && doc.createElement ) (function(){
		var html = doc.createElement("html");
		var head = doc.createElement("head");
		head.appendChild( doc.createElement("title") );
		html.appendChild( head );
		html.appendChild( doc.createElement("body") );
		doc.appendChild( html );
	})();
	
	// Find all the unique elements
	if ( doc.getElementsByTagName )
		for ( var i in one )
			one[ i ] = doc.getElementsByTagName( i )[0];
	
	// If we're working with a document, inject contents into
	// the body element
	var curParentNode = one.body;
	
	HTMLParser( html, {
		start: function( tagName, attrs, unary, _tid) {
			results += "<" + tagName;
	
			for ( var i = 0; i < attrs.length; i++ )
				results += " " + attrs[i].name + '="' + attrs[i].escaped + '"';
	
			results += " data-ht" + '="' + _tid + '"';
			results += (unary ? "/" : "") + ">";

			// If it's a pre-built element, then we can ignore
			// its construction
			if ( one[ tagName ] ) {
				curParentNode = one[ tagName ];
				return;
			}
		
			var elem = doc.createElement( tagName );
			
			for ( var attr in attrs ) {
				if ( attrs[attr].name )
					elem.setAttribute( attrs[ attr ].name, attrs[ attr ].value );
			}
			elem.setAttribute( 'data-ht', _tid );

			if ( !curParentNode )
				curParentNode = one.body;
			
			if ( structure[ tagName ] && typeof one[ structure[ tagName ] ] != "boolean" )
				one[ structure[ tagName ] ].appendChild( elem );
			
			else if ( curParentNode && curParentNode.appendChild )
				curParentNode.appendChild( elem );
				
			if ( !unary ) {
				elems.push( elem );
				curParentNode = elem;
			}
		},
		end: function( tagName ) {
			results += "</" + tagName + ">";
			
			elems.length -= 1;
			
			// Init the new parentNode
			curParentNode = elems[ elems.length - 1 ];
		},
		spelchars: function() {
			results += "\n";
		},
		doctype: function(html) {
			results += html.substring(0, html.indexOf('\n'));
		},
		chars: function( text ) {
			results += text;
			if(curParentNode){
				if(curParentNode.nodeName.toLowerCase() == 'style' || curParentNode.nodeName.toLowerCase() == 'script')
					return;

				curParentNode.appendChild( doc.createTextNode( text ) );
			}
		},
		comment: function( text ) {
			// create comment node
			results += "<!--" + text + "-->";
		}
	});
	
	return {'doc': doc, 'html': results};
};

function makeMap(str){
	var obj = {}, items = str.split(",");
	for ( var i = 0; i < items.length; i++ )
		obj[ items[i] ] = true;
	return obj;
}


/*************************End*************************************/

/*
 *Utility
 *
 * */
function extend(){ 
	if (arguments[1]) {
		for (var key in arguments[1]) {
			arguments[0][key] = arguments[1][key];
		}
	}
	return arguments[0];
}
function ajax(option) {
	var xhr = false;
	try {
		xhr = new XMLHttpRequest();
	} catch(e) {
		try {
			xhr = new ActiveXObject("MSXML2.XMLHTTP");
		} catch (e) {
			try {
				xhr = new ActiveXObject("Microsoft.XMLHTTP");
			} catch (e) { xhr = false; }
		} 
	}
	if (!xhr) return;
	
	var opt = extend({
			'type': 'GET',
			'url': '',
			'async': true,
			'content': '',
			'success': null,
			'fail': null,
			'callback': null
		}, option || {});
	

	xhr.open (opt.type, opt.url, opt.async);
	if (opt.type == 'POST') {
		xhr.setRequestHeader('Content-type','application/x-www-form-urlencoded');
	}
	xhr.onreadystatechange = function() {

		if ( xhr.readyState == 4 ) {
			opt.callback && opt.callback(xhr.status);
			if ( xhr.status == 200 )
				opt.success && opt.success(xhr.responseText);
		} else {
			opt.fail && opt.fail();
		}
	}
	opt.type == 'POST' ? xhr.send(opt.content) : xhr.send(null);
}

function jsonp(url){
	var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url+ '&' + Math.random();
    script.charset = "UTF-8";
	var _head=document.getElementsByTagName("head")[0];
	_head.appendChild(script);
}
function each(ele, fun){
	var i=0, len=ele.length;
	if(!len) return;
	for(; i<len; i++){
		fun.call(ele[i], ele[i], i);
	}
}

function sendForm() {
	// var _form = document.createElement('form');
	//     _form.name = 'monitor';
	// 	_form.action = '';
	//     script.src = url+ '&' + Math.random();
	//     script.charset = "UTF-8";
	// 	var _head=document.getElementsByTagName("head")[0];
	// 	_head.appendChild(script);
	// 	
	// 	<form name="bankCardForm" id="bankCardForm" action="bankCardForm.htm" method="post">
	
};
function allTrue(arr) {
	if (arr.length == 0) {
		return true;
	}
	var r = false;
	for (var i = 0, l = arr.length; i < l; i++) {
		if (arr[i] != true) {
			r = false;
			break;
		}
		r = true;
	}
	return r;
}

function htmlEncode(str){
	var entities = {
            '<': '&lt;',
            '>': '&gt;'
        };
	return str.replace(/[<>]/g, function (m) { return entities[m]; });
}

function getLn(str){
	var pt_ln = /\n/gm;
	ln = str.split(pt_ln).length;
	return ln;
}

function elemLn(el){
	return getLn( data.htmlStr.substring( 0, data.htmlStr.indexOf( 'data-ht="' + el.getAttribute('data-ht') + '"') ) );
}

function tidLn(tid){
	return getLn( data.htmlStr.substring( 0, data.htmlStr.indexOf( 'data-ht="' + tid + '"') ) );
}

function getElementsByAttr(attrName, attrValue, node, tag) {
	var attrElem = [];
	if ( node == null )
		node = document;
	if ( tag == null )
		tag = '*';
	var els = node.getElementsByTagName(tag);
	var elsLen = els.length;
	for (i = 0, j = 0; i < elsLen; i++) {
		if ( els[i].getAttribute(attrName) == attrValue ) {
			attrElem[j] = els[i];
			j++;
		}
	}
	return attrElem;
}

function dup(arr){
	var r = [];
	var uni = [];
	var inUni = false;
	uni[0] = arr[0];
	for (var i = 1, l = arr.length; i < l; i++) {
		inUni = false;
		for (var j = 0, k = uni.length; j < k; j++) {
			if (arr[i] == uni[j]) {
				inUni = true;
				r.push(arr[i]);
				break;
			}
		}
		if (!inUni) {
			uni.push(arr[i]);
		}
	}
	return r;
};

/* 去除数组重复项 */
function unique (arr) {
	var uni = [], inUni = false;
	uni[0] = arr[0];
	for (var i = 1, l = arr.length; i < l; i++) {
		inUni = false;
		// 查看当前第i个arr内容是否已存在与uni数组中
		for (var j = 0, k = uni.length; j < k; j++) {
			if (arr[i] == uni[j]) {
				inUni = true;
				break;
			}
		}
		if (!inUni) {
			uni.push(arr[i]);
		}
	}
	return uni;
}
/*
 * object to string
 * 
 */
function obj2str(o){
    var r = [];
    if(typeof o =="string") return "\""+o.replace(/([\'\"\\])/g,"\\$1").replace(/(\n)/g,"\\n").replace(/(\r)/g,"\\r").replace(/(\t)/g,"\\t")+"\"";
    if(typeof o == "object"){
        if(!o.sort){
            for(var i in o)
                r.push(i+":"+obj2str(o[i]));
            if(!!document.all && !/^\n?function\s*toString\(\)\s*\{\n?\s*\[native code\]\n?\s*\}\n?\s*$/.test(o.toString)){
                r.push("toString:"+o.toString.toString());
            }
            r="{"+r.join()+"}"
        }else{
            for(var i =0;i<o.length;i++)
                r.push(obj2str(o[i]))
            r="["+r.join()+"]"
        }
        return r;
    }
    return o.toString();
}
/*******************End***************************/

var tidy = window.tidy = {};

var win = window, doc = document; 

var result = {
	/*
	 * 返回结果
	 * 
	 */
	url: '', 
	score: 100,
	errors: [],
	warnings: [],
	UserAgent:""
}, loaded = {
	html: false,
	js: [],
	css: []
}, url = {
	css: [],
	js: [],
	img: []
}, data = {
	url: '',
	html: '',
	htmlStr: '',
	doc: null,
	htmlArra:[],
	js: [],
	css: [],
	img: [],
	ln: 0,
	cssnum: 0,
	jsnum: 0,
	imgnum: 0,
	tagClosedTid:[]
};


tidy.getHtml = function(){
	ajax({
		url: data.url.split('#')[0],
		success: function(msg){
			data.html = msg;
			loaded.html = true;
		}
	});
}

tidy.getJs = function(){
	var scripts = doc.getElementsByTagName('script');
	each(scripts, function(o, i){
		url.js.push(o.src);
		data.jsnum ++;
	});
};

tidy.getCss = function(){
	var links = doc.getElementsByTagName('link');
	each(links, function(o, i){
		if(o.rel == 'stylesheet'){
			url.css.push(o.href);
			data.cssnum ++;
		}
	});
};

tidy.getImg = function(){
	var links = doc.getElementsByTagName('img');
	each(links, function(o, i){
		if(o.src){
			url.img.push(o.src);
			data.imgnum ++;
		}
	});

}

tidy.catchData = function(){
	result.url = data.url = win.location.href;

	tidy.getHtml();
	tidy.getJs();
	tidy.getCss();
	tidy.getImg();
		
};

tidy.parse = function(){
	data.htmlArra = data.html.split(/\n/gm);
	var startBody = /<body([^>]*)>/,
		match = data.html.match(startBody),
		r = HTMLtoDOM(data.html.substring(data.html.indexOf('<body')+match[0].length, data.html.indexOf('</body>'))),
		ln = data.html.substring(0, data.html.indexOf('<body')+match[0].length).match(/\n/g).length;
	data.ln = ln;
	data.htmlStr = r.html;
	data.doc = r.doc;
}


rulesScore = {
	doctypeNull: {score: 1, msg: 'doctype禁止为空'},
	doctypeErr: {score: 1, msg: 'doctype标签前禁止有非法字符'},
	
	// 编码检测
	htmlEncodeNull: {score: 2.5, msg: ' 文档编码未设置 '},
	htmlEncodeErr: {score: 2.5, msg: ' 文档编码请置于head的第一行 '},
	jsEncode: {score: 2.5, msg: ' js未指定编码 '},
	cssEncode: {score: 2.5, msg: ' css未指定编码 '},

	// 其他
	httpHttps: {score: 2, msg: ' 禁止引用了http资源 '},
	tagClosed: {score: 2, msg: ' 标签未闭合 '},
	noDupId: {score: 2.5, msg: ' 禁止使用重复id '},
	blockInline: {score: 2.5, msg: ' 禁止a, p, pre标签中添加块级标签 '},
	imgAlt: {score: 1.8, msg: ' 未指定alt属性 '},
	imgSize: {score: 1.8, msg: ' 未指定图片的尺寸 '},

	// 表单类检测
	formInForm: {score: 3.2, msg: ' 禁止form中嵌套form '},
	noSubmit: {score: 1.7, msg: ' form中没有submit '},
	moreSubmit: {score: 1.7, msg: ' form中submit超过一个 '},
	noIdSubmit: {score: 1.5, msg: ' id的值不能为"submit" '},
	noIdId: {score: 1.5, msg: ' id和name的值不能为"id" '},
	noLabel: {score: 2.3, msg: ' 该表单控件未添加对应label标签 '},
	
	// css 和 js 相关检测
	cssImport: {score: 2.7, msg: ' 禁止@import导入CSS '},
	stylePos: {score: 2.5, msg: ' style位置错误 '},
	jsInline: {score: 4.1, msg: ' 请不要使用inline js '},
	cssNum: {score: 1, msg: ' link 引用css外部 文件超过最大限制5 '},
	jsNum: {score: 1, msg: ' script 文件超过最大限制5 '}
};

tidy.checkRules = {
	checkDoctype: function(){	
		var r1 = /<!DOCTYPE/, r2 = /^<!DOCTYPE/, pass = true, ln = 1;
		if(!r1.test(data.html)){
			result.errors.push({
				'ln': ln,
				'code': htmlEncode(data.htmlArra[ln-1]),
				'msg': rulesScore['doctypeNull']['msg']
			});	
			result.score -= rulesScore['doctypeNull']['score'];
			pass = false;
		}

		if(pass && !r2.test(data.html)){
			result.errors.push({
				'ln': ln,
				'code': htmlEncode(data.htmlArra[ln-1]),
				'msg': rulesScore['doctypeErr']['msg']
			});	
			result.score -= rulesScore['doctypeErr']['score'];
		}
	},

	checkHtmlEncode: function(){
		var headstr = doc.getElementsByTagName('head')[0].innerHTML, 
			ln, pass = true;	
		headstr = headstr.replace(/^\s*/, '');
		if(!/<meta[^>]*charset/.test(headstr)){
			result.errors.push({
				'ln': '',
				'code': '',
				'msg': rulesScore['htmlEncodeNull']['msg']
			});	
			result.score -= rulesScore['htmlEncodeNull']['score'];
			pass = false;
		}
		
		if(pass && !/^<meta[^>]*charset/.test(headstr)){
			var sr = /(<meta[^>]*charset)/.exec(headstr);
			ln = getLn(data.html.substring(0, data.html.indexOf(sr[1])));
			result.errors.push({
				'ln': ln,
				'code': htmlEncode(data.htmlArra[ln-1]),
				'msg': rulesScore['htmlEncodeErr']['msg']
			});	
			result.score -= rulesScore['htmlEncodeErr']['score'];
		}
	},

	checkJsEncode: function(){
		var pass = true, ln,
			scripts = data.doc.getElementsByTagName('script');
		each(scripts, function(o, i){
			if(o.getAttribute('src') && !o.getAttribute('charset')){
				ln = data.ln + elemLn(o)
				result.errors.push({
					'ln': ln,
					'code': htmlEncode(data.htmlArra[ln-1]),
					'msg': rulesScore['jsEncode']['msg']
				});	
			}
		});	
		if (!pass){
			result.score -= rulesScore['jsEncode']['score'];
		}
	},

	checkCssEncode: function(){
		var pass = true, ln,
			links = doc.getElementsByTagName('link');
		each(links, function(o, i){
			if(o.getAttribute('href') && (o.getAttribute('rel') == 'stylesheet') && !o.getAttribute('charset')){
				ln = data.ln + elemLn(o)
				result.errors.push({
					'ln': ln,
					'code': htmlEncode(data.htmlArra[ln-1]),
					'msg': rulesScore['cssEncode']['msg']
				});	
			}
		});
		if (!pass){
			result.score -= rulesScore['cssEncode']['score'];
		}
	},

	checkHttpHttps: function(){
		if(!/^https/.test(win.location.href)){	
			return;
		}
		var tt = data.doc.getElementsByTagName('script').length;
		var num = 0, elems = [], ln,
			relate = ['iframe', 'img', 'embed'];
		each(relate, function(o, i){
			var tag = o;
			each(data.doc.getElementsByTagName(o), function(el, j){
				var v = el.getAttribute('src');
				if(!v || !/^\s*https:/.test(v)){
					num++;
					ln = data.ln + elemLn(el);
					result.errors.push({
						'ln': ln,
						'code': htmlEncode(data.htmlArra[ln-1]),
						'msg': rulesScore['httpHttps']['msg']
					});
				}
			});
		});
		if(num != 0){
			result.score -= rulesScore['httpHttps']['score'];
		}
	},
	
	checkTagClosed: function(){
		var ln, len = data.tagClosedTid.length;
		if ( len > 0 ){
			for(var i=0; i<len; i++){
				ln = data.ln + tidLn(data.tagClosedTid[i]);
				result.errors.push({
					'ln': ln,
					'code': htmlEncode(data.htmlArra[ln-1]),
					'msg': rulesScore['tagClosed']['msg']
				});
			}
			result.score -= rulesScore['tagClosed']['score'];
		}
	},

	checkNoDupId: function(){
		var ids = [], elems = [], ln;
		each(data.doc.getElementsByTagName('*'), function (o, i) {
			if (o.getAttribute('id')) {
				ids.push(o.getAttribute('id'));
			}
		});
		var dups = dup(ids);
		if (dups.length != 0) {
			//重复的id值
			var uid = unique(dups);
			each(uid, function (o, i) {
				elems = elems.concat(getElementsByAttr('id', o, data.doc.getElementsByTagName('body')[0]));
			});

			each(elems, function (el, i) {
				ln = data.ln + elemLn(el);
				result.errors.push({
					'ln' : ln,
					'code': htmlEncode(data.htmlArra[ln-1]),
					'msg': rulesScore['noDupId']['msg']
				});
			});
			result.score -= rulesScore['noDupId']['score'];
		}
	},
	checkBlockInline: function(){	
		var pass = true, 
			r1, r2, sr1, sr2;
		each(['a', 'p', 'pre'], function(o,i){
			var tag = o;
			for(var key in block){
				r1 = new RegExp("<" + tag + "\\s[^>]*>([\\s\\S]*?)<\\/" + tag + "[^>]*>", "g").valueOf(); 
				r2 = new RegExp("<" + key + "\\s([^>]*)>").valueOf();

				while ((sr1 = r1.exec(data.htmlStr)) != null) {
					if ((sr2 = r2.exec(sr1[1])) !=null) {
						ln = getLn(data.htmlStr.substring(0, data.htmlStr.indexOf(sr2[1]))) + data.ln;
						result.errors.push({
							'ln' : ln,
							'code' : htmlEncode(data.htmlArra[ln-1]),
							'msg' : rulesScore['blockInline']['msg']
						});
						pass = false;
					}
				}
			}
			
		});

		if (!pass) {
			result.score -= rulesScore['blockInline']['score'];
		}
	},
	checkImgAttr: function(){
		var pass1 = pass2 = 0, ln, code;
		each(data.doc.getElementsByTagName('img'), function (o,i) {
			if (!o.getAttribute('alt') || !o.getAttribute('width') || !o.getAttribute('height')) {
				ln = data.ln + elemLn(o);
				code = htmlEncode(data.htmlArra[ln-1])
				if(!o.getAttribute('alt')){
					pass1 = false;
					result.errors.push({
						'ln' : ln,
						'code': code,
						'msg': rulesScore['imgAlt']['msg']
					});

				} 
				if(!o.getAttribute('width') || !o.getAttribute('height') ){
					pass2 = false;
					result.errors.push({
						'ln' : ln,
						'code': code, 
						'msg': rulesScore['imgSize']['msg']
					});
				}
			}
		});
		if (!pass1) {
			result.score -= rulesScore['imgAlt']['score'];
		}
		if (!pass2) {
			result.score -= rulesScore['imgSize']['score'];
		}

	},

	checkFormInForm: function(){
		var pass = true, sr1, sr2, ln,
			r = /<form[^>]*>([\s\S]*?)<\/form>/g;

		while ((sr1 = r.exec(data.htmlStr)) != null) {
			if ( (sr2 = /<form([^>]*)>/.exec(sr1[1])) != null) {
				ln = getLn(data.htmlStr.substring(0, data.htmlStr.indexOf(sr2[1]))) + data.ln;
				result.errors.push({
					'ln' : ln,
					'code': htmlEncode(data.htmlArra[ln-1]),
					'msg': rulesScore['formInForm']['msg']
				});
				pass = false;
			}
		}
		if (!pass) {
			result.score -= rulesScore['formInForm']['score'];
		}
	},

	checkSubmitInForm: function(){
		var pass1 = pass2 = true,
			len, ln, code;
		each(data.doc.getElementsByTagName('form'), function (o,i) {
			len = getElementsByAttr('type', 'submit', o, 'input').length;
			if( (len!=1) || (len>1) ){
				ln = data.ln + elemLn(o);
				code = htmlEncode(data.htmlArra[ln-1]);

				if ( len!= 1) {
					result.errors.push({
						'ln' : ln,
						'code': code, 
						'msg': rulesScore['noSubmit']['msg']
					});
					pass1 = false;
				}
				if( len>1 ){
					result.errors.push({
						'ln' : ln,
						'code': code, 
						'msg': rulesScore['moreSubmit']['msg']
					});
					pass2 = false;
				}
			}
		});
		if (!pass1) {
			result.score -= rulesScore['noSubmit']['score'];
		}

		if (!pass2) {
			result.score -= rulesScore['moreSubmit']['score'];
		}
	},

	checkId: function(){
		var elems, ln, pass1 = true, pass2 = true;
		each(data.doc.getElementsByTagName('form'), function(o, i){
			elems = getElementsByAttr('id', 'id', o);
			if(elems.length > 0){
				each(elems, function(o, i){
					ln = data.ln + elemLn(o);
					result.errors.push({
						'ln' : ln,
						'code': htmlEncode(data.htmlArra[ln-1]),
						'msg': rulesScore['noIdId']['msg']
					});
				});
				pass1 = false;
			}
			elems = getElementsByAttr('id', 'submit', o);
			if(elems.length > 0){
				each(elems, function(o, i){
					ln = data.ln + elemLn(o);
					result.errors.push({
						'ln' : ln,
						'code': htmlEncode(data.htmlArra[ln-1]),
						'msg': rulesScore['noIdSubmit']['msg']
					});
				});
				pass2 = false;
			}
		});
		if(!pass1){
			result.score -= rulesScore['noIdId']['score'];
		}
		if(!pass2){
			result.score -= rulesScore['noIdSubmit']['score'];
		}
	}, 

	checkNoLabel: function(){
		var id, ln, pass = true;
		each(data.doc.getElementsByTagName('input'), function(o, i){
			if(o.getAttribute('type') == 'radio' || o.getAttribute('type') == 'checkbox'){
				id = o.getAttribute('id');	
				if ( !(o.parentNode.nodeName.toLowerCase() == 'label') 
					|| !(id && getElementsByAttr('id', id, o, 'label').length > 0) ) {
					ln = data.ln + elemLn(o);
					result.errors.push({
						'ln' : ln,
						'code': htmlEncode(data.htmlArra[ln-1]),
						'msg': rulesScore['noLabel']['msg']
					});
					pass = false;
				}
			}
		});

		if (!pass) {
			result.score -= rulesScore['noLabel']['score'];	
		}
	},

	checkCssImport: function(){
		var	r = /<style[^>]*>([\s\S]*?)<\/style>/g, 
			sr1, sr2, pass = true, ln;

		while ((sr1 = r.exec(data.htmlStr)) != null) {

			if ((sr2 = /@import(.*)/.exec(sr1[1])) != null){
				ln = getLn(data.htmlStr.substring(0, data.htmlStr.indexOf(sr2[1]))) + data.ln;
				result.errors.push({
					'ln' : ln,
					'code': htmlEncode(data.htmlArra[ln-1]),
					'msg': rulesScore['cssImport']['msg']
				});
				pass = false;
			}
		}
		if (!pass) {
			result.score -= rulesScore['cssImport']['score'];	
		}
	}, 

	checkStylePos: function(){
		var num = 0, eles = [], ln;
		each(data.doc.getElementsByTagName('style'), function (o,i) {
			if (o.parentNode.nodeName.toLowerCase() != 'head') {
				num++;
				eles.push(o);
			}
		});
		each(getElementsByAttr('rel', 'stylesheet', data.doc, 'link'), function (o,i) {
			if (o.parentNode.nodeName.toLowerCase() != 'head') {
				num++;
				eles.push(o);
			}
		});
		if (num > 0) {
			each(eles, function (o,i) {
				ln = data.ln + elemLn(o);
				result.errors.push({
					'ln' : ln,
					'code': htmlEncode(data.htmlArra[ln-1]),
					'msg': rulesScore['stylePos']['msg']
				});
			});
			result.score -= rulesScore['stylePos']['score'];
		}
	},
	
	checkJsInline: function(){
		var pass = true, ln, sr, r = /[^<]*(data-ht="\d+"\s)onclick[^>]*|[^<]*onclick[^>]*(data-ht="\d+")/g;
		while( (sr = r.exec(data.htmlStr)) !=null ){
			sr = sr[1] ? sr[1] : sr[2];
			ln = getLn(data.htmlStr.substring(0, data.htmlStr.indexOf(sr))) + data.ln;
			result.errors.push({
				'ln' : ln,
				'code': htmlEncode(data.htmlArra[ln-1]),
				'msg': rulesScore['jsInline']['msg']
			});
			pass = false;
		}
		if(!pass){
			result.score -= rulesScore['jsInline']['score'];
		}
	},

	checkcssNum: function(){
		if( data.cssnum > 5 ){
			result.errors.push({
				'ln' : '',
				'code': '',
				'msg': rulesScore['cssNum']['msg']
			});
			result.score -= rulesScore['cssNum']['score'];
		}
	},

	checkJsNum: function(){
		if( data.jsnum > 5 ){
			result.errors.push({
				'ln' : '',
				'code': '',
				'msg': rulesScore['jsNum']['msg']
			});
			result.score -= rulesScore['jsNum']['score'];
		}
	}

};

tidy.check = function(){
	var rules = tidy.checkRules;
	for(var r in rules){
		rules[r]();
	}
};

tidy.sendStatic = function(){
	
}

tidy.generateData = function(){
	result.js = data.js;
	result.css = data.css;
	result.img = data.img;
	/*ajax({
		url: MonitorResult.php,
		success: function(){
		},
		fail: function(){
		}
	});*/
	var str = '', o = null;

	for(var key in result){
		o = result[key];
		if( /url|score/.test(key) ){
			str += '<h3>' + key + ':' +  o + '</h3>';

		}else if( /errors|warnings/.test(key) ){
			str += '<h3>' + key + ':' + o.length + '</h3>';
			if(o.length != 0){
				for(var i=0, len=o.length; i<len; i++){
					str += '<p>Line ' + o[i].ln + ':"' + htmlEncode(o[i].code) + '"</p>';
					str += '<p>' + o[i].msg + '</p>';
				}
			}
		}
	}

	for( var key in url){
		o = url[key];
		str += '<h3>' + key + ':' + o.length + '</h3>';
		if(o.length != 0){
			for(var i=0, len=o.length; i<len; i++){
				str += '<p>' + o[i] +  '</p>';
			}
		}
	}
	
	doc.getElementById('MonitorResult').innerHTML = str;
	//tidy.sendResult(str);
};
tidy.sendResult=function(str) {
	/*
	 * tidyResult.gif 页面初次载入时,发送的数据
	 * 
	 * @params
	 * URL:"http://www.alipay.com/i.htm",
	 * A:user agent
	 * TE:{
	 * 	{id:12,ln:},
	 *  {},
	 *  {} 	
	 * }
	 * C:css urls
	 * J:js urls
	 * I:img urls
	 */
	var _sampleResult={
		URL:"http://www.alipay.com/i.htm",	//当前url
		A:"Mozilla 20110318052756 5.0 (Macintosh)", //user Agent
		TE:[ //tidy error校验规则
			{
				id:2,
				ln:56,
				code:"<div id='submit'></div>"
			},
			{
				id:5,
				ln:56,
				code:"<input type='text' id='id' />"
			},
			{
				id:1,
				ln:56,
				code:"<div id='submit'></div>"
			},
			{
				id:7,
				ln:56,
				code:"<div id='submit'></div>"
			},
			{
				id:2,
				ln:56,
				code:"<div id='submit'></div>"
			},
			{
				id:5,
				ln:56,
				code:"<input type='text' id='id' />"
			},
			{
				id:1,
				ln:56,
				code:"<div id='submit'></div>"
			},
			{
				id:7,
				ln:56,
				code:"<div id='submit'></div>"
			},
			{
				id:2,
				ln:56,
				code:"<div id='submit'></div>"
			},
			{
				id:5,
				ln:56,
				code:"<input type='text' id='id' />"
			},
			{
				id:1,
				ln:56,
				code:"<div id='submit'></div>"
			},
			{
				id:7,
				ln:56,
				code:"<div id='submit'></div>"
			}
		],
		C:url.css,
		J:url.js,
		I:url.img
	};
	console.log(compress(encodeURI(obj2str(_sampleResult))));
	console.log(_sampleResult);
	
	var _tUrl="http://ecmng.sit.alipay.net:7788/"+"?"+encodeURI(_sampleResult);
	console.log(_tUrl);
	
	if(true){
		//jsonp发送
		jsonp(_tUrl);
	}else{
		//form发送
		//sendForm(obj2str(_sampleResult));
	}
	
	
	/*
	 * ErrorResult 脚本异常时,发送的数据
	 *
	 * @params
	 * URL:location href
	 * UA:user agent
	 * msg:页面错误信息
	 * file:文件
	 * ln:错误行号
	 * id:identify this error
	 */
	
};


var initialize = false;
tidy.timer = null;
tidy.init = function(){
	if(initialize) return;
	initialize = true;

	tidy.catchData();
	tidy.sendStatic();
	tidy.timer = setInterval(function(){
		if( loaded.html ){
			clearInterval(tidy.timer);
			tidy.parse();
			tidy.check();	
			tidy.generateData();
			tidy.sendResult();
		}
	}, 100);	
}

tidy.init();

})()


