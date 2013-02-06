Ext.define('Events.controller.Event', {
  extend: 'Ext.app.Controller',
  requires: ['Events.model.Event', 'Ext.device.Geolocation', 'Ext.io.User'],

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
      'search-results/:terms/:loc/:dist/:ts': {
        action: 'searchResults',
        conditions: {
          ':terms': "[^/]+",
          ':loc': "[^/]+",
          ':dist': "[0-9]+",
          ':ts': "[0-9]+"
        }
      },

      // event detail
      'view/:eid': {
        action: 'getEventAndShow',
        conditions: {
          ':eid': "[0-9]+"
        }
      },

      // user stored events
      'my-events': 'showMyEvents'
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

    var v = Events.Util.addView({
      xtype: 'eventsearch',
      id: 'search-form',
      hash: 'search',
      title: 'Search for Events',
      listeners: {
        'searchEvents': this.doSearch,
        scope: this
      }
    });
  },

  doSearch: function(values) {
    console.log('searching events', values);

    values = (values)?values:{};
    values.terms = (values.terms)?values.terms:null;
    values.loc = (values.loc)?values.loc:null;
    values.dist = (values.dist)?values.dist:Events.defDist;

    values.terms = values.terms.replace(/[^a-zA-Z0-9\-\,\.\!\(\)\@\$\?\:\'\" ]/g, '');
    values.loc = values.loc.replace(/[^a-zA-Z0-9\-\,\'\. ]/g, '');
    values.dist = values.dist.replace(/[^0-9]/g, '');

    if (!values.terms || !values.terms.length || !values.loc || !values.loc.length) {
      Ext.Msg.alert("", "Please enter some keywords and a location to search in!");
      return;
    }

    Events.app.redirectTo('search-results/'+values.terms+'/'+values.loc+'/'+values.dist+'/'+(new Date()).getTime());
  },

  searchResults: function(terms, loc, dist, ts) {
    Events.Util.setActiveTab('search');
    
    Events.Util.addView({
      xtype: 'eventlist',
      id: 'search-results-'+ts,
      title: 'Event Search Results',
      hash: 'search-results/'+terms+'/'+loc+'/'+dist,
      store: Ext.getStore("SearchEvents").load({
        'params': {
          'terms': terms,
          'loc': loc,
          'dist': dist
        },
        failure: function(r, op) { Events.Util.loadError(op, 'search'); }
      })
    });
  },

  showLocalEvents: function(pos, dist) {
    dist = Ext.Number.from(dist, Events.app.defDist);
    dist = (dist > 0)?dist:Events.app.defDist;

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
  },

  showMyEvents: function() {
    var c = this;
    c.onAuth(null, {});
    // They'll need an account now...
    // Ext.io.User.getCurrent(function(user) {
    //   if (user) {
    //     // Already logged in
    //     c.onAuth(user, {});

    //   } else {
    //     // Need to log in or register
    //     c.getApplication().sio.on({
    //       authorized: {fn: c.onAuth, scope: c}
    //     });
    //     c.getApplication().sio.login();
    //   }

    // });
  },

  onAuth: function(user) {
    Events.Util.addView({
      xtype: 'panel',
      id: 'my-events',
      hash: 'my-events',
      title: 'My Events',
      html: "<p>These are yours!</p>"
    });
  }

});