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
      hash: 'about',
      html: "<p>Coming soon!</p>",
      listeners: {
        swipe: {
          fn: function(evt, el){
            if (evt.direction == 'right' && !Events.Util.getBackButton().getHidden()) {
              history.back();
            }
          },
          element: 'element'
        }
      }
    });
  }

});