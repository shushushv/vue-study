/**
 * @description 获取属性值
 * @param {Object} el AST对象
 * @param {String} attr 属性名
 * @returns
 */
export function getAndRemoveAttr (el, attr) {
	let val
	// 如果属性存在，则从AST对象的attrs和attrsMap移除
  if (val = el.attrsMap[attr]) {
    el.attrsMap[attr] = null
    for (let i = 0, l = el.attrs.length; i < l; i++) {
      if (el.attrs[i].name === attr) {
        el.attrs.splice(i, 1)
        break
      }
    }
  }
  return val
}