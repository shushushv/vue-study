import { compile } from '../compiler/index'
import { observe } from '../observer/index'
import Watcher from '../observer/watcher'
import { h, patch } from '../vdom/index'
import { nextTick, isReserved, getOuterHTML } from '../util/index'

export default function Component (options) {
  this.$options = options
  this._data = options.data
  const el = this._el = document.querySelector(options.el)
  // 模版字符串 => AST语法树 => render函数
  const render = compile(getOuterHTML(el))

  this._el.innerHTML = ''

  // data 数据代理：this._data.xx => this.xx
  Object.keys(options.data).forEach(key => proxy(this, key))
  // methods 方法代理
  if (options.methods) {
    Object.keys(options.methods).forEach(key => {
      this[key] = options.methods[key].bind(this)
    })
  }

  // 添加观察者，数据劫持
  this._ob = observe(options.data)
  this._watchers = []
  this._watcher = new Watcher(this, render, this._update)
  this._update(this._watcher.value)
}

Component.prototype._update = function (vtree) {
  if (!this._tree) {
    patch(this._el, vtree)
  } else {
    patch(this._tree, vtree)
  }
  this._tree = vtree
}

// dara代理
function proxy (vm, key) {
  if (!isReserved(key)) {
    Object.defineProperty(vm, key, {
      configurable: true,   // 是否可删除，默认false
      enumerable: true,   // 是否可枚举，默认为false
      get: function proxyGetter () {
        return vm._data[key]
      },
      set: function proxySetter (val) {
        vm._data[key] = val
      }
    })
  }
}

Component.prototype.__h__ = h
Component.nextTick = nextTick
