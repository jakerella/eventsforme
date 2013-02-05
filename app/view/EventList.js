Ext.define('Events.view.EventList', {
  extend: 'Ext.dataview.List',
  alias: 'widget.eventlist',

  config: {
    loadingText: "Finding events...",
    emptyText: "<p class='noEvents'>No events were found in your area any time soon. How sad.</p>",

    itemTpl: new Ext.XTemplate(
      "<div class='eventListing'>",
        "<h3>{title}</h3>",
        "<tpl if='location'>",
          "<p class='eventLocation'>{[Events.Util.escapeHtmlEntities(values.location)]}</p>",
        "</tpl>",
        "<p class='eventTimes'>",
          "{[Events.Util.getDateTimeRange(values.start, values.end)]}",
        "</p>",
      "</div>",
      "<a href='#view/{id}'>",
        "<div class='x-unsized x-list-disclosure x-dock-item x-docked-right' id='ext-component-8'></div>",
      "</a>"
    )
  }
  
});