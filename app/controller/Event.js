Ext.define('Events.controller.Event', {
  extend: 'Ext.app.Controller',
  requires: ['Events.model.Event', 'Ext.device.Geolocation'],

  config: {
    routes: {
      // local events
      '': 'initLocalEvents',
      'local': 'initLocalEvents',
      'local/:dist': {
        action: 'initLocalEvents',
        conditions: {
          ':dist': "[0-9]+"
        }
      },

      // event search
      'search': 'showSearchForm',

      // event detail
      'view/:eid': {
        action: 'getEventAndShow',
        conditions: {
          ':eid': "[0-9]+"
        }
      }
    }
  },

  getEventAndShow: function(id) {
    console.log('getting event and showing');
    
    if (!Ext.Number.from(id, null)) {
      Events.app.getController('Error').showOtherError("Sorry, but I wasn't able to load that event, can you try again?");
      return;
    }

    var c = this;
    Events.model.Event.load(
      Ext.Number.from(id, null),
      {
        success: function(event) {
          console.log("Showing event id: "+id, event);
          
          Events.Util.setActiveTab(null);

          Events.Util.addView({
            xtype: 'eventview',
            id: 'view-event-'+id,
            title: 'View Event',
            hash: 'view/'+id,
            record: event
          });
        },
        failure: function(r, op) { Events.Util.loadError(op, 'view/'+Events.Util.escapeHtmlEntities(id)); }
      }
    );
  },

  initLocalEvents: function(dist) {
    var c = this;
    if (Ext.feature.has('Geolocation')) {
      Ext.device.Geolocation.getCurrentPosition({
        success: function(pos) {
          c.showLocalEvents(pos, dist);
        },
        failure: function(e) {
          console.warn("Unable to get Geolocation", e);
          Events.app.redirectTo('search');
        }
      });
    } else {
      Events.app.redirectTo('search');
    }    
  },

  showSearchForm: function() {
    console.log("Showing event search input");

    Events.Util.setActiveTab('search');

    Events.Util.addView({
      xtype: 'eventsearch',
      id: 'search-form',
      hash: 'search',
      title: 'Search for Events',
    });

    // TODO: add search handler
    
  },

  showLocalEvents: function(pos, dist) {
    dist = Ext.Number.from(dist, Events.app.minDist);
    dist = (dist > 0)?dist:Events.app.minDist;

    console.log('showing local events', pos, dist);

    Events.Util.setActiveTab('local');

    var params = {};
    if (pos && pos.coords) {
      params.lat = pos.coords.latitude;
      params.lng = pos.coords.longitude;
    } else if (pos && pos.substr && pos.length) {
      params.loc = pos;
    }
    if (dist) {
      params.dist = dist;
    }

    Events.Util.addView({
      xtype: 'eventlist',
      id: 'local-events',
      title: 'Events Near You',
      hash: 'local'+((dist)?'/'+dist:''),
      store: Ext.getStore("LocalEvents").load({
        'params': params,
        failure: function(r, op) { Events.Util.loadError(op, 'local'+((dist)?'/'+dist:'')); }
      })
    });
  }

});