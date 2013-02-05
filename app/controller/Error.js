Ext.define('Events.controller.Error', {
  extend: 'Ext.app.Controller',

  config: {
    routes: {
      ':foobar': {
        action: 'showNotFound',
        conditions: {
          ':foobar': ".+"
        }
      }
    }
  },

  showNotFound: function(hash) {
    console.warn("Uh oh, didn't find that route", hash);

    Events.Util.setActiveTab(null);

    Events.Util.addView({
      xtype: "errorview",
      title: 'Uh oh...',
      data: {
        'code': 404,
        'hash': hash
      }
    });
  },

  showOtherError: function(code, msg) {
    code = (code)?code:401;
    
    Events.Util.setActiveTab(null);

    Events.Util.addView({
      xtype: "errorview",
      title: 'Uh oh...',
      data: {
        'code': code,
        'msg': msg
      }
    });
  },

  showServerError: function(code, msg) {
    code = (code)?code:500;
    
    Events.Util.setActiveTab(null);

    Events.Util.addView({
      xtype: "errorview",
      title: 'Uh oh...',
      data: {
        'code': code,
        'msg': msg
      }
    });
  }

});