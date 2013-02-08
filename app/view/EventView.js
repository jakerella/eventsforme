Ext.define('Events.view.EventView', {
  extend: 'Ext.Panel',
  alias: 'widget.eventview',

  config: {
    layout: { type: 'card' },

    tpl: new Ext.XTemplate(
      "<div class='eventView'>",
        "<h3>{title} <a href='{link}' class='eventLink x-button-icon action x-icon-mask' id='eventLink-{id}' target='_blank'></a></h3>",
        "<p class='eventTimes subtitle'>{[Events.Util.getDateTimeRange(values.start, values.end)]}</p>",
        "<tpl if='location'>",
          "<p class='eventLocation subtitle'>Location: {[Events.Util.escapeHtmlEntities(values.location)]}</p>",
        "</tpl>",
        "<tpl if='category'>",
          "<p class='eventCategory subtitle'>Category: {category}</p>",
        "</tpl>",
        "<p class='eventDescription'>{[Events.Util.escapeHtmlEntities(values.description)]}</p>",
      "</div>"
    ),

    listeners: {
      swipe: {
        fn: function(evt, el){
          if (evt.direction == 'right' && !Events.Util.getBackButton().getHidden()) {
            history.back();
          }
        },
        element: 'element'
      }
    }
  }
  
});