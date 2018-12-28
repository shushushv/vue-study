import Watcher from '../../observer/watcher'
import Dep from '../../observer/dep'
import { observe } from '../../observer/index'

import {
  warn,
  hasOwn,
  isReserved,
  isPlainObject,
  bind
} from '../../util/index'

export default function (Vue) {
  // 建立`$data`属性访问器，因为设置`$data`需要观察新对象和更新代理属性。
  Object.defineProperty(Vue.prototype, '$data', {
    get () {
      return this._data
    },
    set (newData) {
      if (newData !== this._data) {
        this._setData(newData)
      }
    }
  })

  /**
   * 实例状态初始化：
   *  - 数据劫持
   *  - 计算属性
   *  - 自定义方法
   */

  Vue.prototype._initState = function () {
    this._initMethods()
    this._initData()
    this._initComputed()
  }

  /**
   * 初始化data
   */

  Vue.prototype._initData = function () {
		var data = this.$options.data
		// 兼容函数形式和对象形式的data
    data = this._data = typeof data === 'function'
      ? data()
      : data || {}
    if (!isPlainObject(data)) {
      data = {}
      process.env.NODE_ENV !== 'production' && warn(
        'data functions should return an object.',
        this
      )
    }
    // 循环代理数据
    var keys = Object.keys(data)
    var i = keys.length
    while (i--) {
      this._proxy(keys[i])
    }
    // 添加观察者，数据劫持
    observe(data, this)
  }

  /**
	 * 在`$data`被设置（setter）时调用，替换实例的`$data`属性
   *
   * @param {Object} newData
   */

  Vue.prototype._setData = function (newData) {
    newData = newData || {}
    var oldData = this._data
    this._data = newData
    var keys, key, i
    // 取消代理那些newData中没有的属性
    keys = Object.keys(oldData)
    i = keys.length
    while (i--) {
      key = keys[i]
      if (!(key in newData)) {
        this._unproxy(key)
      }
    }
    // 代理那些未被代理的数据，并在数据变化时触发change
    keys = Object.keys(newData)
    i = keys.length
    while (i--) {
      key = keys[i]
      if (!hasOwn(this, key)) {
        this._proxy(key)
      }
    }
    oldData.__ob__.removeVm(this)
    observe(newData, this)
    this._digest()
  }

  /**
   * 数据代理：vm.prop === vm._data.prop
   *
   * @param {String} key
   */

  Vue.prototype._proxy = function (key) {
    if (!isReserved(key)) {
      // need to store ref to self here
      // because these getter/setters might
      // be called by child scopes via
      // prototype inheritance.
      var self = this
      Object.defineProperty(self, key, {
        configurable: true,
        enumerable: true,
        get: function proxyGetter () {
          return self._data[key]
        },
        set: function proxySetter (val) {
          self._data[key] = val
        }
      })
    }
  }

  /**
   * 取消数据代理
   *
   * @param {String} key
   */

  Vue.prototype._unproxy = function (key) {
    if (!isReserved(key)) {
      delete this[key]
    }
  }

  /**
	 * 设置计算属性。它们本质上就是特殊的 getter/setters
   */

  function noop () {} // NO OPeration,空操作
  Vue.prototype._initComputed = function () {
    var computed = this.$options.computed
    if (computed) {
      for (var key in computed) {
        var userDef = computed[key]
        var def = {
          enumerable: true,
          configurable: true
        }
        if (typeof userDef === 'function') {
          def.get = makeComputedGetter(userDef, this)
          def.set = noop
        } else {
          def.get = userDef.get
            ? userDef.cache !== false
              ? makeComputedGetter(userDef.get, this)
              : bind(userDef.get, this)
            : noop
          def.set = userDef.set
            ? bind(userDef.set, this)
            : noop
        }
        Object.defineProperty(this, key, def)
      }
    }
  }

  function makeComputedGetter (getter, owner) {
    var watcher = new Watcher(owner, getter, null, {
      lazy: true
    })
    return function computedGetter () {
      if (watcher.dirty) {
        watcher.evaluate()
      }
      if (Dep.target) {
        watcher.depend()
      }
      return watcher.value
    }
  }

  /**
   * 初始化methods。方法必须绑定到实例，因为它们可能作为支柱传递给子组件。
   */

  Vue.prototype._initMethods = function () {
    var methods = this.$options.methods
    if (methods) {
      for (var key in methods) {
        this[key] = bind(methods[key], this)
      }
    }
  }
}