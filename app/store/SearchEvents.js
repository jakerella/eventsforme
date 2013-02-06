Ext.define('Events.store.SearchEvents', {
  extend: 'Ext.data.Store',
  config: {
    model: 'Events.model.Event',
    
    proxy: {
      type: "ajax",
      url : "data/event.php?q=search",
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