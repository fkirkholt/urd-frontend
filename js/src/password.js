var pwd_dialog = {

  view: function() {
    return m('div', {class: 'w-100'}, [
      m('label', { class: 'db' }, 'Eksisterende passord'),
      m('input[type=password]', {
        id: 'old_pwd',
        class: 'w-100'
      }),
      m('label', { class: 'db' }, 'Nytt passord'),
      m('input[type=password]', {
        id: 'new_pwd',
        class: 'w-100'
      }),
      m('label', { class: 'db' }, 'Gjenta passord'),
      m('input[type=password]', {
        id: 'rep_pwd',
        class: 'w-100'
      }),

      m('input[type=button]', {
        class: 'fr mt2',
        value: 'OK',
        onclick: function() {
          old_pwd = $('#old_pwd').val()
          new_pwd = $('#new_pwd').val()
          rep_pwd = $('#rep_pwd').val()
          if (new_pwd != rep_pwd) {
            $('#new_pwd').val('')
            $('#rep_pwd').val('')
            alert('Gjentatt passord er forskjellig fra nytt passord')
            return
          } 
          if (old_pwd == '' || new_pwd == '') {
            alert('Fyll ut alle felter')
            return
          }
          m.request({
            method: 'put',
            url: 'change_password',
            params: {
              old_pwd: $('#old_pwd').val(),
              new_pwd: $('#new_pwd').val()
            }
          }).then(function(result) {
            alert(result.data)
            $('div.curtain').hide()
            $('#pwd-dialog').hide()
          }).catch(function(e) {
            if (e.code === 401) {
              alert('Kan ikke logge på. Kontakt administrator.')
            } else {
              alert(e.response ? e.response.detail : 'An error has occurred.')
            }
          })
        }
      }),
      m('input[type=button]', {
        class: 'fr mt2',
        value: 'Avbryt',
        onclick: function() {
          $('div.curtain').hide()
          $('#pwd-dialog').hide()
        }
      }),
    ])
  }

}

module.exports = pwd_dialog
