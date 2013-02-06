Ext.define('Events.store.MyEvents', {
  extend: 'Ext.data.Store',
  requires: ['Ext.data.proxy.LocalStorage'],
  config: {
    model: 'Events.model.Event'
  }
});