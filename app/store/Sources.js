Ext.define('Events.store.Sources', {
  extend: 'Ext.data.Store',
  requires: ['Events.util.Helper', 'Ext.data.proxy.Ajax'],

  config: {
    model: 'Events.model.Source',
    
    proxy: {
      type: "ajax",
      url : "data/source.php",
      reader: {
        type: "json",
        rootProperty: "results"
      },
      listeners: {
        exception: function(p, r, op) {
          console.warn("Ajax exception: ", p, r, op);
          Ext.getStore('Sources').fireEvent("AjaxError", {status: r.status, text: r.responseText});
        }
      }
    }
  }
});