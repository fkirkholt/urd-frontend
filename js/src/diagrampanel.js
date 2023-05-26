var diagrampanel = {
  view: function(vnode) {
    return [
      m(Contents),
      m(Diagram)
    ]
  }
}

module.exports = diagrampanel

var Contents = require('./contents')
var Diagram = require('./diagram')
