Ext.define('Events.view.EventSearch', {
  extend: 'Ext.form.Panel',
  requires: ['Ext.form.FieldSet', 'Ext.field.Search', 'Ext.field.Select'],
  alias: 'widget.eventsearch',

  config: {
    scrollable:'vertical'
  },

  initialize: function () {
    this.callParent(arguments);

    var v = this;
    if (Ext.feature.has('Geolocation')) {
      Ext.device.Geolocation.getCurrentPosition({
        success: function(pos) {

          // TODO: get "City, State" instead

          v.addFormViews(pos.coords.latitude.toFixed(4)+', '+pos.coords.longitude.toFixed(4));
        },
        failure: function() { v.addFormViews(''); }
      });
    } else {
      v.addFormViews('');
    }
  },

  addFormViews: function(locVal) {
    var terms = {
      xtype: 'searchfield',
      name: 'terms',
      placeHolder: 'Keywords'
    };

    var loc = {
      xtype: 'searchfield',
      name: 'loc',
      placeHolder: 'Location',
      value: locVal
    };
    
    var dist = {
      xtype: 'selectfield',
      name: 'dist',
      label: 'Distance',
      value: '20',
      options: [
        {text: '5 miles',  value: '5'},
        {text: '10 miles', value: '10'},
        {text: '15 miles',  value: '15'},
        {text: '20 miles',  value: '20'},
        {text: '30 miles',  value: '30'},
        {text: '50 miles',  value: '50'}
      ]
    };

    var v = this;
    var go = {
      xtype: 'button',
      ui: 'action',
      text: 'Search',
      handler: function() {
        console.log('firing searchEvents event');
        v.fireEvent('searchEvents', this.parent.parent.getValues());
      }
    };

    this.add({
      xtype: 'fieldset',
      id: 'search-fields',
      items: [terms, loc, dist, go]
    });
  }
  
});