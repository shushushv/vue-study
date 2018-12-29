import { initState, stateMixin } from './state'
import { initRender, renderMixin } from './render'
import { initEvents, eventsMixin } from './events'
import { initLifecycle, lifecycleMixin, callHook } from './lifecycle'
import { nextTick, mergeOptions } from '../util/index'

let uid = 0

export default function Vue (options) {
  this._uid = uid++
  this._isVue = true

  this.$parent = options && options.parent
  this.$root = this.$parent ? this.$parent.$root : this
  this.$children = []
  this.$refs = {}
  this.$els = {}

  this.$options = mergeOptions(
    this.constructor.options,
    options || {},
    this
  )

  initLifecycle(this)
  initEvents(this)
  callHook(this, 'init')
  initState(this)
  callHook(this, 'created')
  initRender(this)
}

stateMixin(Vue)
eventsMixin(Vue)
lifecycleMixin(Vue)
renderMixin(Vue)

Vue.prototype.$nextTick = function (fn) {
  nextTick(fn, this)
}