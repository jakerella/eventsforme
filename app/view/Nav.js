Ext.define('Events.view.Nav', {
  extend: 'Ext.tab.Bar',
  alias: 'widget.eventsnav',

  config: {
    docked: "bottom",
    items: [
      {
        title: 'Local Events',
        iconCls: 'locate',
        id: 'nav-local',
        url: 'local'
      },
      {
        title: 'Search',
        iconCls: 'search',
        id: 'nav-search',
        url: 'search'
      },
      {
        title: 'My Events',
        iconCls: 'bookmarks',
        id: 'nav-my-events',
        url: 'my-events'
      },
      {
        title: 'About',
        iconCls: 'info',
        id: 'nav-about',
        url: 'about'
      }
    ],
    control: {
      'button': {
        tap: function(tab) {
          this.fireEvent(tab.url+"NavClick", tab);
          Events.app.redirectTo(tab.url);
        }
      }
    }
  }

});