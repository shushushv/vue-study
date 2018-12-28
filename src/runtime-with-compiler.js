import config from './runtime/config'
import { compile } from './compiler/index'
import { getOuterHTML, extend, query, warn } from './runtime/util/index'
import Vue from './runtime/index'

const mount = Vue.prototype.$mount

Vue.prototype.$mount = function (el) {
  const options = this.$options
  // 模版字符串 => AST语法树 => render函数
  if (!options.render) {
    let template = options.template
    if (template) {
      if (typeof template === 'string') {
        if (template.charAt(0) === '#') {
          template = query(template).innerHTML
        }
      } else if (template.nodeType) {
        template = template.innerHTML
      } else {
        warn('invalid template option:' + template, this)
      }
    } else {
      template = getOuterHTML(query(el))
    }
    options.render = compile(template, config.preserveWhiteSpace)
  }
  mount.call(this, el)
}

Vue.compile = compile

export default Vue