Ext.define('Events.model.Source', {
  extend: 'Ext.data.Model',

  config: {
    idProperty: 'id',
    fields: [
      {name: 'id', type: 'string'},
      {name: 'name', type: 'string'},
      {name: 'url', type: 'string'}
    ],

    validations: [
      {type: 'presence', field: 'name'}
    ]
  }
});