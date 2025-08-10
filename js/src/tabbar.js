var create_html_attributes =
`
create table html_attributes(
   selector varchar(100) not null,
   attributes json not null,
   primary key (selector)
);

insert into html_attributes values
('[data-field="html_attributes.attributes"]', '{"data-format": "yaml"}')
`

var create_usertables = 
`-- Create tables needed to administer users and rights.
-- Only supported in SQLite for now.
-- They should be crated in database 'urdr'.

CREATE TABLE user (
  id varchar(10),
  password varchar(100),
  name_last varchar(50),
  name_first varchar(30),
  primary key (id)
);

INSERT INTO user (id, password) values
  ('admin', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918');

CREATE TABLE access (
  code varchar(16) not null,
  title varchar(50) not null
  description varchar(255),
  parent varchar(16),
  primary key (code),
  foreign key (parent) references access (code)
);

CREATE UNIQUE INDEX access_title on access (title);

INSERT INTO access values
  ('sysadmin', 'System administrator', NULL),
  ('useradmin', 'User administrator', 'sysadmin');

CREATE TABLE user_access (
  user_id varchar(10),
  access_code varchar(16),
  primary key (user_id, access_code),
  foreign key (user_id) references user (id),
  foreign key (access_code) references access (code)
);

INSERT INTO user_access values
  ('admin', 'sysadmin');

CREATE TABLE database_ (
  name varchar(30) not null,
  description varchar(250),
  primary key (name)
);

INSERT INTO database_ values
  ('urdr', 'User administration');

CREATE TABLE database_access (
  database_name varchar(30) not null,
  read_access varchar(16),
  write_access varchar(16),
  primary key (database_name),
  foreign key (database_name) references database_ (name),
  foreign key (read_access) references access (code),
  foreign key (write_access) references access (code)
);

INSERT INTO database_access values
  ('urdr', 'useradmin', 'useradmin');

CREATE TABLE table_ (
  database_name varchar(30) not null,
  name varchar(30) not null,
  description varchar(250),
  primary key (database_name, name),
  foreign key (database_name) references database_ (name)
);

CREATE TABLE table_access (
  database_name varchar(30) not null,
  table_name varchar(30) not null,
  read_access varchar(16),
  write_access varchar(16),
  primary key (database_name, table_name),
  foreign key (database_name) references database_ (name),
  foreign key (database_name, table_name) references table_(database_name, name),
  foreign key (read_access) references access (code),
  foreign key (write_access) references access (code)
);
`

