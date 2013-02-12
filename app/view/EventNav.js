Ext.define('Events.view.EventNav', {
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
      //,
      // {
      //   title: 'Options',
      //   iconCls: 'settings',
      //   id: 'nav-options',
      //   url: 'options'
      // }
    ],

    control: {
      'button': {
        tap: function(tab) {
          this.fireEvent(tab.url+"NavClick", tab);
          Events.app.redirectTo(tab.url);
        }
      }
    }
  },

  initialize: function() {
    var v = this;

    Events.app.on('eventSaved', function(e) {
      v.changeMyEventsBadge(1);
    });
    Events.app.on('eventRemoved', function(e) {
      v.changeMyEventsBadge(-1);
    });

    var mine = Ext.getStore('MyEvents');
    if (mine.isLoaded) {
      v.getComponent('nav-my-events').setBadgeText(mine.getAllCount());
    }
    mine.on('load', function() {
      v.getComponent('nav-my-events').setBadgeText(mine.getAllCount());
    });
  },

  changeMyEventsBadge: function(change) {
    var b = this.getComponent('nav-my-events');
    if (b) {
      change = Ext.Number.from(change, 0);
      var cnt = b.getBadgeText();
      cnt = (Ext.Number.from(cnt, 0))?Ext.Number.from(cnt, 0):0;
      b.setBadgeText(Math.max(0, (cnt + change)));
    }
  }

});