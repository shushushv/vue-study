import { toArray } from '../util/index'

export function initEvents (vm) {
	vm._events = Object.create(null)
}

export function eventsMixin (Vue) {
  Vue.prototype.$on = function (event, fn) {
    (this._events[event] || (this._events[event] = []))
      .push(fn)
    return this
  }

  /**
   * 监听一个自定义事件，但是只触发一次，在第一次触发之后移除监听器。
   *
   * @param {String} event
   * @param {Function} fn
   */

  Vue.prototype.$once = function (event, fn) {
    var self = this
    function on () {
      self.$off(event, on)
      fn.apply(this, arguments)
    }
    on.fn = fn
    this.$on(event, on)
    return this
  }

  /**
   * 移除自定义事件监听器。
   * - 如果没有提供参数，则移除所有的事件监听器；
   * - 如果只提供了事件，则移除该事件所有的监听器；
   * - 如果同时提供了事件与回调，则只移除这个回调的监听器。
   * @param {String} event
   * @param {Function} fn
   */

  Vue.prototype.$off = function (event, fn) {
    var cbs
    // 所有
    if (!arguments.length) {
      this._events = Object.create(null)
      return this
    }
    // 指定事件
    cbs = this._events[event]
    if (!cbs) {
      return this
    }
    if (arguments.length === 1) {
      this._events[event] = null
      return this
    }
    // 指定事件与回调
    var cb
    var i = cbs.length
    while (i--) {
      cb = cbs[i]
      if (cb === fn || cb.fn === fn) {
        cbs.splice(i, 1)
        break
      }
    }
    return this
  }

  /**
   * 触发当前实例上的事件
   *
   * @param {String} event
   */

  Vue.prototype.$emit = function (event) {
    var cbs = this._events[event]
    if (cbs) {
      cbs = cbs.length > 1 ? toArray(cbs) : cbs
      var args = toArray(arguments, 1)
      for (var i = 0, l = cbs.length; i < l; i++) {
        cbs[i].apply(this, args)
      }
    }
  }
}