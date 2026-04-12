var Diagrampanel = {
  view: function() {
    if (!ds.user?.admin) {
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
