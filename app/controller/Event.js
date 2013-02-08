Ext.define('Events.controller.Event', {
  extend: 'Ext.app.Controller',
  requires: ['Events.model.Event', 'Ext.device.Geolocation', 'Ext.io.User'],

  config: {
    routes: {
      // local events
      'local': 'initLocalEvents',

      // event search
      'search': 'showSearchForm',
      'search-results/:terms/:loc/:dist/:ts': {
        action: 'searchResults',
        conditions: {
          ':terms': "[^\\/]+",
          ':loc': "[^\\/]+",
          ':dist': "[0-9]+",
          ':ts': "[0-9]+"
        }
      },

      // event maps
      'show-map/:sid/:params': {
        action: 'showEventMap',
        conditions: {
          ':sid': "[a-zA-Z]+",
          ':params': "[^\\|]*\\|[^\\|]*\\|[0-9]*"
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

  init: function() {
    Ext.getStore("MyEvents").load({
      callback: function(r, op, s) {
        if (s) {
          console.debug('MyEvents loaded', r);
        } else {
          Ext.Msg.alert('', "Sorry, but we weren't able to load your saved events. Please let us know if the problem continues!", Ext.emptyFn);
          console.warn(op);
        }
      }
    });
  },

  getEventAndShow: function(id) {
    console.log('getting event and showing');
    
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
          // try to get event from search results locally, then remotely, before failing
          var s = Ext.getStore("SearchEvents");
          var event;
          if (s.isLoaded()) {
            event = s.getById(id);
          }
          if (event) {
            c.showEvent(event);

          } else {
            s.load({
              'params': {'id': id},
              callback: function(r, op, s) {
                if (s && r && r[0]) {
                  c.showEvent(r[0]);
                } else if (!s) {
                  Events.Util.loadError(op, 'view/'+id);
                } else {
                  Events.app.getController('Error').showOtherError(401, "Sorry, but I wasn't able to load that event. It may have been deleted. Please select another event!");
                }
              }
            });
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

    Events.app.redirectTo('search-results/'+values.terms+'/'+values.loc+'/'+values.dist+'/'+(new Date()).getTime());
  },

  searchResults: function(terms, loc, dist, ts) {
    Events.Util.setActiveTab('search');
    
    var params = {
      'terms': terms,
      'loc': loc,
      'dist': dist
    };
    var s = Ext.getStore("SearchEvents");
    s.searchParams = params;

    Events.Util.addView({
      xtype: 'eventlist',
      id: 'search-results-'+ts,
      title: 'Event Search Results',
      hash: 'search-results/'+terms+'/'+loc+'/'+dist,
      store: s.load({
        'params': params,
        callback: function(r, op, s) { if (!s) { Events.Util.loadError(op, 'search'); } }
      })
    });

    Events.Util.getMapButton().setHidden(false);
  },

  showLocalEvents: function(pos, dist) {
    dist = Ext.Number.from(dist, Events.app.defDist);
    dist = (dist > 0)?dist:Events.app.defDist;

    console.log('showing local events', pos, dist);

    Events.Util.setActiveTab('local');

    var params = {terms: ''};
    if (pos && pos.coords) {
      params.loc = pos.coords.latitude+', '+pos.coords.longitude;
    } else if (pos && pos.substr && pos.length) {
      params.loc = pos;
    }
    if (dist) {
      params.dist = dist;
    }

    var s = Ext.getStore("SearchEvents");
    s.searchParams = params;

    Events.Util.addView({
      xtype: 'eventlist',
      id: 'local-events',
      title: 'Events Near You',
      hash: 'local',
      store: s.load({
        'params': params,
        callback: function(r, op, s) { if (!s) { Events.Util.loadError(op, 'local'); } }
      })
    });

    Events.Util.getMapButton().setHidden(false);
  },

  showMyEvents: function() {
    Events.Util.setActiveTab('my-events');

    Events.Util.addView({
      xtype: 'eventlist',
      id: 'my-events',
      hash: 'my-events',
      title: 'My Events',
      store: Ext.getStore("MyEvents").load({
        callback: function(r, op, s) { if (!s) { Events.Util.loadError(op, 'my-events'); } }
      })
    });

    Events.Util.getMapButton().setHidden(false);
  },

  handleShowMapClick: function(store) {
    var sp = Ext.merge({'terms': '', 'loc': '', 'dist': Events.app.defDist}, store.searchParams);

    Events.app.redirectTo(this.getMapHash(store, sp));
  },

  showEventMap: function(sId, params) {
    var store = Ext.getStore(sId);

    console.log('showing event map', store);

    if (store) {
      if (store.isLoaded()) {
        
        this.doShowMap(store);

      } else {
        var c = this;

        params = params.split('|');
        params = {
          terms: ((params[0])?params[0]:''),
          loc: ((params[1])?params[1]:null),
          dist: ((params[2])?params[2]:Events.app.defDist)
        };
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
            if (s) {
              c.doShowMap(store);
            } else {
              Events.Util.loadError(op, this.getMapHash(store, params));
            }
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
    p = Ext.merge({'terms': '', 'loc': '', 'dist': Events.app.defDist}, p);
    return 'show-map/'+s.getStoreId()+'/'+p.terms+'|'+p.loc+'|'+p.dist;
  }

});