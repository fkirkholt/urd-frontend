var config = require('./config')

var create_html_attributes =
`
create table html_attributes(
   selector varchar(100) not null,
   attributes text not null,
   primary key (selector)
);

insert into html_attributes values
('[data-field="html_attributes.attributes"]', '{"data-type": "json", "data-format": "yaml"}')
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
  code varchar(16),
  description varchar(255),
  parent varchar(16),
  primary key (code),
  foreign key (parent) references access (code)
);

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

var tabbar = {

  set_view: function(value) {
    config.edit_mode = value
  },

  set_hidden: function(value) {
    config.hide_empty = value
  },

  view: function(vnode) {
    if (ds.type == 'dblist') {
      return [
        m('ul', {
          class: 'di w-100'
        }, [
          m('li', {
            class: [
              'list di pl1 pr1 bl bt br b--gray pointer br1 br--top',
              (!config.tab || config.tab == 'databases')
                ? 'bg-white' : 'bg-near-white'
            ].join(' '),
            style: (!config.tab || config.tab == 'databases')
              ? 'padding-bottom: 1px' : '',
            onclick: function() {
              config.tab = 'databases'
            }
          }, 'Databases'),
          !ds.dblist || !ds.dblist.useradmin ? '' : m('li', {
            class: [
              'list di ml2 pl1 pr1 bl bt br b--gray pointer br1 br--top',
              (config.tab == 'users')
                ? 'bg-white' : 'bg-near-white'
            ].join(' '),
            style: (config.tab == 'users')
              ? 'padding-bottom: 1px' : '',
            onclick: function() {
              config.tab = 'users'
              if (!ds.users) {
                m.request({
                  method: 'get',
                  url: 'userlist'
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
                url: 'dblist',
                params: {
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
        ])
      ]
    }
    return !m.route.param('base') ? '' : [
      !ds.user.admin ? '' : m('ul', {
        class: 'di w-100'
      }, [
          m('li', {
            class: [
              'list di pl2 pr2 bl bt br b--gray pointer br1 br--top f5 pt1',
              (!config.tab || config.tab == 'data')
                ? 'bg-white' : 'bg-near-white'
            ].join(' '),
            style: (!config.tab || config.tab == 'data')
              ? 'padding-bottom: 2px' : 'padding-bottom: 0px',
            onclick: function() {
              config.tab = 'data'
              m.route.set('/' + ds.base.name + '/data')
            }
          }, 'Data'),
          m('li', {
            title: 'Entity Relationship Diagram',
            class: [
              'list ml2 pl2 pt0 pr2 di bl bt br b--gray pointer br1 br--top f5 pt1',
              config.tab == 'diagram' ? 'bg-white' : 'bg-near-white'
            ].join(' '),
            style: 'padding-bottom: ' + (config.tab == 'diagram' ? '2px' : '0px'),
            onclick: function() {
              config.tab = 'diagram'
              m.route.set('/' + ds.base.name + '/diagram')
            }
          }, [
              m('i', { class: 'fa fa-sitemap mt1' })
            ]),
          m('li', {
            class: [
              'list ml2 pl2 pr2 di bl bt br b--gray pointer br1 br--top f5 pt1',
              config.tab == 'sql' ? 'bg-white' : 'bg-near-white'
            ].join(' '),
            style: 'padding-bottom: ' + (config.tab == 'sql' ? '2px' : '0px'),
            onclick: function() {
              config.tab = 'sql'
              m.route.set('/' + ds.base.name + '/sql')
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
              tabbar.set_view(ev.target.checked)
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
              tabbar.set_hidden(ev.target.checked)
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
            value: config.threshold * 100,
            title: 'Terskel',
            onchange: function(ev) {
              config.threshold = ev.target.value / 100
            }
          }), ' %',
        ]),
      ds.table ? null : m('i', {
        class: 'fa fa-file-text-o fr mr3 pt1',
        title: 'Export',
        onclick: function() {
          $('.curtain').show()
          $('#export-dialog').show()
        }
      }),
      !ds.user.admin || ds.table ? null : m('i', {
        class: 'fa fa-file-code-o fr mr3 pt1',
        title: 'Export to KDRS Search & View',
        onclick: function() {
          $('.curtain').show()
          $('#kdrs-dialog').show()
        }
      }),
      (!ds.user.admin) || config.tab != 'diagram' ? null : m('i', {
        class: 'fa fa-edit fr mr3 pt1',
        title: 'Update cache',
        onclick: function() {
          if (['oracle', 'mssql'].includes(ds.base.system)) {
            alert('Cache not supported for ' + ds.base.system)
            return
          }
          m.request({
            url: 'urd/dialog_cache?version=1',
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
            Codefield.set_value('query', ev.target.value)
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

module.exports = tabbar

var Codefield = require('./codefield')
