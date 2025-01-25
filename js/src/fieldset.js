var Fieldset = {

  draw_inline_fieldset: function(rec, fieldset) {

    return [
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
            field.attrs.placeholder = field.attrs.placeholder || field.label
            field.attrs.class = 'dib'
            if (field.size) {
              let percent = (100/fieldset.size) * field.size
              if (percent >= 35) {
                field.attrs.class += ' mw4'
              } else {
                field.attrs.class += ' mw3'
              }
            }

            // determine if field should be displayd or edited
            var display = !rec.table.privilege.update || field.virtual ||
              rec.readonly || !config.edit_mode || !field.editable

            return !display
            ? m(Input, { rec: rec, fieldname: fieldname, ...field.attrs })
            : field.datatype == 'date' || field.attrs['data-format'] == 'ISO 8601'
              ? [separator, m('time', { datetime: field.value }, Field.display_value(field, rec))]
              : [separator, m('data', { value: field.value }, Field.display_value(field, rec))]
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
    ]
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
      // Draw label
      set.expanded ? null : [
        m('label', {
          'data-expandable': true,
          'data-set': rec.table.name + '.' + set.name,
          class: 'db ml3 mt1'
        }, [
            m('b', {
              class: [
                'v-top nowrap underline pointer mr2',
                set.inline ? 'db' : 'dib'
              ].join(' '),
              onclick: function() {
                if (set.expandable) {
                  set.expanded = !set.expanded
                }
              }
            }, label),
            set.inline ? '' : m('span', {
              class: 'normal ml1 moon-gray f7'
            }, count_field_values + '/' + count_fields),
            // Draw inline fieldset
            !set.expanded && set.inline
              ? Fieldset.draw_inline_fieldset(rec, set) : null,
          ]),
      ],
      // Draw fields if the field group is expanded
      !set.expanded ? null : m('fieldset', {
        'data-set': rec.table.name + '.' + set.name,
        class: 'flex flex-wrap',
        'data-expandable': set.expandable
      }, [
          m('legend', {
            onclick: function() {
              if (set.expandable === false) return
              set.expanded = !set.expanded
            }
          }, [
              m('b', { 
                class: set.expandable ? 'underline pointer' : ''
              }, label),
          ]),
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
    ]
  }
}

export default Fieldset

import config from './config.js'
import Field from './field.js'
import Input from './input.js'
