var Chart = {

  oncreate: function(vnode) {
    var data = vnode.attrs.data
    
    import('chart.js/auto').then(module => {

      module.Chart.defaults.color = config.dark_mode ? 'lightgray' : 'gray';

      const [firstKey, ...otherKeys] = Object.keys(data[0]);

      const chartData = {
        labels: data.map(item => item[firstKey]),
        datasets: otherKeys.map(key => ({
          label: key.replace('_', ' '),
          data: data.map(item => item[key]),
          borderWidth: 1
        }))
      };

      new module.Chart(vnode.dom, {
          type: 'bar',
          data: chartData,
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
