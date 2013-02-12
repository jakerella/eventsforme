Ext.define('Events.store.MyOptions', {
  extend: 'Ext.data.Store',
  requires: ['Ext.data.proxy.LocalStorage'],
  config: {
    model: 'Events.model.Option'
  }
});