import HTMLParser from './html-parser'

const dirRE = /^v-|^@|^:/
const bindRE = /^:|^v-bind:/
const onRE = /^@|^v-on:/
const modifierRE = /\.[^\.]+/g
const mustUsePropsRE = /^(value|selected|checked|muted)$/

// this map covers SVG elements that can appear as template root nodes
const svgMap = {
  svg: 1,
  g: 1,
  defs: 1,
  symbol: 1,
  use: 1,
  image: 1,
  text: 1,
  circle: 1,
  ellipse: 1,
  line: 1,
  path: 1,
  polygon: 1,
  polyline: 1,
  rect: 1
}


/**
 * html字符串 转成 AST对象
 *
 * @param {String} html
 * @return {Object}
 */

export function parse (html, preserveWhiteSpace) {
  let root // AST根节点
  let currentParent // 当前父节点
	let stack = [] // 节点栈
	let inSvg = false
  let svgIndex = -1
  HTMLParser(html, {
    html5: true,
    // 处理开始标签
    start (tag, attrs, unary) {
      let element = {
        tag,
        attrs,
        attrsMap: makeAttrsMap(attrs),
        parent: currentParent,
        children: []
			}
			// check svg
      if (inSvg) {
        element.svg = true
      } else if (svgMap[tag]) {
        element.svg = true
        inSvg = true
        svgIndex = stack.length
      }

      processControlFlow(element)
      processClassBinding(element)
      processStyleBinding(element)
      processAttributes(element)

      // 初始化根节点
      if (!root) {
        root = element
      } else if (process.env.NODE_ENV !== 'production' && !stack.length) {
        console.error(
          'Component template should contain exactly one root element:\n\n' + html
        )
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
			if (inSvg && stack.length <= svgIndex) {
        inSvg = false
        svgIndex = -1
      }
    },
    // 处理文本节点
    chars (text) {
      if (!currentParent) {
        if (process.env.NODE_ENV !== 'production' && !root) {
          console.error(
            'Component template should contain exactly one root element:\n\n' + html
          )
        }
        return
      }
      text = currentParent.tag === 'pre'
        ? text
        : text.trim()
        ? text
        : preserveWhiteSpace
          ? ' '
          : null
      if (text) {
        currentParent.children.push(text)
      }
    }
  })
  return root
}

function processControlFlow (el) {
  let exp
  if ((exp = getAndRemoveAttr(el, 'v-for'))) {
    el['for'] = exp
    if ((exp = getAndRemoveAttr(el, 'track-by'))) {
      el.key = exp
    }
  }
  if ((exp = getAndRemoveAttr(el, 'v-if'))) {
    el['if'] = exp
  }
}

function processClassBinding (el) {
  el['class'] = getAndRemoveAttr(el, 'class')
  el.classBinding =
    getAndRemoveAttr(el, ':class') ||
    getAndRemoveAttr(el, 'v-bind:class')
}

function processStyleBinding (el) {
  el.styleBinding =
    getAndRemoveAttr(el, ':style') ||
    getAndRemoveAttr(el, 'v-bind:style')
}

function processAttributes (el) {
  for (let i = 0; i < el.attrs.length; i++) {
    let name = el.attrs[i].name
    let value = el.attrs[i].value
    if (dirRE.test(name)) {
      name = name.replace(dirRE, '')
      // modifiers
      const modifiers = parseModifiers(name)
      if (modifiers) {
        name = name.replace(modifierRE, '')
      }
      if (bindRE.test(name)) { // v-bind
        name = name.replace(bindRE, '')
        if (mustUsePropsRE.test(name)) {
          (el.props || (el.props = [])).push({ name, value })
        } else {
          (el.attrBindings || (el.attrBindings = [])).push({ name, value })
        }
      } else if (onRE.test(name)) { // v-on
        name = name.replace(onRE, '')
        addHandler((el.events || (el.events = {})), name, value, modifiers)
      } else { // normal directives
        (el.directives || (el.directives = [])).push({
          name,
          value,
          modifiers
        })
      }
    }
  }
}

function parseModifiers (name) {
  const match = name.match(modifierRE)
  if (match) {
    const ret = {}
    match.forEach(m => { ret[m.slice(1)] = true })
    return ret
  }
}

function makeAttrsMap (attrs) {
  const map = {}
  for (let i = 0, l = attrs.length; i < l; i++) {
    map[attrs[i].name] = attrs[i].value
  }
  return map
}

function getAndRemoveAttr (el, attr) {
  let val
  if ((val = el.attrsMap[attr])) {
    el.attrsMap[attr] = null
    for (let i = 0, l = el.attrs.length; i < l; i++) {
      if (el.attrs[i].name === attr) {
        el.attrs.splice(i, 1)
        break
      }
    }
  }
  return val
}

function addHandler (events, name, value, modifiers) {
  // check capture modifier
  if (modifiers && modifiers.capture) {
    delete modifiers.capture
    name = '!' + name // mark the event as captured
  }
  const newHandler = { value, modifiers }
  const handlers = events[name]
  if (Array.isArray(handlers)) {
    handlers.push(newHandler)
  } else if (handlers) {
    events[name] = [handlers, newHandler]
  } else {
    events[name] = newHandler
  }
}
