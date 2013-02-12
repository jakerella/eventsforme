Ext.define('Events.model.Option', {
  extend: 'Ext.data.Model',
  requires: ['Ext.data.proxy.LocalStorage'],

  config: {
    idProperty: 'id',
    fields: [
      {name: 'id', type: 'string'},
      {name: 'value', type: 'string'}
    ],

    validations: [
      {type: 'presence', field: 'name'}
    ],

    proxy: {
      type: "localstorage",
      id : "my-events-options"
    }
  }
});