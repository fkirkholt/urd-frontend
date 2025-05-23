var Select = {

  draw_option: function(options, option, value, level) {
    var whitespace = '&nbsp;&nbsp;&nbsp'.repeat(level)
    return [
      m('option', {
        value: option.value,
        class: config.dark_mode ? 'white' : 'black',
        selected: option.value == value
      }, m.trust(whitespace + option.label)),
      options.filter(function(opt) {
        return opt.parent == option.value
      }).map(function(opt, idx) {
        level += 1
        return Select.draw_option(options, opt, value, level)
      })
    ]
  },

  view: function(vnode) {
    var value = vnode.attrs.value

    return m('select', {
      id: vnode.attrs.id,
      name: vnode.attrs.fieldname,
      required: vnode.attrs.required,
      disabled: vnode.attrs.disabled || false,
      onchange: vnode.attrs.onchange,
      style: vnode.attrs.style,
      // value: value,
      class: [
        vnode.attrs.class,
        config.dark_mode ? 'bg-near-black' : '',
        (value === '' || value === null) ? 'gray' : ''
      ].join(' ')
    }, [
        vnode.attrs.required && value !== null && value !== ''
          ? ''
          : m('option', {
            value: '',
            class: 'gray normal'
          }, vnode.attrs.placeholder
              ? vnode.attrs.placeholder : m.trust('&nbsp;')
          ),
        vnode.attrs.optgroups
          ? vnode.attrs.optgroups.map(function(optgroup, idx) {
            return m('optgroup', {
              label: optgroup.label,
              'data-value': optgroup['data-value'],
              class: 'black'
            }, [
                optgroup.options.map(function(option, idx) {
                  return m('option', {
                    value: option.value,
                    class: config.dark_mode ? 'white' : 'black',
                    selected: option.value === value
                  }, option.label)
                })
              ])
          })
          : vnode.attrs.options.filter(function(option) {
            return 'parent' in option ? option.parent === null : true
          }).map(function(option, idx) {
            return Select.draw_option(vnode.attrs.options, option, value, 0)
          })
      ])
  }
}

import config from './config.js'

export default Select
