Ext.define('Events.model.Event', {
  extend: 'Ext.data.Model',

  config: {
    idProperty: 'id',
    fields: [
      {name: 'id', type: 'string'},
      {name: 'title', type: 'string'},
      {name: 'category', type: 'string'},
      {name: 'source', type: 'string'},
      {name: 'description', type: 'string'},
      {name: 'link', type: 'string'},
      {name: 'location', type: 'string'},
      {name: 'address', type: 'string'},
      {name: 'start', type: 'date', dateFormat: 'Y-m-d H:i:s'},
      {name: 'end', type: 'date', dateFormat: 'Y-m-d H:i:s'},
      {name: 'lat', type: 'float'},
      {name: 'lng', type: 'float'},
      {name: 'tickets', type: 'boolean'},
      {name: 'cost', type: 'float'},
      {name: 'saved', type: 'boolean'}
    ],

    validations: [
      {type: 'presence', field: 'title'},
      {type: 'presence', field: 'link'},
      {type: 'presence', field: 'start'},
      {type: 'length', field: 'title', min: 5}
    ],

    proxy: {
      type: "localstorage",
      id : "my-events"
    }
  }
});