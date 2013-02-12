Ext.define('Events.controller.Options', {
  extend: 'Ext.app.Controller',
  requires: ['Events.util.Helper', 'Events.model.Option'],

  config: {
    routes: {
      'options': 'showOptions'
    }
  },

  showOptions: function() {
    Helper.setActiveTab('options');

    var s = Ext.getStore('MyOptions');
    console.log("showing options view with store: ", s);

    Helper.addView({
      xtype: 'eventoptions',
      id: 'options-form',
      hash: 'options',
      title: 'Options',
      store: s.load(),
      listeners: {
        'saveOptions': this.saveOptions,
        scope: this
      }
    }, this.getApplication());
  },

  saveOptions: function(values) {
    console.log('setting options', values);

    values = (values)?values:{};
    
    var s = Ext.getStore('MyOptions');
    var o;
    for (var k in values) {
      if (k == 'sources') {
        continue;
      }
      o = s.getById(k);
      if (o) {
        o.set('value', values[k]);
        o.save();
      } else {
        o = new Events.model.Option();
        o.set('id', k);
        o.set('value', values[k]);
        o.save();
        s.sync();
      }
    }

    Ext.Msg.alert('', "All saved. Thanks!");
  }

});