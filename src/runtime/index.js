import Vue from './instance/index'
import { nextTick } from './util/index'

Vue.options = {
  directives: Object.create(null),	// 包含 Vue 实例可用指令的哈希表。
  filters: Object.create(null),	// 包含 Vue 实例可用过滤器的哈希表。
  components: Object.create(null),	// 包含 Vue 实例可用组件的哈希表。
  transitions: Object.create(null)	
}

Vue.nextTick = nextTick
Vue.version = '2.0.0'

export default Vue
