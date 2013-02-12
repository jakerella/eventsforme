Ext.define('Events.controller.Error', {
  extend: 'Ext.app.Controller',
  requires: ['Events.util.Helper'],

  config: {
    routes: {
      ':foobar': {
        action: 'showNotFound',
        conditions: {
          ':foobar': ".*"
        }
      }
    }
  },

  init: function() {
    var c = this;
    Ext.getStore('LocalEvents').setListeners({
      AjaxError: function(r) {
        if (r.status) {
          if (r.status > 499) {
            c.showServerError();
          } else if (r.status == 404) {
            c.showServerError(500, r.text); // for ajax requests, a 404 is bad, and is really a 500
          } else if (r.status > 399) {
            c.showOtherError(r.status, r.text);
          }
        } else {
          // Generic handler
          c.showServerError();
        }
      }
    });
  },

  handleAjaxError: function(status, response, hash) {

  },

  showNotFound: function(hash) {
    var app = this.getApplication();
    if (app.routeAliases[hash]) {
      console.log("Redirecting alias '"+hash+"' -> '"+app.routeAliases[hash]+"'");
      app.redirectTo(app.routeAliases[hash]);
      return;
    }

    console.warn("Uh oh, didn't find that route", hash);

    Helper.setActiveTab(null);

    Helper.addView({
      xtype: "errorview",
      title: 'Uh oh...',
      hash: 'error',
      data: {
        'code': 404,
        'hash': hash
      }
    }, app);
  },

  showOtherError: function(code, msg) {
    code = (code)?code:401;

    Helper.setActiveTab(null);

    Helper.addView({
      xtype: "errorview",
      title: 'Uh oh...',
      hash: 'error',
      data: {
        'code': code,
        'msg': msg
      }
    }, this.getApplication());
  },

  showServerError: function(code, msg) {
    code = (code)?code:500;

    Helper.setActiveTab(null);

    Helper.addView({
      xtype: "errorview",
      title: 'Uh oh...',
      hash: 'error',
      data: {
        'code': code,
        'detail': msg
      }
    }, this.getApplication());
  }

});