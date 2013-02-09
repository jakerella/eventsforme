Ext.define('Events.store.LocalEvents', {
  extend: 'Ext.data.Store',
  config: {
    model: 'Events.model.Event',
    
    proxy: {
      type: "ajax",
      url : "data/event.php",
      reader: {
        type: "json",
        rootProperty: "results"
      },
      listeners: {
        exception: Events.Util.handleAjaxException
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