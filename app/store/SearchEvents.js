Ext.define('Events.store.SearchEvents', {
  extend: 'Ext.data.Store',
  requires: ['Events.util.Helper', 'Ext.data.proxy.Ajax'],
  
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
        exception: function(p, r, op) {
          console.warn("Ajax exception: ", p, r, op);
          Ext.getStore('LocalEvents').fireEvent("AjaxError", {status: r.status, text: r.responseText});
        }
      }
    },
    sorters: [
      {
        property : "start",
        direction: "ASC"
      }
    ],
    listeners: {
      beforeload: function() { Helper.setLoading(true); },
      load: function() { Helper.setLoading(false); }
    }
  }
});