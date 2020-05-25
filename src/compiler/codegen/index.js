import { genHandlers, addHandler } from './on'
import { genModel } from './model'
import { genClass } from './class'
import {
  checkSVG,
  parseText,
  parseModifiers,
  removeModifiers,
  getAndRemoveAttr
} from './helpers'

const dirRE = /^v-|^@|^:/
const bindRE = /^:|^v-bind:/
const onRE = /^@|^v-on:/
// 以下属性为特殊属性
const mustUsePropsRE = /^(value|selected|checked|muted)$/

/**
 * @description 解析AST语法树为render函数
 * @param {Object} ast AST语法树对象
 * @returns {Function} render函数
 */
export function generate (ast) {
  // 从根节点（容器节点）开始解析
  const code = ast ? genElement(ast) : '__h__("div")'
  return new Function(`with (this) { return ${code}}`)
}

// 元素节点解析
function genElement (el, key) {
  if (el['for']) { // 解析v-for指令
    return genFor(el)
  } else if (el['if']) { // 解析v-if指令
    return genIf(el, key)
  } else if (el.tag === 'template') { // 解析子组件
    return genChildren(el)
  } else if (el.tag === 'render') {
    return genRender(el)
  } else {
    return `__h__('${el.tag}', ${genData(el, key)}, ${genChildren(el)})`
  }
}

// 解析v-if指令
function genIf (el, key) {
	const exp = el['if'];
	el['if'] = false;
  return `(${exp}) ? ${genElement(el, key)} : null`
}

// 解析v-for指令
function genFor (el) {
	const exp = el['for'];
  const alias = el.alias;
  console.log(exp, alias);
	el['for'] = false; // avoid recursion
  return `(${exp}) && (${exp}).map(function (${alias}, $index) {return ${genElement(el)}})`
}

// 属性解析
function genData (el, key) {
  if (!el.attrs.length && !key) {
    return '{}'
  }
  let data = '{'
  let attrs = 'attrs:{'
  let props = 'props:{'
  let events = {}
  let hasAttrs = false
  let hasProps = false
  let hasEvents = false

  // key
  if (key) {
    data += `key:${key},`
  }

  // check SVG namespace.
  // this has the side effect of marking all children if the tag itself is <svg>
  if (checkSVG(el)) {
    data += 'svg:true,'
  }

  // class
  // do it before other attributes becaues it removes static class
  // and class bindings from the element
  data += genClass(el)
  
  // parent elements my need to add props to children
  // e.g. select
  if (el.props) {
    hasProps = true
    props += el.props + ','
  }

  // 遍历解析其他属性
  for (let i = 0, l = el.attrs.length; i < l; i++) {
    let attr = el.attrs[i]
    let name = attr.name
    let value = attr.value

    // 处理指令
    if (dirRE.test(name)) { 
      // 事件修饰符（.stop/.prevent/.self）
      const modifiers = parseModifiers(name)
      name = removeModifiers(name)

      if (bindRE.test(name)) {  // v-bind
        name = name.replace(bindRE, '')
        if (name === 'style') {
          data += `style: ${value},`
        } else if (mustUsePropsRE.test(name)) {
          hasProps = true
          props += `"${name}": (${value}),`
        } else {
          hasAttrs = true
          attrs += `"${name}": (${value}),`
        }
      } else if (onRE.test(name)) { // v-on
        hasEvents = true
        name = name.replace(onRE, '')
        addHandler(events, name, value, modifiers)
      } else if (name === 'v-model') { // v-model
        hasProps = hasEvents = true
        props += genModel(el, events, value, modifiers) + ','
      } else {
        // TODO: normal directives
      }
    } else { // 处理普通属性
      hasAttrs = true
      attrs += `"${name}": (${JSON.stringify(attr.value)}),`
    }
  }
  if (hasAttrs) {
    data += attrs.slice(0, -1) + '},'
  }
  if (hasProps) {
    data += props.slice(0, -1) + '},'
  }
  if (hasEvents) {
    data += genHandlers(events) // 事件解析
  }
  return data.replace(/,$/, '') + '}'
}

// 解析子节点
function genChildren (el) {
  if (!el.children.length) {
    return 'undefined'
  }
  return '[' + el.children.map(genNode).join(',') + ']'
}

// 节点解析
function genNode (node) {
  if (node.tag) {
    return genElement(node)
  } else {
    return genText(node)
  }
}

// 文本节点解析
function genText (text) {
  if (text === ' ') {
    return '" "'
  } else {
    const exp = parseText(text)
    if (exp) {
      return `(${exp}==null?'':String(${exp}))`
    } else {
      return JSON.stringify(text)
    }
  }
}

function genRender (el) {
  const method = el.attrsMap.method
  const args = el.attrsMap.args
  if (process.env.NODE_ENV !== 'production' && !method) {
    console.error('method attribute is required on <render>.')
    return 'undefined'
  }
  return `${method}(${args})`
}