// 处理v-model，把数据绑定到value值上，并监听oninput事件
import { addHandler } from './events'

export function genModel (el, events, value, modifiers) {
  if (el.tag === 'select') {
    if (el.attrsMap.multiple != null) { // 同时选择多个选项
      return genMultiSelect(events, value, el)
    } else {
      return genSelect(events, value)
    }
  } else {
    switch (el.attrsMap.type) {
      case 'checkbox':
        return genCheckboxModel(events, value)
      case 'radio':
        return genRadioModel(events, value, el)
      default:
        return genDefaultModel(events, value)
    }
  }
}

// 解析checkbox
function genCheckboxModel (events, value) {
  addHandler(events, 'change', `${value}=$event.target.checked`)
  return `checked:!!(${value})`
}

// 解析radio
function genRadioModel (events, value, el) {
  addHandler(events, 'change', `${value}=$event.target.value`)
  return `checked:(${value}==${getInputValue(el)})`
}

// 解析基础input
function genDefaultModel (events, value) {
  addHandler(events, 'input', `${value}=$event.target.value`)
  return `value:(${value})`
}

// 解析select
function genSelect (events, value) {
  addHandler(events, 'change', `${value}=$event.target.value`)
  return `value:(${value})`
}

// 解析可多选的select 
function genMultiSelect (events, value, el) {
  addHandler(events, 'change', `${value}=Array.prototype.filter
    .call($event.target.options,function(o){return o.selected})
    .map(function(o){return o.value})`)
  // patch child options
  for (let i = 0; i < el.children.length; i++) {
    let c = el.children[i]
    if (c.tag === 'option') {
      c.props = `selected:(${value}).indexOf(${getInputValue(c)})>-1`
    }
  }
  return ''
}

function getInputValue (el) {
  return el.attrsMap.value
    ? JSON.stringify(el.attrsMap.value)
    : el.attrsMap['v-bind:value'] || el.attrsMap[':value']
}