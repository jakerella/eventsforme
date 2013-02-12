Ext.define('Events.controller.Event', {
  extend: 'Ext.app.Controller',
  requires: ['Events.util.Helper', 'Events.model.Event', 'Ext.device.Geolocation'],

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
      mapButton: '#map-events',
      eventList: 'eventlist',
      eventMap: 'eventmap'
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
      },
      eventList: {
        'ShowEventView': 'handleShowEvent'
      },
      eventMap: {
        'ShowEventView': 'handleShowEvent'
      }
    }
  },

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

    console.log('serializing params with defaults: ', Helper.getDefParams());

    var p = Ext.merge(Helper.getDefParams(), params);
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
        'dist': p[3]
      };
    } else if (p.length == 2) {
      p = {
        'loc': p[0],
        'dist': p[1]
      };
    } else {
      p = {};
    }
    p = Ext.merge(Helper.getDefParams(), p);
    return p;
  },


  // ------------- VIEW, SAVE, REMOVE SINGLE EVENT ------------- //

  handleShowEvent: function(id) {
    this.getApplication().redirectTo('view/'+id);
  },

  getEventAndShow: function(id) {
    if (!id) {
      this.getApplication().getController('Error').showOtherError(401, "Sorry, but I wasn't able to load that event, can you try again?");
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
                    this.getApplication().getController('Error').showOtherError(401, "Sorry, but I wasn't able to load that event. It may have been deleted. Please select another event!");
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
          
    Helper.setActiveTab(null);

    Helper.addView({
      xtype: 'eventview',
      id: 'view-event-'+event.get('id'),
      title: 'View Event',
      hash: 'view/'+event.get('id'),
      record: event
    }, this.getApplication());

    if (!event.get('saved')) {
      Helper.getSaveButton().setHidden(false);
    } else {
      Helper.getRemoveButton().setHidden(false);
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
          Helper.getSaveButton().setHidden(true);
          Helper.getRemoveButton().setHidden(false);

          var mine = Ext.getStore("MyEvents");
          if (mine.isLoaded()) {
            mine.add(e);
            mine.sync();
          }

          Helper.getNavBar().changeMyEventsBadge(1);
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
              Helper.getSaveButton().setHidden(false);
              Helper.getRemoveButton().setHidden(true);
              
              var mine = Ext.getStore("MyEvents");
              if (mine.isLoaded()) {
                mine.remove(e);
                mine.sync();
              }

              Helper.getNavBar().changeMyEventsBadge(-1);
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
    Helper.setActiveTab('search');

    Helper.addView({
      xtype: 'eventsearch',
      id: 'search-form',
      hash: 'search',
      title: 'Search for Events',
      listeners: {
        'searchEvents': this.doSearch,
        scope: this
      }
    }, this.getApplication());
  },

  doSearch: function(values) {
    console.log('searching events', values);

    values = (values)?values:{};
    values.terms = (values.terms)?values.terms:'';
    values.loc = (values.loc)?values.loc:'';
    values.dist = (values.dist)?values.dist:''+Helper.defDist;

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

    this.getApplication().redirectTo('search-results/'+this.serializeParams(values)+'/'+(new Date()).getTime());
  },

  searchResults: function(params, ts) {
    Helper.setActiveTab('search');
    
    params = this.unserializeParams(params);
    ts = (ts)?ts:(new Date()).getTime();

    var s = Ext.getStore("SearchEvents");
    if (!s.isLoaded() || !Helper.isEqual(s.searchParams, params)) {
      s.searchParams = params;
      s.load({
        'params': params,
        callback: function(r, op) {
          if (r.length) {
            Helper.getMapButton().setHidden(false);
          }
        }
      });
    }

    Helper.addView({
      xtype: 'eventlist',
      id: 'search-results-'+ts,
      title: 'Event Search Results',
      hash: 'search-results/'+this.serializeParams(params)+'/'+ts,
      store: s
    }, this.getApplication());

    // wait for view to be added to turn on the map button
    Helper.getMapButton().setHidden(!s.getAllCount());
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
          this.getApplication().redirectTo('search');
        }
      });
    } else {
      this.getApplication().redirectTo('search');
    }
  },

  showLocalEvents: function(loc) {
    console.log('showing local events', loc);

    Helper.setActiveTab('local');

    var p = {};
    if (loc && loc.coords) {
      p.loc = loc.coords.latitude+', '+loc.coords.longitude;
    } else if (loc && loc.substr && loc.length) {
      p.loc = loc;
    }
    p = this.unserializeParams(this.serializeParams(p)); // will add in defaults & ensure proper format

    var s = Ext.getStore("LocalEvents");
    if (!s.isLoaded() || !Helper.isEqual(s.searchParams, p)) {
      s.searchParams = p;
      s.load({
        'params': p,
        callback: function(r, op) {
          if (r.length) {
            Helper.getMapButton().setHidden(false);
          }
        }
      });
    }

    Helper.addView({
      xtype: 'eventlist',
      id: 'local-events',
      title: 'Events Near You',
      hash: 'local',
      store: s
    }, this.getApplication());

    // wait for view to be added to turn on the map button
    Helper.getMapButton().setHidden(!s.getAllCount());
  },


  // ------------- STORED EVENTS ------------- //

  showMyEvents: function() {
    Helper.setActiveTab('my-events');

    var s = Ext.getStore("MyEvents").load();

    Helper.addView({
      xtype: 'eventlist',
      id: 'my-events',
      hash: 'my-events',
      title: 'My Events',
      store: s
    }, this.getApplication());

    // wait for store to be loaded and view added to turn on the map button
    setTimeout(function() {
      Helper.getMapButton().setHidden(!s.getAllCount());
    }, 200);
  },


  // ------------- EVENT MAPPING ------------- //

  handleShowMapClick: function(store) {
    this.getApplication().redirectTo(this.getMapHash(store, store.searchParams));
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
            this.getApplication().redirectTo('search');
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
      this.getApplication().getController('Error').showOtherError(500, "Sorry, but I wasn't able to load the events for this map, can you try again?");
    }
  },

  doShowMap: function(s) {
    if (s.getStoreId() == 'MyEvents') {
      Helper.setActiveTab('my-events');
    } else if (s.searchParams && s.searchParams.terms && s.searchParams.terms.length) {
      Helper.setActiveTab('search');
    } else {
      Helper.setActiveTab('local');
    }

    Helper.addView({
      xtype: 'eventmap',
      id: 'event-map',
      hash: this.getMapHash(s, s.searchParams),
      title: 'Event Map',
      store: s
    }, this.getApplication());
  },

  getMapHash: function(s, p) {
    p = this.unserializeParams(this.serializeParams(p)); // will add in defaults & ensure proper format
    return 'show-map/'+s.getStoreId()+'/'+this.serializeParams(p);
  }

});