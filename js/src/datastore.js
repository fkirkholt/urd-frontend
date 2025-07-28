var datastore = {
  base: {},
  user: {},
  cache: {
    config: {
      urd_structure: false,
      replace: false,
      threshold: 10,
      count_rows: false
    }
  },
  urd_base: $('#urd-base-name').data('value'),

  load_database: function(base_name, callback) {
    return m.request({
      method: "GET",
      url: '/database',
      params: { cnxn: ds.cnxn, base: base_name }
    }).then(function(result) {
      var data = result.data
      datastore.base = data.base
      datastore.user = data.user
      datastore.branch = data.branch
      datastore.config = data.config

      if (data.config) {
        $.extend(datastore.cache.config, data.config)
      }

      if (typeof callback === 'function') {
        callback(data)
      }
    })
    .catch(function(e) {
      if (e.code === 401 || e.code === 404) {
        if (e.code === 401) {
          datastore.base.system = e.response.detail.system
          datastore.base.server = e.response.detail.host
          datastore.base.name = e.response.detail.database
        }
        $('div.curtain').show()
        $('#login').show()
        $('#brukernavn').trigger('focus')
      } else {
        alert(e.response ? e.response.detail : 'An error has occurred.')
      }
    });
  },

  set_cfg_value: function(tbl, attr, value) {
    if (ds.cache.config.tables === undefined) {
      ds.cache.config.tables = {}
    }

    if (ds.cache.config.tables[tbl.name] === undefined) {
      ds.cache.config.tables[tbl.name] = {}
    }

    ds.cache.config.tables[tbl.name][attr] = value
  }
}

export default datastore

import $ from 'cash-dom'

