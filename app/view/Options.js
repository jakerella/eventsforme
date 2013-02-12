Ext.define('Events.view.Options', {
  extend: 'Ext.form.Panel',
  requires: ['Ext.field.Checkbox', 'Ext.field.Text', 'Ext.Button', 'Ext.form.FieldSet'],
  alias: 'widget.eventoptions',

  config: {
    scrollable:'vertical',
    store: null
  },

  initialize: function () {
    this.callParent(arguments);
    this.addFormViews(this.config.store);
  },

  addFormViews: function(s) {
    var fv = s.getById('foo');
    var foo = {
      xtype: 'textfield',
      name: 'foo',
      placeHolder: 'Foo input',
      value: (fv)?fv.get('value'):''
    };

    var bv = s.getById('bar');
    var bar = {
      xtype: 'checkboxfield',
      name: 'bar',
      label: 'Bar',
      value: 'baz',
      checked: ((bv && bv.get('value') == 'baz')?true:false)
    };

    var v = this;
    var save = {
      xtype: 'button',
      ui: 'confirm',
      text: 'Save',
      handler: function() {
        console.log('firing saveOptions event');
        v.fireEvent('saveOptions', this.parent.parent.getValues());
      }
    };

    var note = {
      xtype: 'panel',
      html: "<p id='optionSaveNote'>Note that your options are stored locally, so if you clear your local storage you will need to re-set these!</p>"
    };

    this.add({
      xtype: 'fieldset',
      id: 'option-fields',
      items: [foo, bar, sources, save, note]
    });
  }
  
});