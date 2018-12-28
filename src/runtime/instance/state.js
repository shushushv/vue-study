import Watcher from '../observer/watcher'
import Dep from '../observer/dep'
import { observe } from '../observer/index'

import {
  warn,
  hasOwn,
  isReserved,
  isPlainObject,
  bind
} from '../util/index'

/**
 * 实例状态初始化：
 *  - 数据劫持
 *  - 计算属性
 *  - 自定义方法
 */
export function initState (vm) {
  initData(vm)
  initComputed(vm)
  initMethods(vm)
}

/**
 * 初始化data
 */
function initData (vm) {
  var data = vm.$options.data
  // 兼容函数形式和对象形式的data
  data = vm._data = typeof data === 'function'
    ? data()
    : data || {}
  if (!isPlainObject(data)) {
    data = {}
    process.env.NODE_ENV !== 'production' && warn(
      'data functions should return an object.',
      vm
    )
  }
  // 循环代理数据
  var keys = Object.keys(data)
  var i = keys.length
  while (i--) {
    vm._proxy(keys[i])
  }
  // 添加观察者，数据劫持
  observe(data, vm)
}

/**
 * 设置计算属性。它们本质上就是特殊的 getter/setters
 */
function noop () {} // NO OPeration,空操作
function initComputed (vm) {
  var computed = vm.$options.computed
  if (computed) {
    for (var key in computed) {
      var userDef = computed[key]
      var def = {
        enumerable: true,
        configurable: true
      }
      if (typeof userDef === 'function') {
        def.get = makeComputedGetter(userDef, vm)
        def.set = noop
      } else {
        def.get = userDef.get
          ? userDef.cache !== false
            ? makeComputedGetter(userDef.get, vm)
            : bind(userDef.get, vm)
          : noop
        def.set = userDef.set
          ? bind(userDef.set, vm)
          : noop
      }
      Object.defineProperty(vm, key, def)
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
function initMethods (vm) {
  var methods = vm.$options.methods
  if (methods) {
    for (var key in methods) {
      vm[key] = bind(methods[key], vm)
    }
  }
}

/**
 * 数据代理：vm.prop === vm._data.prop
 */
function proxy (vm, key) {
  if (!isReserved(key)) {
    Object.defineProperty(vm, key, {
      configurable: true,
      enumerable: true,
      get: function proxyGetter () {
        return vm._data[key]
      },
      set: function proxySetter (val) {
        vm._data[key] = val
      }
    })
  }
}

/**
 * 取消数据代理
 */
function unproxy (vm, key) {
  if (!isReserved(key)) {
    delete vm[key]
  }
}

/**
 * 在`$data`被设置（setter）时调用，替换实例的`$data`属性
 */
export function setData (vm, newData) {
  newData = newData || {}
  var oldData = vm._data
  vm._data = newData
  var keys, key, i
  // 取消代理那些newData中没有的属性
  keys = Object.keys(oldData)
  i = keys.length
  while (i--) {
    key = keys[i]
    if (!(key in newData)) {
      unproxy(vm, key)
    }
  }
  // 代理那些未被代理的数据，并在数据变化时触发change
  keys = Object.keys(newData)
  i = keys.length
  while (i--) {
    key = keys[i]
    if (!hasOwn(vm, key)) {
      proxy(vm, key)
    }
  }
  oldData.__ob__.removeVm(vm)
  observe(newData, vm)
  vm.$forceUpdate()
}