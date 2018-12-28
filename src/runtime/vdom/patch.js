import VNode from './vnode'
import * as dom from './dom'
import { isPrimitive } from '../util/index'

const emptyNode = VNode('', {}, [], undefined, undefined)
const hooks = ['create', 'update', 'remove', 'destroy', 'pre', 'post']

function isUndef (s) {
  return s === undefined
}

function isDef (s) {
  return s !== undefined
}

// 判断是否相似
function sameVnode (vnode1, vnode2) {
  return vnode1.key === vnode2.key && vnode1.sel === vnode2.sel
}

// 创建key-index映射关系
function createKeyToOldIdx (children, beginIdx, endIdx) {
  let i, key
  const map = {}
  for (i = beginIdx; i <= endIdx; ++i) {
    key = children[i].key
    if (isDef(key)) map[key] = i
  }
  return map
}

export default function createPatchFunction (modules, api) {
  let i, j
  const cbs = {}

  if (isUndef(api)) api = dom

  // 创建钩子函数
  for (i = 0; i < hooks.length; ++i) {
    cbs[hooks[i]] = []
    for (j = 0; j < modules.length; ++j) {
      if (modules[j][hooks[i]] !== undefined) cbs[hooks[i]].push(modules[j][hooks[i]])
    }
  }

  // 创建空vnode
  function emptyNodeAt (elm) {
    return VNode(api.tagName(elm).toLowerCase(), {}, [], undefined, elm)
  }

  // 创建删除节点回调
  function createRmCb (childElm, listeners) {
    return function () {
      if (--listeners === 0) {
        const parent = api.parentNode(childElm)
        api.removeChild(parent, childElm)
      }
    }
  }

  // 根据vdom 创建真实dom
  function createElm (vnode, insertedVnodeQueue) {
    let i, thunk, elm
    const data = vnode.data
    if (isDef(data)) {
      // 处理data内，传入的init钩子和vnode
      if (isDef(i = data.hook) && isDef(i = i.init)) i(vnode)
      if (isDef(i = data.vnode)) {
        thunk = vnode
        vnode = i
      }
    }
    const children = vnode.children
    const tag = vnode.sel
    if (isDef(tag)) {
      // 创建节点
      elm = vnode.elm = isDef(data) && isDef(i = data.ns)
        ? api.createElementNS(i, tag)
        : api.createElement(tag)
      // 循环创建子节点
      if (Array.isArray(children)) {
        for (i = 0; i < children.length; ++i) {
          api.appendChild(elm, createElm(children[i], insertedVnodeQueue))
        }
      } else if (isPrimitive(vnode.text)) {
        // 文本节点
        api.appendChild(elm, api.createTextNode(vnode.text))
      }
      // 加载create钩子函数
      for (i = 0; i < cbs.create.length; ++i) cbs.create[i](emptyNode, vnode)
      i = vnode.data.hook // Reuse variable
      if (isDef(i)) {
        if (i.create) i.create(emptyNode, vnode)
        if (i.insert) insertedVnodeQueue.push(vnode)
      }
    } else {
      elm = vnode.elm = api.createTextNode(vnode.text)
    }
    if (isDef(thunk)) thunk.elm = vnode.elm
    return vnode.elm
  }

  // 添加子节点
  function addVnodes (parentElm, before, vnodes, startIdx, endIdx, insertedVnodeQueue) {
    for (; startIdx <= endIdx; ++startIdx) {
      api.insertBefore(parentElm, createElm(vnodes[startIdx], insertedVnodeQueue), before)
    }
  }

  // 调用destroy钩子
  function invokeDestroyHook (vnode) {
    let i, j
    const data = vnode.data
    if (isDef(data)) {
      if (isDef(i = data.hook) && isDef(i = i.destroy)) i(vnode)
      for (i = 0; i < cbs.destroy.length; ++i) cbs.destroy[i](vnode)
      if (isDef(i = vnode.children)) {
        for (j = 0; j < vnode.children.length; ++j) {
          invokeDestroyHook(vnode.children[j])
        }
      }
      if (isDef(i = data.vnode)) invokeDestroyHook(i)
    }
  }

  // 移除子节点
  function removeVnodes (parentElm, vnodes, startIdx, endIdx) {
    // 遍历vnodes中下标从startIdx到endIdx的节点，依次删除
    for (; startIdx <= endIdx; ++startIdx) {
      let i, listeners, rm
      const ch = vnodes[startIdx]
      if (isDef(ch)) {
        // 判断是文本节点还是元素节点
        if (isDef(ch.sel)) {
          invokeDestroyHook(ch)
          listeners = cbs.remove.length + 1
          rm = createRmCb(ch.elm, listeners)
          for (i = 0; i < cbs.remove.length; ++i) cbs.remove[i](ch, rm)
          if (isDef(i = ch.data) && isDef(i = i.hook) && isDef(i = i.remove)) {
            i(ch, rm)
          } else {
            rm()
          }
        } else { 
          api.removeChild(parentElm, ch.elm)
        }
      }
    }
  }

  // 子节点比较，diff算法
  function updateChildren (parentElm, oldCh, newCh, insertedVnodeQueue) {
    let oldStartIdx = 0
    let newStartIdx = 0
    let oldEndIdx = oldCh.length - 1
    let oldStartVnode = oldCh[0]
    let oldEndVnode = oldCh[oldEndIdx]
    let newEndIdx = newCh.length - 1
    let newStartVnode = newCh[0]
    let newEndVnode = newCh[newEndIdx]
    let oldKeyToIdx, idxInOld, elmToMove, before

    while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
      if (isUndef(oldStartVnode)) {
        oldStartVnode = oldCh[++oldStartIdx] // 未定义表示被移动过
      } else if (isUndef(oldEndVnode)) {
        oldEndVnode = oldCh[--oldEndIdx]
      } else if (sameVnode(oldStartVnode, newStartVnode)) { // 新头旧头
        patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue)
        oldStartVnode = oldCh[++oldStartIdx]
        newStartVnode = newCh[++newStartIdx]
      } else if (sameVnode(oldEndVnode, newEndVnode)) { // 新尾旧尾
        patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue)
        oldEndVnode = oldCh[--oldEndIdx]
        newEndVnode = newCh[--newEndIdx]
      } else if (sameVnode(oldStartVnode, newEndVnode)) { // Vnode moved right
        patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue)
        api.insertBefore(parentElm, oldStartVnode.elm, api.nextSibling(oldEndVnode.elm))
        oldStartVnode = oldCh[++oldStartIdx]
        newEndVnode = newCh[--newEndIdx]
      } else if (sameVnode(oldEndVnode, newStartVnode)) { // Vnode moved left
        patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue)
        api.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm)
        oldEndVnode = oldCh[--oldEndIdx]
        newStartVnode = newCh[++newStartIdx]
      } else {
        // 根据旧子节点的key，生成map映射
        if (isUndef(oldKeyToIdx)) oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx)
        idxInOld = oldKeyToIdx[newStartVnode.key]
        if (isUndef(idxInOld)) { // New element
          // 没有key，创建并插入dom
          api.insertBefore(parentElm, createElm(newStartVnode, insertedVnodeQueue), oldStartVnode.elm)
          newStartVnode = newCh[++newStartIdx]
        } else {
          // 有key，找到对应dom ，移动该dom并在oldCh中置为undefined
          elmToMove = oldCh[idxInOld]
          patchVnode(elmToMove, newStartVnode, insertedVnodeQueue)
          oldCh[idxInOld] = undefined
          api.insertBefore(parentElm, elmToMove.elm, oldStartVnode.elm)
          newStartVnode = newCh[++newStartIdx]
        }
      }
    }
    // 循环结束时，删除/添加多余dom
    if (oldStartIdx > oldEndIdx) {
      before = isUndef(newCh[newEndIdx+1]) ? null : newCh[newEndIdx + 1].elm
      addVnodes(parentElm, before, newCh, newStartIdx, newEndIdx, insertedVnodeQueue)
    } else if (newStartIdx > newEndIdx) {
      removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx)
    }
  }

  // 比较新旧节点，打补丁
  function patchVnode (oldVnode, vnode, insertedVnodeQueue) {
    let i, hook
    // 加载新节点中传入的 prepatch 钩子函数
    if (isDef(i = vnode.data) && isDef(hook = i.hook) && isDef(i = hook.prepatch)) {
      i(oldVnode, vnode)
    }
    // 用老节点传入data中的vnode替换oldVnode
    if (isDef(i = oldVnode.data) && isDef(i = i.vnode)) oldVnode = i
    // 新节点data中有vnode，则用传入的vnode去作比较
    if (isDef(i = vnode.data) && isDef(i = i.vnode)) {
      patchVnode(oldVnode, i, insertedVnodeQueue)
      vnode.elm = i.elm
      return
    }
    // !!!新节点引用旧节点的dom
    let elm = vnode.elm = oldVnode.elm
    const oldCh = oldVnode.children
    const ch = vnode.children
    if (oldVnode === vnode) return
    // 新旧节点不值得比较
    // ??? 再次判断
    if (!sameVnode(oldVnode, vnode)) {
      var parentElm = api.parentNode(oldVnode.elm)
      elm = createElm(vnode, insertedVnodeQueue)
      api.insertBefore(parentElm, elm, oldVnode.elm)
      removeVnodes(parentElm, [oldVnode], 0, 0)
      return
    }
    // 加载update钩子函数
    if (isDef(vnode.data)) {
      for (i = 0; i < cbs.update.length; ++i) cbs.update[i](oldVnode, vnode)
      i = vnode.data.hook
      if (isDef(i) && isDef(i = i.update)) i(oldVnode, vnode)
    }
    // 新节点没有text属性，即不是文本节点
    if (isUndef(vnode.text)) {
      // 若新旧节点都有子节点
      if (isDef(oldCh) && isDef(ch)) {
        // 不一致，去 diff
        if (oldCh !== ch) updateChildren(elm, oldCh, ch, insertedVnodeQueue)
      } else if (isDef(ch)) {
        // 新节点有，旧节点没有，就添加
        if (isDef(oldVnode.text)) api.setTextContent(elm, '')
        addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue)
      } else if (isDef(oldCh)) {
        // 新节点没有，旧节点有，就删除
        removeVnodes(elm, oldCh, 0, oldCh.length - 1)
      } else if (isDef(oldVnode.text)) {
        api.setTextContent(elm, '')
      }
    } else if (oldVnode.text !== vnode.text) {
      // 新旧节点文本内容不一致
      api.setTextContent(elm, vnode.text)
    }
    // 执行 postpatch 钩子函数
    if (isDef(hook) && isDef(i = hook.postpatch)) {
      i(oldVnode, vnode)
    }
  }

  return function patch (oldVnode, vnode) {
    var i, elm, parent
    var insertedVnodeQueue = []
    // 执行pre钩子函数
    for (i = 0; i < cbs.pre.length; ++i) cbs.pre[i]()

    // 旧的vnode没有sel时，创建空的vnode
    // 只有第一次patch才会走这
    if (isUndef(oldVnode.sel)) {
      oldVnode = emptyNodeAt(oldVnode)
    }

    // 新旧vnode是否相似，值得比较
    if (sameVnode(oldVnode, vnode)) {
      // 相似就去打补丁（增删改）
      patchVnode(oldVnode, vnode, insertedVnodeQueue)
    } else {
      // 不相似就整个覆盖
      elm = oldVnode.elm
      parent = api.parentNode(elm)

      createElm(vnode, insertedVnodeQueue)

      if (parent !== null) {
        api.insertBefore(parent, vnode.elm, api.nextSibling(elm))
        removeVnodes(parent, [oldVnode], 0, 0)
      }
    }

    for (i = 0; i < insertedVnodeQueue.length; ++i) {
      insertedVnodeQueue[i].data.hook.insert(insertedVnodeQueue[i])
    }

    // 执行posy钩子函数
    for (i = 0; i < cbs.post.length; ++i) cbs.post[i]()
    return vnode
  }
}
