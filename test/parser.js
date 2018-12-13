const startTagOpen = /^<([\w\-]+)/,	// 开始标签头
	startTagClose = /^\s*(\/?)>/, // 开始标签尾
	attribute = /^\s*([^\s"'<>\/=]+)(?:\s*((?:=))\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/, // 标签属性
	endTag = /^<\/([\w\-]+)>/; // 结束标签

function parse (html) {
	let root // AST根节点
  let currentParent // 当前父节点
	let stack = [] // 节点栈
	
	HTMLParser(html, {
    // 处理开始标签
    start (tag, attrs, unary) {
      let element = {
        tag,
        attrs,
        attrsMap: attrs.reduce((cumulated, { name, value }) => { // [{name: 'class', value: 'xx'}, ...] => [{class: 'xx'}, ...]
					cumulated[name] = value || true;
					return cumulated;
				}, {}),
        parent: currentParent,
        children: []
      }
      // 初始化根节点
      if (!root) {
        root = element
      }
      // 有父节点，就把当前节点推入children数组
      if (currentParent) {
        currentParent.children.push(element)
      }
      // 不是自闭合标签
      // 进入当前节点内部遍历，故currentParent设为自身
      if (!unary) {
        currentParent = element
        stack.push(element)
      }
    },
    // 处理结束标签
    end () {
      // 出栈，重新赋值父节点
      stack.length -= 1
      currentParent = stack[stack.length - 1]
    },
    // 处理文本节点
    chars (text) {
      text = currentParent.tag === 'pre'
        ? text
        : text.trim() ? text : ' '
      currentParent.children.push(text)
    }
  })
  return root
}

function HTMLParser (html, handler) {
	var tagStack = [];														// 标签堆栈
	let index = 0;
	while (html) {
		var textEnd = html.indexOf('<');
		if (textEnd === 0) {
			// 匹配开始标签
			var startTagMatch = parseStartTag();
			if (startTagMatch) {
				handleStartTag(startTagMatch);
				continue;
			}
			// 匹配结束标签
			var endTagMatch = html.match(endTag);
			if (endTagMatch) {
				const curIndex = index;
				advance(endTagMatch[0].length);
				parseEndTag(endTagMatch[1], curIndex, index);
				continue;
			}
		}
		// 处理文本节点
		var text, rest, next;
		if (textEnd >= 0) {
			rest = html.slice(textEnd);
			while (
				!endTag.test(rest) &&
				!startTagOpen.test(rest)
			) {
				// 处理小于号等其他文本
				next = rest.indexOf('<', 1);
				if (next < 0) break;
				textEnd += next;
				rest = html.slice(textEnd);
			}
			text = html.substring(0, textEnd);
			advance(textEnd);
		}
		
		if (textEnd < 0) {
			text = html;
			html = '';
		}
		if (handler.chars) {
			handler.chars(text);
		}
	}

	// 截取html，更新index
	function advance (n) {
		index += n;
		html = html.substring(n);
	}

	// 匹配开始标签
	function parseStartTag () {
		var start = html.match(startTagOpen);
		if (start) {
			var match = {
				tagName: start[1],
				attrs: [],
				start: index
			};
			advance(start[0].length);
			var end, attr;
			// 未结束且匹配到标签属性
			while (!(end = html.match(startTagClose)) && (attr = html.match(attribute))) {
				advance(attr[0].length);
				match.attrs.push(attr);										// 添加属性
			}
			if (end) {
				advance(end[0].length);
				match.end = index;
				return match;
			}
		}
	}
	
	// 处理开始标签
	function handleStartTag (match) {
		var tagName = match.tagName;
		var unary = empty(tagName);
		var attrs = match.attrs.map(attr => {
			return {
				name: attr[1],
				value: attr[3] || attr[4] || attr[5] || ''
			};
		});
		// 不是自闭标签
		if (!unary) {
			tagStack.push({ tag: tagName, attrs: attrs});
		}
		if (handler.start) {
			handler.start(tagName, attrs, unary, match.start, match.end);
		}
	}
	
	// 匹配结束标签
	function parseEndTag (tagName, start, end) {
		var pos;
		if (start == null) start = index;
		if (end == null) end = index;
		if (tagName) {
			var needle = tagName.toLowerCase();
			// 找到结束标签在标签栈的位置
			for (pos = tagStack.length - 1; pos >= 0; pos--) {
				if (tagStack[pos].tag.toLowerCase() === needle) {
					break;
				}
			}
		}
		if (pos >= 0) {
			for (var i = tagStack.length - 1; i >= pos; i--) {
				if (handler.end) {
					handler.end(tagStack[i].tag, start, end);
				}
			}
			// 标签栈出栈
			tagStack.length = pos;
		}
	}
}

// 自闭合标签
// empty(tag) => boolean
var empty = makeMap('area,base,basefont,br,col,embed,frame,hr,img,input,isindex,keygen,link,meta,param,source,track,wbr');

function makeMap (values) {
	values = values.split(/,/);
	var map = {};
	values.forEach(function (value) {
		map[value] = 1;
	});
	return function (value) {
		return map[value.toLowerCase()] === 1;
	};
}

console.log(parse(
	`<div class="container">
	<span :class="{active: isActive}">{{this.msg}}</span>
	<ul>
		<li v-for="item in list">{{item + $index}}</li>
	</ul>
	<button @click="handle">change msg</button>
</div>`
));