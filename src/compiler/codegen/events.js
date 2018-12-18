import { isArray } from '../../util/index'

const simplePathRE = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\['.*?'\]|\[".*?"\]|\[\d+\]|\[[A-Za-z_$][\w$]*\])*$/

/**
 * @description 添加事件
 * @param {Object} events 事件对象
 * @param {String} name 属性名
 * @param {String} value 事件值
 */
export function addHandler (events, name, value) {
	const handlers = events[name]
	if (isArray(handlers)) {
		handlers.push(value)
	} else if (handlers) {
		events[name] = [handlers, value]
	} else {
		events[name] = value
	}
}

/**
 * @description 解析事件对象
 * @param {Object} events 事件对象	
 * 				eg: {'click': 'handle', 'input': 'number + 1', ...}
 * @returns {String}
 */
export function genEvents (events) {
	let res = 'on:{'
	for (var name in events) {
		res += `"${name}":${genHandler(events[name])},`
	}
	return res.slice(0, -1) + '}'
}

/**
 * @description 处理事件
 * @param {Array/String} value 事件（方法名/js代码）
 */
function genHandler (value) {
	// TODO support modifiers
	if (!value) {
		return `function(){}`
	} else if (isArray(value)) {
		return `[${value.map(genHandler).join(',')}]`
	} else if (simplePathRE.test(value)) {
		return value
	} else {
		return `function($event){${value}}`
	}
}