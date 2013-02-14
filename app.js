//<debug>
Ext.Loader.setPath({
  'Ext': 'touch/src',
  'Events': 'app',
  'Ux': 'vendor/Ux'
});
//</debug>


// TODO ITEMS:
//   List sources used
//   Enable/Disable sources used
//   Add event to My Events from form
//   Export all saved events as iCal
//   Paging on search
//   Add other event sources
//   Suggest a new source
//   Suggest event for publication (from self-created one)
//   New styling/theme
//   Add sharing info
//   Allow single event retrieval from cache
//   Region-specific sources (metro areas, like LA Times event listings)


Ext.application({
  name: 'Events',

  requires: ['Events.util.Helper', 'Ext.MessageBox', 'Ext.Toolbar', 'Ext.Button', 'Ext.Spacer'],

  controllers: ['Event', 'Static', 'Options', 'Error'],
  views: [
    'EventNav', 'Options', 'About', // Static-ish elements
    'EventList', 'EventView', 'EventSearch', 'EventMap', // For viewing/searhcing events
    'ErrorView' // Other
  ],
  models: ['Event', 'Option', 'Source'],
  stores: ['LocalEvents', 'SearchEvents', 'MyEvents', 'MyOptions', 'Sources'],

  icon: {
    '57': 'resources/icons/Icon.png',
    '72': 'resources/icons/Icon~ipad.png',
    '114': 'resources/icons/Icon@2x.png',
    '144': 'resources/icons/Icon~ipad@2x.png'
  },
  isIconPrecomposed: true,
  startupImage: {
    '320x460': 'resources/startup/320x460.jpg',
    '640x920': 'resources/startup/640x920.png',
    '768x1004': 'resources/startup/768x1004.png',
    '748x1024': 'resources/startup/748x1024.png',
    '1536x2008': 'resources/startup/1536x2008.png',
    '1496x2048': 'resources/startup/1496x2048.png'
  },

  launch: function() {
    // Destroy the #appLoadingIndicator element
    Ext.fly('appLoadingIndicator').destroy();
    
    // Sencha Touch doesn't handle non-webkit browsers very well.
    if (!Ext.browser.is.WebKit) {
      Ext.Msg.alert('', "It looks like you are using a "+Ext.browser.name+" browser; unfortunately, this browser does not use the \"webkit\" rendering engine. What that means is that most of the elements of this mobile web app won't look right or work for you!<br /><br />You may want to try a different browser.");
    }
    if (!Ext.feature.has.LocalStorage) {
      Ext.Msg.alert('', "It looks like the browser you are using does not allow for local storage, which is how we save events for you to view later!<br /><br />You may want to try to update your browser, or use a different one.");
    }

    // Add our static components
    Ext.Viewport.add([
      {
        xtype: 'titlebar',
        title: 'EventsFor.Me',
        id: 'screen-title',
        docked: 'top',
        items: [
          {
            xtype: 'button',
            id: 'nav-back',
            align: 'left',
            ui: 'back',
            text: 'Back',
            hidden: true,
            handler: function() {
              history.back();
            }
          },
          //{xtype: 'spacer'},
          {
            xtype: 'button',
            align: 'right',
            id: 'save-event',
            ui: 'confirm',
            text: 'Save',
            hidden: true,
            handler: this.fireSaveEvent
          },
          {
            xtype: 'button',
            align: 'right',
            id: 'remove-event',
            ui: 'decline',
            text: 'Remove',
            hidden: true,
            handler: this.fireRemoveEvent
          },
          {
            xtype: 'button',
            align: 'right',
            id: 'map-events',
            iconCls: 'maps',
            iconMask: true,
            hidden: true,
            tooltip: 'Show these on a map',
            handler: this.fireShowMap
          }
        ]
      },
      {
        xtype: 'eventsnav',
        id: 'app-nav',
        listeners: {
          'NavClick': {
            fn: function(tab) {
              console.log('redirecting to tab: ', tab, arguments);
              this.redirectTo(tab.config.url);
            },
            scope: this
          }
        }
      }
    ]);

    console.log("launch on App");
  },

  onUpdated: function() {
    Ext.Msg.confirm(
      'Application Update',
      "This application has just successfully been updated to the latest version. Reload now?",
      function(buttonId) {
        if (buttonId === 'yes') {
          window.location.reload();
        }
      }
      );
  },


  // ------------------ Application helpers ----------------- //
  
  fireSaveEvent: function() {
    var e;
    var v = Ext.Viewport.getActiveItem();
    if (v instanceof Events.view.EventView) {
      e = v.getRecord();
    }
    if (e) {
      this.fireEvent("saveEvent", e);
    } else {
      this.getApplication().getController('Error').showOtherError(401, "Sorry, but I wasn't able to find that event. Can you try again?");
    }
  },

  fireRemoveEvent: function() {
    var e;
    var v = Ext.Viewport.getActiveItem();
    if (v instanceof Events.view.EventView) {
      e = v.getRecord();
    }
    if (e) {
      this.fireEvent("removeEvent", e);
    } else {
      this.getApplication().getController('Error').showOtherError(401, "Sorry, but I wasn't able to find that event. Can you try again?");
    }
  },

  fireShowMap: function() {
    var s;
    var v = Ext.Viewport.getActiveItem();
    if (v instanceof Events.view.EventList) {
      var s = v.getStore();
    }
    if (s) {
      this.fireEvent("showMap", s);
    } else {
      this.getApplication().getController('Error').showOtherError(401, "Sorry, but I wasn't able to load the events. Can you try again?");
    }
  },


  // ------------------ Application Constants ----------------- //
  
  routeAliases: {
    '': 'local',
    'mine': 'my-events',
    'map': 'show-map/MyEvents'
  }

});

