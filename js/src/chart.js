var Chart = {

  oncreate: function(vnode) {
    var data = vnode.attrs.data
    var labels = []

    console.log('vnode.data', vnode.attrs.data)
    import('chart.js/auto').then(module => {

      module.Chart.defaults.color = config.dark_mode ? 'lightgray' : 'gray';

      new module.Chart(vnode.dom, {
          type: 'bar',
          data: {
            labels: data.map(a => a[Object.keys(a)[0]]),
            datasets:
              Object.keys(data[0]).filter(function(key, idx) {
                if (idx == 0) {
                  return false
                }
                labels.push(key)
                return true
              }).map(function(key, idx) {
                return {
                  label: Object.keys(data[0])[idx+1].replace('_', ' '),
                  data: data.map(a => a[Object.keys(a)[idx+1]]),
                  borderWidth: 1
                }
              })
          },
          options: {
            plugins: {
              legend: {
                labels: {
                  color: config.dark_mode ? 'lightgray' : 'gray'
                }
              }
            },
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

import config from './config.js'


export default Chart
