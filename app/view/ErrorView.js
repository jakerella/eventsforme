Ext.define('Events.view.ErrorView', {
  extend: 'Ext.Panel',
  alias: 'widget.errorview',

  config: {
    layout: { type: 'card' },
    data: { // default data
      code: 500,
      hash: '',
      msg: null,
      detail: null,
    },

    tpl: new Ext.XTemplate(
      "<div class='error {code}'>",
        "{[this.getErrorContent(values)]}",
      "</div>",
      {
        getErrorContent: function(values) {
          console.log('error data', values);
          var m = "";
          if (values.code == 404) {
            m += "<p class='errorMsg'>Sorry, but I wasn't able to find that page! You can use the tabs at the bottom to find events near you, search for events, and more!</p>"+
                 "<p class='errorDetail'>It looks like you were trying to get to:<br />"+Events.app.baseUrl+'#'+Events.Util.escapeHtmlEntities(values.hash)+"</p>";

          } else if (!values.msg) {
            m += "<p class='errorMsg'>Sorry, but it looks like there was a nasty problem. Please contact us if the problem continues!</p>";

          } else if (values.msg) {
            m += "<p class='errorMsg'>"+values.msg+"</p>";
          }

          if (values.detail) {
            m += "<p class='errorDetail'>"+values.detail+"</p>";
          }

          return m;
        }
      }
    )
  }
  
});