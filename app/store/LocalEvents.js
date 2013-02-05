Ext.define('Events.store.LocalEvents', {
  extend: 'Ext.data.Store',
  config: {
    model: 'Events.model.Event',
    
    proxy: {
      type: "ajax",
      url : "data/event.php?q=near",
      reader: {
        type: "json",
        rootProperty: "results"
      }
    },
    sorters: [
      {
        property : "start",
        direction: "ASC"
      }
    ]
  }
});