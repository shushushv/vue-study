// TODO:
// - include prefix sniffing of v-bind:style

function updateStyle (oldVnode, vnode) {
  let cur, name
  const elm = vnode.elm
  const oldStyle = oldVnode.data.style || {}
  const style = vnode.data.style || {}

  // 老节点有而新节点没有的style则置空
  for (name in oldStyle) {
    if (!style[name]) {
      elm.style[name] = ''
    }
  }
  // 更新style
  for (name in style) {
    cur = style[name]
    if (cur !== oldStyle[name]) {
      elm.style[name] = cur
    }
  }
}

export default {
  create: updateStyle,
  update: updateStyle
}
