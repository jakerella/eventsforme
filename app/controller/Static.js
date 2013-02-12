Ext.define('Events.controller.Static', {
  extend: 'Ext.app.Controller',
  requires: ['Ux.layout.Accordion'],

  config: {
    routes: {
      'about': 'showAbout',
      'donate-thanks': 'showDonateThanks'
    }
  },

  showAbout: function() {
    Events.Util.setActiveTab('about');

    var v = Events.Util.addView({
      xtype: 'aboutview',
      id: 'about-view',
      title: 'EventsFor.Me',
      hash: 'about'
    });

    v.getItems().each(function(item, i) {
      v.layout.collapse(item);
    });
    v.layout.expand(v.getItems().get(0));
  },

  showDonateThanks: function() {
    Events.Util.setActiveTab('about');

    Events.Util.addView({
      xtype: 'panel',
      id: 'donate-view',
      title: 'Hey, Thanks!',
      hash: 'donate-thanks',
      cls: 'staticScreen',
      html: 
        "<p>Hey! Thanks for donating to the EventsFor.Me app!</p>"+
        "<p>We really appreciate your gift, it will go towards hosting and - to be honest - beer. If you are interested in helping us make EventsFor.Me better just <a href='https://github.com/jakerella/eventsforme/issues'>visit us on github</a> and submit a feature request or bug report!</p>"
    });
  }

});