var Chart = {

  oncreate: function(vnode) {
    var data = vnode.attrs.data
    var labels = []

    console.log('vnode.data', vnode.attrs.data)
    import(/* webpackChunkName: "chart" */ 'chart.js/auto').then(module => {

      new module.Chart(vnode.dom, {
          type: 'bar',
          data: {
            labels: data.map(a => a[Object.keys(a)[0]]),
            datasets:
              Object.keys(data[0]).filter(function(key, idx) {
                console.log('key', key)
                console.log('val', data[0][key])
                if (idx == 0) {
                  console.log('false')
                  return false
                }
                labels.push(key)
                return true
              }).map(function(key, idx) {
                console.log('key2', key)
                return {
                  label: Object.keys(data[0])[idx+1].replace('_', ' '),
                  // label: key,
                  data: data.map(a => a[Object.keys(a)[idx+1]]),
                  borderWidth: 1
                }
              })
          },
          options: {
            scales: {
              y: {
                beginAtZero: true
              }
            }
          }
        });
    })
  },

  view: function(vnode) {
    return m('canvas', {
      id: vnode.attrs.id,
      class: vnode.attrs.class
    })
  }

}


module.exports = Chart;
