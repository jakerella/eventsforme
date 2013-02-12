Ext.define('Events.model.Option', {
  extend: 'Ext.data.Model',

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