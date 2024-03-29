var Select = {

  view: function(vnode) {
    var value = vnode.attrs.value

    return m('select', {
      id: vnode.attrs.id,
      name: vnode.attrs.fieldname,
      required: vnode.attrs.required,
      onchange: vnode.attrs.onchange,
      style: vnode.attrs.style,
      // value: value,
      class: [
        vnode.attrs.class,
        value === '' || value === null ? 'moon-gray' : ''
      ].join(' ')
    }, [
        vnode.attrs.required && value !== null && value !== ''
          ? ''
          : m('option', {
            value: '',
            class: 'moon-gray normal'
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
                    class: 'black',
                    selected: option.value === value
                  }, option.label)
                })
              ])
          })
          : vnode.attrs.options.map(function(option, idx) {
            return m('option', {
              value: option.value,
              class: 'black',
              selected: option.value == value
            }, option.label)
          })
      ])
  }
}

module.exports = Select
