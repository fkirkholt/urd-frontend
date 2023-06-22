var Fieldset = {

  draw_inline_fieldset: function(rec, fieldset) {

    return m('td.nowrap', [
      Object.keys(fieldset.items).map(function(label, idx) {
        var fieldname = fieldset.items[label]
        var type = fieldname.indexOf('actions.') > -1
          ? 'action' : 'field'

        switch (type) {
          case 'field':
            var field = rec.fields[fieldname]
            var separator
            if (idx > 0 && (field.value !== null || field.text !== null)) {
              separator = field.separator ? field.separator : ', '
            } else {
              separator = null
            }

            field.attrs = field.attrs || {}
            field.attrs.rec = rec
            field.attrs.name = fieldname
            field.attrs.placeholder = field.attrs.placeholder || field.label

            // determine if field should be displayd or edited
            var display = rec.table.privilege.update == 0 ||
              rec.readonly || !config.edit_mode

            return m('span', { class: display ? '' : 'mr2' },
              display
                ? [separator, Field.display_value(field)].join('')
                : m(Input, field.attrs)
            )
          case 'action':
            var action = ds.table.actions[fieldname]
            return m('span', { class: 'mr2' }, [
              m('input', {
                type: 'button',
                value: action.label,
                onclick: function() {
                  Toolbar.run_action(action, rec)
                }
              })
            ])
        }
      })
    ])
  },

  view: function(vnode) {
    var rec = vnode.attrs.rec
    var set = vnode.attrs.fieldset
    var label = vnode.attrs.label

    // Find number of registered fields under the heading
    var count_fields = 0
    var count_field_values = 0
    Object.keys(set.items).map(function(label) {
      count_fields++
      var col = set.items[label]
      if (rec.fields[col] && rec.fields[col].value !== null) {
        count_field_values++
      }
    })

    return [
      m('tr', [
        // Draw expansion icon
        m('td', { class: 'tc' }, [
          set.inline && !set.expandable ? '' : m('i.fa', {
            class: [
              set.expanded ? 'fa-angle-down' : 'fa-angle-right',
              set.invalid ? 'invalid' : set.dirty ? 'dirty' : ''
            ].join(' '),
            onclick: function() {
              if (set.expandable === false) return

              set.expanded = !set.expanded
            }
          })
        ]),
        // Draw label
        m('td.label', {
          class: 'f6 nowrap pr2',
          colspan: set.inline ? 1 : 3,
          onclick: function() {
            set.expanded = !set.expanded
          }
        }, [
            label,
            set.inline ? '' : m('span', {
              class: 'normal ml1 moon-gray f7'
            }, count_field_values + '/' + count_fields),
          ]),
        // Draw icons showing invalid or modified fields
        m('td', [
          set.expanded ? '' :
            set.invalid
              ? m('i', { class: 'fa fa-warning ml1 red' })
              : set.dirty ? m('i', {
                class: 'fa fa-pencil ml1 light-gray'
              }) : '',
        ]),
        // Draw inline fieldset
        !set.expanded && set.inline
          ? Fieldset.draw_inline_fieldset(rec, set) : null
      ]),
      // Draw fields if the field group is expanded
      !set.expanded ? null : m('tr', [
        m('td'),
        m('td', { colspan: 3 }, [
          m('table', [
            Object.keys(set.items).map(function(label) {
              var subitem = set.items[label]

              if (typeof subitem == 'object') {
                return m(Fieldset, {
                  rec: rec, fieldset: subitem, label: label
                })
              } else {
                return m(Field, {
                  rec: rec, colname: subitem, label: label
                })
              }
            })
          ])
        ])
      ])
    ]
  }
}

module.exports = Fieldset

var config = require('./config')
var Field = require('./field')
var Input = require('./input')
