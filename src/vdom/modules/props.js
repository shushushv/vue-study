function updateProps(oldVnode, vnode) {
  let key, cur, old
  const elm = vnode.elm
  const oldProps = oldVnode.data.props || {}
  const props = vnode.data.props || {}

  // 老节点有而新节点没有的delete
  for (key in oldProps) {
    if (!props[key]) {
      delete elm[key]
    }
  }
  // 更新属性
  for (key in props) {
    cur = props[key]
    old = oldProps[key]
    if (old !== cur && (key !== 'value' || elm[key] !== cur)) {
      elm[key] = cur
    }
  }
}

export default {
  create: updateProps,
  update: updateProps
}
