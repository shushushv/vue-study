import { compile } from './compiler/index'
import { getOuterHTML, query } from './util/index'
import Component from './instance/index'

export default function Vue (options) {
  if (!options.render) {
		// 模版字符串 => AST语法树 => render函数
    if (options.template) {
      options.render = compile(options.template)
    } else if (options.el) {
      options.render = compile(getOuterHTML(query(options.el)))
    }
  }
  return new Component(options)
}