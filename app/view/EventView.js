Ext.define('Events.view.EventView', {
  extend: 'Ext.Panel',
  alias: 'widget.eventview',

  config: {
    layout: { type: 'card' },
    tpl: new Ext.XTemplate(
      "<div class='eventView'>",
        "<h3><a href='{link}'>{title}</a></h3>",
        "<p class='eventTimes'>{[Events.Util.getDateTimeRange(values.start, values.end)]}</p>",
        "<tpl if='location'>",
          "<p class='eventLocation'>Location: {[Events.Util.escapeHtmlEntities(values.location)]}</p>",
        "</tpl>",
        "<p class='eventDescription'>{[Events.Util.escapeHtmlEntities(values.description)]}</p>",
      "</div>"
    )
  }

  // TODO: fix up this template (account for other stuff, prettify it)
  //       make external link small icon
  
});