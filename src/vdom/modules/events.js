function arrInvoker(arr) {
  return function() {
    // Special case when length is two, for performance
    arr.length === 2
      ? arr[0](arr[1])
      : arr[0].apply(undefined, arr.slice(1))
  }
}

function fnInvoker(o) {
  return function(ev) { o.fn(ev) }
}

function updateEventListeners(oldVnode, vnode) {
  let name, cur, old, event, capture
  const elm = vnode.elm
  const oldOn = oldVnode.data.on || {}
  const on = vnode.data.on
  if (!on) return
  // on形如: {click: Function, ...}
  for (name in on) {
    cur = on[name]
    old = oldOn[name]
    // 旧节点没有事件
    if (old === undefined) {
      capture = name.charAt(0) === '!'
      event = capture ? name.slice(1) : name
      if (Array.isArray(cur)) {
        elm.addEventListener(event, arrInvoker(cur), capture)
      } else {
        cur = {fn: cur}
        on[name] = cur
        elm.addEventListener(event, fnInvoker(cur), capture)
      }
    } else if (Array.isArray(old)) {
      // Deliberately modify old array since it's captured in closure created with `arrInvoker`
      old.length = cur.length
      for (var i = 0; i < old.length; ++i) old[i] = cur[i]
      on[name]  = old
    } else {
      old.fn = cur
      on[name] = old
    }
  }
}

export default {
  create: updateEventListeners,
  update: updateEventListeners
}
