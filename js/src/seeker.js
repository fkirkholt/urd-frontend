const KEY_CODE_TAB = 9
const KEY_CODE_ENTER = 13
const KEY_CODE_UP = 38
const KEY_CODE_DOWN = 40

function Seeker(initialVnode) {

    var options = []
    var option = {}
    var index = 0
    var timer = null

    function keydown(event, attrs) {
        if (event.keyCode == KEY_CODE_ENTER) {
            option = options[index]
            event.target.value = option.label
            event.target.dataset.value = option.value
            attrs.onchange(event)
            options = []

        } else if (event.keyCode == KEY_CODE_UP) {
            if (index == 0) {
                return
            }
            index--
        } else if (event.keyCode == KEY_CODE_DOWN) {
            if (index == options.length-1) {
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
            var input_width = $(vnode.dom).outerWidth()
            var offset = $(vnode.dom).offset()
            $('ul.options').css('min-width', input_width)
            $('ul.options').css('left', offset.left)
            $('ul.options').css('overflow', 'hidden')
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
                    name: vnode.attrs.name,
                    value: option.label,
                    placeholder: 'Search',
                    style: vnode.attrs.style,
                    oninput: function(event) {
                        option.label = event.target.value
                    },
                    onkeydown: function(event) {
                        keydown(event, vnode.attrs)
                    },
                    onblur: function() {
                        options =[]
                    },
                }),
                !options.length ? '' : m('ul.options', {
                    class: 'absolute list bg-white ma0 pa0 ba b--gray'
                }, [
                    options.map(function(row, i) {
                        return m('li', {
                            class: [
                                'pl1 pr1',
                                i == index ? 'bg-light-blue' : 'bg-white'
                            ].join(' ')
                        }, row.label)
                    })
                ])
            ]
        }
    }
}

module.exports = Seeker
