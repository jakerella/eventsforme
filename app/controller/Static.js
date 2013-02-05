Ext.define('Events.controller.Static', {
  extend: 'Ext.app.Controller',

  config: {
    routes: {
      'about': 'showAbout'
    }
  },

  showAbout: function() {
    console.log('showing about screen');

    // TODO: add content

    Events.Util.setActiveTab('about');

    Events.Util.addView({
      xtype: 'panel',
      id: 'about-view',
      title: 'About the App',
      html: 
        "<p>Coming soon!</p>"
    });
  }

});