/**
 * @description 获取属性值
 * @param {Object} el AST对象
 * @param {String} attr 属性名
 * @returns
 */
export function getAndRemoveAttr (el, attr) {
	let val
	// 如果属性存在，则从AST对象的attrs和attrsMap移除
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

const modifierRE = /\.[^\.]+/g

// 获取事件修饰符
export function parseModifiers (name) {
  const match = name.match(modifierRE)
  if (match) {
    const ret = {}
    match.forEach(m => { ret[m.slice(1)] = true })
    return ret
  }
}

// 删除事件修饰符
export function removeModifiers (name) {
  return name.replace(modifierRE, '')
}

// 文本解析
// eg： "hi,{{name}}!" => "hi,"+(msg)+"!"
const tagRE = /\{\{((?:.|\\n)+?)\}\}/g
export function parseText (text) {
  if (!tagRE.test(text)) {
    return null
  }
  var tokens = []
  var lastIndex = tagRE.lastIndex = 0
  var match, index
  while ((match = tagRE.exec(text))) { // 循环解析 {{}}
    index = match.index
    // 把 '{{' 之前的文本推入
    if (index > lastIndex) {
      tokens.push(JSON.stringify(text.slice(lastIndex, index)))
    }
    // 把{{}}中间数据取出推入
    tokens.push('(' + match[1].trim() + ')')
    lastIndex = index + match[0].length
  }
  if (lastIndex < text.length) {
    tokens.push(JSON.stringify(text.slice(lastIndex)))
  }
  return tokens.join('+')
}

// this map covers SVG elements that can appear as template root nodes
const svgMap = {
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

export function checkSVG (el) {
  if (el.tag === 'svg') {
    // recursively mark all children as svg
    markSVG(el)
  }
  return el.svg || svgMap[el.tag]
}

function markSVG (el) {
  el.svg = true
  if (el.children) {
    for (var i = 0; i < el.children.length; i++) {
      if (el.children[i].tag) {
        markSVG(el.children[i])
      }
    }
  }
}