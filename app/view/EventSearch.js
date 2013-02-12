Ext.define('Events.view.EventSearch', {
  extend: 'Ext.form.Panel',
  requires: ['Events.util.Helper', 'Ext.field.Search', 'Ext.field.Select', 'Ext.Button', 'Ext.form.FieldSet'],
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
      placeHolder: 'City, State',
      value: locVal
    };

    var time = {
      xtype: 'selectfield',
      name: 'time',
      label: 'Time Range',
      value: Helper.config.defDays,
      options: [
        {text: 'Today',  value: '1'},
        {text: 'Next 3 Days', value: '3'},
        {text: 'Next 7 Days',  value: '7'},
        {text: 'Next 2 Weeks',  value: '14'},
        {text: 'Next 30 Days',  value: '30'}
      ]
    };
    
    var dist = {
      xtype: 'selectfield',
      name: 'dist',
      label: 'Distance',
      value: Helper.config.defDist,
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
      items: [terms, loc, time, dist, go]
    });
  }
  
});