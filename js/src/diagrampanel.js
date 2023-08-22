var diagrampanel = {
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

module.exports = diagrampanel

var Contents = require('./contents')
var Diagram = require('./diagram')
