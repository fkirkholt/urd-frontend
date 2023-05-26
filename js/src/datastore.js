var login = require('./login')

var store = {
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
      url: "database",
      params: { base: base_name }
    }).then(function(result) {
      var data = result.data;
      store.base = data.base;
      store.user = data.user;
      store.branch = data.branch;

      if (data.config) {
        $.extend(store.cache.config, data.config);
      }

      if (typeof callback === 'function') {
        callback(data);
      }
    }).catch(function(e) {
      if (e.code === 401 || e.code === 404) {
        login.msg = e.response.detail
        login.error = true
        $('div.curtain').show();
        $('#login').show();
        $('#brukernavn').trigger('focus');
      } else {
        alert(e.response.detail)
      }
    });
  },

  set_cfg_value: function(tbl, attr, value) {
    if (ds.cache.config.tables === undefined) {
      ds.cache.config.tables = {};
    }

    if (ds.cache.config.tables[tbl.name] === undefined) {
      ds.cache.config.tables[tbl.name] = {};
    }

    ds.cache.config.tables[tbl.name][attr] = value;
  }
}

module.exports = store;