var Tabbar = {

  set_view: function(value) {
    config.edit_mode = value
  },

  set_hidden: function(value) {
    config.hide_empty = value
  },

  view: function(vnode) {
    if (ds.type == 'dblist' || ds.type == 'file') {
      return [
        m('ul', {
          class: 'di w-100'
        }, [
          m('li', {
            class: [
              'list di pl2 pr2 pt1 f5 bl bt br b--gray pointer br1 br--top',
              (!config.tab || config.tab == 'databases') && config.dark_mode ? 'bg-dark-gray'
              : (!config.tab || config.tab == 'databases') ? 'bg-near-white'
              : config.dark_mode ? 'bg-mid-gray'
              : 'bg-light-gray'
            ].join(' '),
            style: (!config.tab || config.tab == 'databases')
              ? 'padding-bottom: 2px' : '',
            onclick: function() {
              config.tab = 'databases'
            }
          }, ['sqlite', 'duckdb'].includes(ds.base.system) ? 'Files' : 'Databases'),
          !ds.dblist || !ds.dblist.useradmin ? '' : m('li', {
            class: [
              'list di ml2 pl2 pr2 pt1 f5 bl bt br b--gray pointer br1 br--top',
              config.tab == 'users' && config.dark_mode ? 'bg-dark-gray'
              : config.tab == 'users' ? 'bg-near-white'
              : config.dark_mode ? 'bg-near-black' 
              : 'bg-light-gray'
            ].join(' '),
            style: (config.tab == 'users')
              ? 'padding-bottom: 2px' : '',
            onclick: function() {
              config.tab = 'users'
              if (!ds.users) {
                m.request({
                  method: 'get',
                  params: {cnxn: ds.cnxn},
                  url: '/userlist'
                }).then(function(result) {
                  ds.users = result.data.users
                  ds.roles = result.data.roles
                })
              }
            }
          }, 'Users')
        ]),
        !ds.dblist || ds.dblist.roles.length == 0 ? null : m('label', { class: 'fr'}, [
          'Role: ',
          m('select', {
            name: 'role',
            onchange: function() {
              m.request({
                method: 'get',
                url: '/dblist',
                params: {
                  cnxn: ds.cnxn,
                  role: $(this).val()
                }
              }).then(function(result) {
                ds.dblist = result.data
              }).catch(function(e) {
                if (e.code === 401) {
                  ds.base.system = e.response.detail.system
                  ds.base.server = e.response.detail.host
                  ds.base.name = e.response.detail.database
                  $('div.curtain').show()
                  $('#login').show()
                  $('#brukernavn').trigger('focus')
                } else {
                  alert(e.response ? e.response.detail : 'An error has occurred.')
                }
              })
            }
          }, [
            m('option', {
              value: 'NONE',
              selected: ds.dblist.role == null
            }, 'Ingen'),
            ds.dblist.roles.map(function(role) {
              return m('option', {
                value: role,
                selected: ds.dblist.role == role
              }, role)
            })
          ])
        ]),
        m('label', {
          class: 'fr mr3'
        }, [
            m('input#view_checkbox', {
              class: 'mr1',
              type: 'checkbox',
              value: 1,
              checked: config.edit_mode,
              onclick: function(ev) {
                Tabbar.set_view(ev.target.checked)
              }
            })
          ], 'Edit mode')
      ]
    }
    return !m.route.param('base') ? '' : [
      !ds.user.admin ? '' : m('ul', {
        class: 'di w-100'
      }, [
          m('li', {
            class: [
              'list di pl2 pr2 bl bt br b--gray pointer br1 br--top f5 pt1',
              (!config.tab || config.tab == 'data') && config.dark_mode ? 'bg-dark-gray'
              : (!config.tab || config.tab == 'data') ? 'bg-near-white'
              : config.dark_mode ? 'bg-near-black'
              : 'bg-light-gray'
            ].join(' '),
            style: (!config.tab || config.tab == 'data')
              ? 'padding-bottom: 2px' : 'padding-bottom: 0px',
            onclick: function() {
              config.tab = 'data'
            }
          }, 'Data'),
          m('li', {
            title: 'Entity Relationship Diagram',
            class: [
              'list ml2 pl2 pt0 pr2 di bl bt br b--gray pointer br1 br--top f5 pt1',
              config.tab == 'diagram' && config.dark_mode ? 'bg-dark-gray'
              : config.tab == 'diagram' ? 'bg-near-white'
              : config.dark_mode ? 'bg-near-black' 
              : 'bg-light-gray'
            ].join(' '),
            style: 'padding-bottom: ' + (config.tab == 'diagram' ? '2px' : '0px'),
            onclick: function() {
              config.tab = 'diagram'
            }
          }, [
              m('i', { class: 'nf nf-fa-sitemap mt1' })
            ]),
          m('li', {
            class: [
              'list ml2 pl2 pr2 di bl bt br b--gray pointer br1 br--top f5 pt1',
              config.tab == 'sql' && config.dark_mode ? 'bg-dark-gray'
              : config.tab == 'sql' ? 'bg-near-white'
              : config.dark_mode ? 'bg-near-black' 
              : 'bg-light-gray'
            ].join(' '),
            style: 'padding-bottom: ' + (config.tab == 'sql' ? '2px' : '0px'),
            onclick: function() {
              config.tab = 'sql'
            }
          }, 'SQL')
        ]),
      !ds.table || !(config.tab == 'data') || 
      !ds.table.privilege.update ? '' : m('label', {
        class: 'fr mr3'
      }, [
          m('input#view_checkbox', {
            class: 'mr1',
            type: 'checkbox',
            value: 1,
            checked: config.edit_mode,
            onclick: function(ev) {
              Tabbar.set_view(ev.target.checked)
            }
          })
        ], 'Edit mode'),
      !ds.table || !(config.tab == 'data') ? '' : m('label', {
        class: 'fr mr3'
      }, [
          m('input', {
            class: 'mr1',
            type: 'checkbox',
            value: 1,
            checked: config.hide_empty,
            onclick: function(ev) {
              Tabbar.set_hidden(ev.target.checked)
            }
          })
        ], 'Hide empty fields'),
      (!ds.user.admin) || config.tab == 'sql' ? null : m('label', {
        class: 'fr mr3'
      }, [
          'Threshold ',
          m('input.threshold', {
            type: "number",
            class: "w3 v-top",
            style: "height: 18px",
            value: config.threshold * 100 || 0,
            title: 'Terskel',
            onchange: function(ev) {
              config.threshold = ev.target.value / 100
            }
          }), ' %',
        ]),
      config.tab == 'data' || ds.base.system != 'sqlite' ? null : m('i', {
        class: 'nf nf-md-database_import_outline fr mr3 f5',
        title: 'Import',
        onclick: function() {
          $('.curtain').show()
          $('#import-dialog').show()
        }
      }),
      config.tab == 'data' ? null : m('i', {
        class: 'nf nf-md-database_export_outline fr mr3 f5',
        title: 'Export',
        onclick: function() {
          $('.curtain').show()
          $('#export-dialog').show()
        }
      }),
      config.tab == 'data' ? null : m('i', {
        class: 'nf nf-md-file_export_outline fr mr3 f5',
        title: 'Export to KDRS Search & View',
        onclick: function() {
          $('.curtain').show()
          $('#kdrs-dialog').show()
        }
      }),
      config.tab == 'data' ? null : m('i', {
        class: 'nf nf-oct-cache fr mr3 f5',
        title: 'Update cache',
        onclick: function() {
          if (['oracle', 'mssql'].includes(ds.base.system)) {
            alert('Cache not supported for ' + ds.base.system)
            return
          }
          m.request({
            url: '/urd/dialog_cache?version=1',
            params: {cnxn: ds.cnxn},
            responseType: "text",
          }).then(function(result) {
              $('#action-dialog').append(result)
            })
          $('div.curtain').show()
          $('#action-dialog').show()
        }
      }),
      (config.tab === 'sql' ? null : m('label', {
        class: 'fr mr3',
        title: "Show descendants that are also descendants of children of the record"
      }, [
          m('input', {
            class: 'mr1',
            type: 'checkbox',
            value: 1,
            checked: config.show_all_descendants,
            onclick: function(ev) {
              config.show_all_descendants = ev.target.checked
            }
          })
        ], 'Show all descendants')),
      (config.tab !== 'data' || (ds.table && !ds.table.expansion_column) ? null : m('label', {
        class: 'fr mr3'
      }, [
        m('input', {
          class: 'mr1',
          type: 'checkbox',
          value: 1,
          checked: ds.table && ds.table.filters && 
                   ds.table.expansion_column in ds.table.filters && 
                   ds.table.filters[ds.table.expansion_column] &&
                   ds.table.filters[ds.table.expansion_column].operator == 'IS NULL',
          onclick: function(ev) {
            var path = m.route.get()
            var query_params = {}
            if (path.indexOf('?') > -1) {
              query_params = m.parseQueryString(path.slice(path.indexOf('?') + 1))
            }

            var key = ds.table.expansion_column + ' IS NULL'
            if (ev.target.checked) {
              query_params[key] = ''
            } else { 
              delete query_params[key]
            }
            m.route.set('/' + ds.cnxn + '/' + ds.base.name + '?table=' + ds.table.name + 
              (query_params.length ? '&' + m.buildQueryString(query_params) : ''))
          }
        })
      ], 'Show top level only')),
      (config.tab != 'diagram' ? null : m('label', {
        class: 'fr mr3',
        title: "Choose which relations to display"
      }, [
          'Show relations:',
          Object.entries({
            nearest: "nearest",
            subordinate: "subordinate",
            all: "all"
          }).map(([key, value]) =>
            m('label', m('input[type=radio]', {
              class: 'ml2 mr1',
              name: 'show_relations',
              value: key,
              checked: config.show_relations === key,
              onchange: () => config.show_relations = key
            }), value)
          ),
        ])),
      (config.tab != 'sql' ? null : m('label', {
        class: 'fr mr3',
        title: 'Choose sql expression',
      }, [
        m('select', {
          onchange: function(ev) {
            SQLpanel.editor.set_value(ev.target.value)
            ev.target.value = 0
          }
        }, [
          m('option', {value: 0}, 'Queries:'),
          m('option', { 
            value: create_usertables 
          }, 'create user tables'),
          m('option', {
            value: create_html_attributes
          }, 'create html_attributes')
        ])
      ]))
    ]
  }
}

export default Tabbar

import SQLpanel from './sqlpanel.js'
import Grid from './grid.js'
import config from './config.js'
