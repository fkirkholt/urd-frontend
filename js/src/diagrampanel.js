var Diagrampanel = {
  view: function(vnode) {
    if (!ds.user || !ds.user.admin) {
        return null
    }
    return [
      m(Contents),
      m(Diagram)
    ]
  }
}

export default Diagrampanel

import Contents from './contents.js'
import Diagram from './diagram.js'
