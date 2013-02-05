Ext.define('Events.view.Search', {
  extend: 'Ext.form.Panel',
  requires: [ 'Ext.form.FieldSet', 'Ext.field.Search' ],
  alias: 'widget.eventsearch',

  config: {
    scrollable:'vertical'
  },

  initialize: function () {
    this.callParent(arguments);

    // TODO: add form elements
    
    var q = {
      xtype: 'searchfield',
      name: 'q',
      placeHolder: 'Keywords'
    };

    var loc = {
      xtype: 'searchfield',
      name: 'loc',
      placeHolder: 'Location'
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

    var go = {
      xtype: 'button',
      ui: 'action',
      text: 'Search',
      handler: function() {
        console.log('searching events', this.parent.parent.getValues());
        this.fireEvent('searchEvents', this.parent.parent.getValues());
      }
    };

    this.add({
      xtype: 'fieldset',
      id: 'search-fields',
      items: [q, loc, dist, go]
    });
  }
  
});