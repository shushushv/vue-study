import { isArray, isObject, setClass } from '../../util/index'

// 编译动态class
function genClass (data) {
  if (!data) {
    return ''
  }
  // 对象形式 :class="{ red: isRed }"
  if (isObject(data)) {
    let res = ''
    for (var key in data) {
      if (data[key]) res += key + ' '
    }
    return res.slice(0, -1)
  }
  // 数组形式 :class="[classA, classB]"
  if (isArray(data)) {
    let res = ''
    for (let i = 0, l = data.length; i < l; i++) {
      if (data[i]) res += genClass(data[i]) + ' '
    }
    return res.slice(0, -1)
  }
  // 字符串形式 :class="classObject"
  if (typeof data === 'string') {
    return data
  }
}

function updateClass (oldVnode, vnode) {
  // 动态class
  let dynamicClass = vnode.data.class
  // 静态class
  let staticClass = vnode.data.staticClass
  if (staticClass || dynamicClass) {
    // 编译动态class
    dynamicClass = genClass(dynamicClass)
    let cls = staticClass
      ? staticClass + (dynamicClass ? ' ' + dynamicClass : '')
      : dynamicClass
    // 设置class
    setClass(vnode.elm, cls)
  }
}

export default {
  create: updateClass,
  update: updateClass
}
