import Select from './select.js'
import Cookies from 'js-cookie'

var login = {

  create: false,
  param: {},
  drivers: {},

  view: function() {
    var cnxn_names = Object.keys(Cookies.get())
      .filter(key => key.startsWith('urdr-cnxn-')).sort()

    var cnxn_options = [{label: 'New connection ...', value: 'new'}]
    cnxn_names.forEach(name => cnxn_options.push({
      label: name.replace('urdr-cnxn-', ''), 
      value: name.replace('urdr-cnxn-', '')
    }))

    var header = ds.base.name == 'urdr' ? 'Log in' : 'Connect' 

    return m('form', [
      m('div', { class: 'f4 mb2' }, header),
      !login.error
        ? '' : m('div', { class: 'red' }, login.msg || header),
      this.create ? '' : m(Select, {
        value: login.param.cnxn,
        onchange: function() {
          if (this.value == 'new') {
            login.create = true
            login.param = {}
          } else if (this.value) {
            login.param = JSON.parse(Cookies.get('urdr-cnxn-' + this.value))
            login.param.cnxn = this.value

            m.request({
              method: 'get',
              url: '/drivers',
              params: {system: login.param.system}
            }).then(function(result) {
              login.drivers = result
              if (!login.param.driver) {
                login.param.driver = Object.keys(login.drivers)[0]
              }
            })
          }
        },
        class: ds.base.name == 'urdr' ? 'dn' : 'db w-100 mb1',
        placeholder: '-- Choose connection --',
        options: cnxn_options
      }),
      !this.create ? '' : m('input[type=text]', {
        id: 'connection-name',
        placeholder: 'Connection name',
        class: ds.base.name == 'urdr' ? 'dn' : 'db w-100 mb1',
        onchange: function() {
          login.param.name = this.value
          login.param.cnxn = this.value.toLowerCase().replace(' ', '-')
        }
      }),
      m(Select, {
        class: ds.base.name == 'urdr' ? 'dn' : 'w-100 mb1',
        id: 'system',
        name: 'system',
        label: 'System',
        placeholder: '-- Choose system --',
        value: login.param.system,
        disabled: login.param.cnxn ? false : true,
        onchange: function() {
          login.param.system = this.value

          m.request({
            method: 'get',
            url: '/drivers',
            params: {system: login.param.system}
          }).then(function(result) {
            console.log('result', result)
            login.drivers = result
            login.param.driver = Object.keys(login.drivers)[0]
          })
        },
        options: [
        
          {
            label: 'DuckDB',
            value: 'duckdb'
          },
          {
            label: 'SQLite',
            value: 'sqlite'
          },
          {
            label: 'MariaDB',
            value: 'mariadb'
          },
          {
            label: 'MySQL',
            value: 'mysql'
          },
          {
            label: 'Oracle',
            value: 'oracle'
          },
          {
            label: 'PostgreSQL',
            value: 'postgresql'
          },
          {
            label: 'SQL Server',
            value: 'mssql'
          },
        ]
      }),
      m('input[type=text]', {
        id: 'server',
        name: 'server',
        placeholder: $('#system').val() == 'sqlite'
          ? 'Path to folder' : 'Host',
        value: login.param.server,
        disabled: login.param.cnxn ? false : true,
        onkeyup: function(e) {
          login.param.server = this.value
          return true
        },
        class: ds.base.name == 'urdr' ? 'dn' : 'db w-100 mb1'
      }),
      login.param.system == 'sqlite' && ds.base.name != 'urdr' ? '' : m('input[type=text]', {
        id: 'brukernavn',
        name: 'brukernavn',
        placeholder: 'Brukernavn',
        value: login.param.username,
        disabled: login.param.cnxn || ds.base.name == 'urdr' ? false : true,
        class: 'db w-100 mb1'
      }),
      login.param.system == 'sqlite' && ds.base.name != 'urdr' ? '' : m('input[type=password]', {
        id: 'passord',
        name: 'passord',
        placeholder: 'Passord',
        value: login.param.password,
        disabled: login.param.cnxn || ds.base.name == 'urdr' ? false : true,
        class: 'db w-100 mb1'
      }),
      m('input[type=text]', {
        id: 'database',
        name: 'database',
        placeholder: 'Database',
        value: login.param.database,
        disabled: login.param.cnxn ? false : true,
        class: ds.base.name == 'urdr' ? 'dn' : 'db w-100 mb1'
      }),
      Object.keys(login.drivers).map(function(key, idx) {
        return m('label', {
          class: 'mr2 nowrap',
          title: 'Select driver'
        }, [m('input[type=radio]', {
          name: 'driver',
          value: key,
          checked: (!login.param.driver && idx == 0) || login.param.driver === key,
          onchange: () => login.param.driver = key
        })], ' ' + key)
      }),
      m('input[type=button]', {
        id: 'btn_login',
        value: login.param.server || !login.param.cnxn ? header : 'Delete',
        disabled: !login.param.cnxn && ds.base.name != 'urdr',
        class: 'db w-100',
        onclick: function() {
          $('#message').hide()
          if (login.param.server || ds.base.name == 'urdr') {
            login.error = false
            login.create = false

            if (login.param.cnxn) {
              Cookies.set('urdr-cnxn-' + login.param.cnxn, JSON.stringify(login.param), { expires: 365 })
              Cookies.set('urdr-cnxn', login.param.cnxn, { expires: 1 })
            } 

            m.request({
              method: 'post',
              url: '/login',
              params: login.param
            }).then(function(result) {
              if (login.param.database) {
                ds.dblist = null
                m.route.set('/' + login.param.cnxn + '/' + login.param.database)
                $('div.curtain').hide();
                $('#login').hide();
              } else {
                m.route.set('/' + login.param.cnxn)
                $('div.curtain').hide();
                $('#login').hide();
              }
            }).catch(function(e) {
              if (e.code == 401) {
                login.error = true
                $('#brukernavn').trigger('focus').trigger('select')
              }
            })
          } else {
            Cookies.remove('urdr-cnxn-' + login.param.cnxn)
            login.param = {}
          }
        }
      })
    ])
  }
}

export default login
