const KEY_CODE_TAB = 9
const KEY_CODE_ENTER = 13
const KEY_CODE_UP = 38
const KEY_CODE_DOWN = 40

function Autocomplete() {

  var options = []
  var option = {}
  var index = 0
  var timer = null
  var fieldname = ''

  function keydown(event, attrs) {
    if (event.keyCode == KEY_CODE_ENTER && !attrs.unique) {
      option = options[index]
      event.target.value = option.label
      // Use JSON.stringify to set correct data type
      event.target.dataset.value = JSON.stringify(option.value)
      attrs.onchange(event)
      options = []

    } else if (event.keyCode == KEY_CODE_UP) {
      if (index == 0) {
        return
      }
      index--
    } else if (event.keyCode == KEY_CODE_DOWN) {
      if (index == options.length - 1) {
        return
      }
      index++
    } else if (event.keyCode == KEY_CODE_TAB) {
      return
    } else {
      if (timer) {
        clearTimeout(timer)
      }
      timer = setTimeout(function() { load(event, attrs) }, 300)
    }
  }

  function load(event, attrs) {
    var data = attrs.ajax.data
    data.q = event.target.value

    m.request({
      method: 'get',
      url: attrs.ajax.url,
      params: attrs.ajax.data
    }).then(function(result) {
      options = result
    })

  }

  return {

    onupdate: function(vnode) {
      if (fieldname == vnode.attrs.fieldname) {
        var input_width = $(vnode.dom).outerWidth()
        var offset = $(vnode.dom).offset()
        $('ul.options').css('min-width', input_width)
        $('ul.options').css('top', offset.top + $(vnode.dom).outerHeight())
        $('ul.options').css('left', offset.left)
        $('ul.options').css('overflow', 'hidden')
      }
    },

    view: function(vnode) {
      if (vnode.attrs.value != option.value) {
        option = {
          value: vnode.attrs.value,
          label: vnode.attrs.text
        }
      }
      return [
        m('input.search', {
          id: vnode.attrs.id,
          name: vnode.attrs.fieldname,
          'data-table': vnode.attrs['data-table'],
          type: vnode.attrs.type || 'search',
          size: vnode.attrs.item.element == 'input' && vnode.attrs.item.size
            ? vnode.attrs.item.size
            : null,
          maxlength: vnode.attrs.item.element == 'input'
            ? vnode.attrs.item.size
            : null,
          class: vnode.attrs.class,
          value: option.label,
          placeholder: vnode.attrs.placeholder
            ? vnode.attrs.placeholder
            : vnode.attrs.unique ? '' : 'Search',
          style: vnode.attrs.style,
          autocomplete: 'off',
          required: vnode.attrs.required,
          oninput: function(event) {
            option.label = event.target.value
            fieldname = vnode.attrs.fieldname
          },
          onkeydown: function(event) {
            keydown(event, vnode.attrs)
          },
          onblur: function(event) {
            if (vnode.attrs.self_reference) {
              vnode.attrs.onchange(event)
            }
            option = {}
            options = []
          },
        }),
        !options.length ? '' : m('ul.options', {
          class: 'absolute list bg-white ma0 pa0 ba b--gray'
        }, [
            options.map(function(row, i) {
              return m('li', {
                class: [
                  vnode.attrs.unique ? 'gray' : '',
                  'pl1 pr1',
                  !vnode.attrs.unique && i == index ? 'bg-light-blue' 
                  : 'bg-white'
                ].join(' ')
              }, row.label)
            })
          ])
      ]
    }
  }
}

export default Autocomplete
