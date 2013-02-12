Ext.define('Events.controller.Event', {
  extend: 'Ext.app.Controller',
  requires: ['Events.model.Event', 'Ext.device.Geolocation'],

  config: {
    id: 'eventcontroller',

    routes: {
      // local events
      'local': 'initLocalEvents',

      // event search
      'search': 'showSearchForm',
      'search-results/:params/:ts': {
        action: 'searchResults',
        conditions: {
          ':params': "[^\\|]*\\|[^\\|]*\\|[0-9]*\\|[0-9]*",
          ':ts': "[0-9]+"
        }
      },

      // event maps
      'show-map/:sid/:params': {
        action: 'showEventMap',
        conditions: {
          ':sid': "[a-zA-Z]+",
          ':params': "[^\\|]*\\|[^\\|]*\\|[0-9]*\\|[0-9]*"
        }
      },

      // event detail
      'view/:eid': {
        action: 'getEventAndShow',
        conditions: {
          ':eid': "[a-zA-Z0-9\-]+"
        }
      },

      // user stored events
      'my-events': 'showMyEvents'
    },

    refs: {
      saveButton: '#save-event',
      removeButton: '#remove-event',
      mapButton: '#map-events'

    },
    control: {
      saveButton: {
        'saveEvent': 'saveEvent'
      },
      removeButton: {
        'removeEvent': 'removeEvent'
      },
      mapButton: {
        'showMap': 'handleShowMapClick'
      }
    }
  },

  // Statics & Constants
  defParams: {'terms': '', 'loc': '', 'time': Events.app.defDays, 'dist': Events.app.defDist},

  init: function() {
    Ext.getStore("MyEvents").load({
      callback: function(r, op, s) {
        if (!s) {
          Ext.Msg.alert('', "Sorry, but we weren't able to load your saved events. Please let us know if the problem continues!", Ext.emptyFn);
          console.warn(op);
        }
      }
    });
  },

  serializeParams: function(params) {
    params = (params)?params:{};
    var p = Ext.merge(Ext.clone(this.defParams), params);
    return p.terms+'|'+p.loc+'|'+p.time+'|'+p.dist;
  },
  unserializeParams: function(params) {
    params = (params)?params:'';
    var p = params.split('|');
    if (p.length == 4) {
      p = {
        'terms': p[0],
        'loc': p[1],
        'time': p[2],
        'dist': p[3],
      };
    } else if (p.length == 2) {
      p = {
        'loc': p[0],
        'dist': p[1],
      };
    } else {
      p = {};
    }
    p = Ext.merge(Ext.clone(this.defParams), p);
    return p;
  },


  // ------------- VIEW, SAVE, REMOVE SINGLE EVENT ------------- //

  getEventAndShow: function(id) {
    if (!id) {
      Events.app.getController('Error').showOtherError(401, "Sorry, but I wasn't able to load that event, can you try again?");
      return;
    }

    var c = this;
    
    // get it from user's events if they have it stored
    Events.model.Event.load(
      id,
      {
        success: function(event) {
          console.log('event retrieved from user data');
          c.showEvent(event);
        },
        failure: function(r, op) {
          // try to get event from search or local results (remotely if necessary), before failing
          var event;
          var l = Ext.getStore("LocalEvents");
          if (l.isLoaded()) { event = l.getById(id); }
          if (event) {
            c.showEvent(event);
          } else {
            var s = Ext.getStore("SearchEvents");
            if (s.isLoaded()) { event = s.getById(id); }
            if (event) {
              c.showEvent(event);
            } else {
              s.load({
                'params': {'id': id},
                callback: function(r, op, s) {
                  if (s && r && r[0]) {
                    c.showEvent(r[0]);
                  } else if (s) {
                    Events.app.getController('Error').showOtherError(401, "Sorry, but I wasn't able to load that event. It may have been deleted. Please select another event!");
                  }
                }
              });
            }
          }
        }
      }
    );
  },

  showEvent: function(event) {
    console.log("Showing event: ", event);
          
    Events.Util.setActiveTab(null);

    Events.Util.addView({
      xtype: 'eventview',
      id: 'view-event-'+event.get('id'),
      title: 'View Event',
      hash: 'view/'+event.get('id'),
      record: event
    });

    if (!event.get('saved')) {
      Events.Util.getSaveButton().setHidden(false);
    } else {
      Events.Util.getRemoveButton().setHidden(false);
    }
  },

  saveEvent: function(e) {
    if (e.get('saved')) {
      Ext.Msg.alert('', "It looks like you have already saved this Event!", Ext.emptyFn);

    } else {
      console.log('saving event', e);

      e.set('saved', true);
      e.save({
        success: function() {
          Events.Util.getSaveButton().setHidden(true);
          Events.Util.getRemoveButton().setHidden(false);

          var mine = Ext.getStore("MyEvents");
          if (mine.isLoaded()) {
            mine.add(e);
            mine.sync();
          }

          Events.app.fireEvent("eventSaved", e);
        },
        failure: function(r, op) {
          console.warn(op);
          Ext.Msg.alert('Uh oh...', "Sorry, but there was a problem saving that event. Can you try again?", Ext.emptyFn);
        }
      });
    }
  },

  removeEvent: function(e) {
    if (!e.get('saved')) {
      Ext.Msg.alert('', "It looks like you haven't saved this Event!", Ext.emptyFn);

    } else {
      console.log('removing event', e);

      e.set('saved', false);
      e.save({
        callback: function() {
          e.erase({
            success: function() {
              Events.Util.getSaveButton().setHidden(false);
              Events.Util.getRemoveButton().setHidden(true);
              
              var mine = Ext.getStore("MyEvents");
              if (mine.isLoaded()) {
                mine.remove(e);
                mine.sync();
              }

              Events.app.fireEvent("eventRemoved", e);
            },
            failure: function(r, op) {
              console.warn(op);
              Ext.Msg.alert('Uh oh...', "Sorry, but there was a problem removing that event. Can you try again?", Ext.emptyFn);
            }
          });
        }
      });
    }
  },


  // ------------- SEARCH EVENTS ------------- //

  showSearchForm: function() {
    Events.Util.setActiveTab('search');

    Events.Util.addView({
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
    values.terms = (values.terms)?values.terms:'';
    values.loc = (values.loc)?values.loc:'';
    values.dist = (values.dist)?values.dist:''+Events.defDist;

    values.terms = values.terms.replace(/[^a-zA-Z0-9\-\,\.\!\(\)\@\$\?\:\'\" ]/g, '');
    values.loc = values.loc.replace(/[^a-zA-Z0-9\-\,\'\. ]/g, '');
    values.dist = values.dist.replace(/[^0-9]/g, '');

    if (!values.terms || !values.terms.length) {
      Ext.Msg.alert("", "Please enter some keywords to search for!", Ext.emptyFn);
      return;
    } else if (!values.loc || !values.loc.length) {
      Ext.Msg.alert("", "Please enter a location to search in!", Ext.emptyFn);
      return;
    }

    Events.app.redirectTo('search-results/'+this.serializeParams(values)+'/'+(new Date()).getTime());
  },

  searchResults: function(params, ts) {
    Events.Util.setActiveTab('search');
    
    params = this.unserializeParams(params);
    ts = (ts)?ts:(new Date()).getTime();

    var s = Ext.getStore("SearchEvents");
    if (!s.isLoaded() || !Events.Util.isEqual(s.searchParams, params)) {
      s.searchParams = params;
      s.load({
        'params': params,
        callback: function(r, op) {
          if (r.length) {
            Events.Util.getMapButton().setHidden(false);
          }
        }
      });
    }

    Events.Util.addView({
      xtype: 'eventlist',
      id: 'search-results-'+ts,
      title: 'Event Search Results',
      hash: 'search-results/'+this.serializeParams(params)+'/'+ts,
      store: s
    });

    // wait for view to be added to turn on the map button
    Events.Util.getMapButton().setHidden(!s.getAllCount());
  },

  // ------------- LOCAL EVENTS ------------- //

  initLocalEvents: function() {
    var c = this;
    if (Ext.feature.has('Geolocation')) {
      Ext.device.Geolocation.getCurrentPosition({
        success: function(pos) {
          c.showLocalEvents(pos);
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

  showLocalEvents: function(loc) {
    console.log('showing local events', loc);

    Events.Util.setActiveTab('local');

    var p = {};
    if (loc && loc.coords) {
      p.loc = loc.coords.latitude+', '+loc.coords.longitude;
    } else if (loc && loc.substr && loc.length) {
      p.loc = loc;
    }
    p = this.unserializeParams(this.serializeParams(p)); // will add in defaults & ensure proper format

    var s = Ext.getStore("LocalEvents");
    if (!s.isLoaded() || !Events.Util.isEqual(s.searchParams, p)) {
      s.searchParams = p;
      s.load({
        'params': p,
        callback: function(r, op) {
          if (r.length) {
            Events.Util.getMapButton().setHidden(false);
          }
        }
      });
    }

    Events.Util.addView({
      xtype: 'eventlist',
      id: 'local-events',
      title: 'Events Near You',
      hash: 'local',
      store: s
    });

    // wait for view to be added to turn on the map button
    Events.Util.getMapButton().setHidden(!s.getAllCount());
  },


  // ------------- STORED EVENTS ------------- //

  showMyEvents: function() {
    Events.Util.setActiveTab('my-events');

    var s = Ext.getStore("MyEvents").load();

    Events.Util.addView({
      xtype: 'eventlist',
      id: 'my-events',
      hash: 'my-events',
      title: 'My Events',
      store: s
    });

    // wait for store to be loaded and view added to turn on the map button
    setTimeout(function() {
      Events.Util.getMapButton().setHidden(!s.getAllCount());
    }, 200);
  },


  // ------------- EVENT MAPPING ------------- //

  handleShowMapClick: function(store) {
    Events.app.redirectTo(this.getMapHash(store, store.searchParams));
  },

  showEventMap: function(sId, params) {
    var store = Ext.getStore(sId);

    console.log('showing event map', store);

    if (store) {
      if (store.isLoaded()) {
        
        this.doShowMap(store);

      } else {
        var c = this;

        params = this.unserializeParams(params);
        store.searchParams = params;

        if (store.getStoreId() == 'SearchEvents' && !params.loc) {
          Ext.Msg.alert('', "Sorry, but you'll need to specify a location to search events!", function() {
            Events.app.redirectTo('search');
          });
          return;
        }

        store.load({
          'params': params,
          callback: function(r, op, s) {
            if (s) { c.doShowMap(store); }
          }
        });
      }
    } else {
      Events.app.getController('Error').showOtherError(500, "Sorry, but I wasn't able to load the events for this map, can you try again?");
    }
  },

  doShowMap: function(s) {
    if (s.getStoreId() == 'MyEvents') {
      Events.Util.setActiveTab('my-events');
    } else if (s.searchParams && s.searchParams.terms && s.searchParams.terms.length) {
      Events.Util.setActiveTab('search');
    } else {
      Events.Util.setActiveTab('local');
    }

    Events.Util.addView({
      xtype: 'eventmap',
      id: 'event-map',
      hash: this.getMapHash(s, s.searchParams),
      title: 'Event Map',
      store: s
    });
  },

  getMapHash: function(s, p) {
    p = this.unserializeParams(this.serializeParams(p)); // will add in defaults & ensure proper format
    return 'show-map/'+s.getStoreId()+'/'+this.serializeParams(p);
  }

});