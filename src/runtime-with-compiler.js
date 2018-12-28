import config from './runtime/config'
import { compile } from './compiler/index'
import { getOuterHTML, extend, query } from './runtime/util/index'
import Instance from './runtime/index'

export default function Vue (options) {
  if (!options.render) {
    const template = options.template || getOuterHTML(query(options.el))
		// 模版字符串 => AST语法树 => render函数
    options.render = compile(template, config.preserveWhiteSpace)
  }
  return new Instance(options)
}

extend(Vue, Instance)