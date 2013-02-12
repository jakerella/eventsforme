Ext.define('Events.view.EventList', {
  extend: 'Ext.dataview.List',
  alias: 'widget.eventlist',
  requires: ['Events.util.Helper'],

  config: {
    loadingText: "Finding events...",
    emptyText: "<p class='noEvents'>I couldn't find any events! How sad.</p>",

    itemTpl: new Ext.XTemplate(
      "<div class='eventListing'>",
        "<h3>",
          "<tpl if='cost'>",
            "<img src='resources/images/dollar.png' class='costIcon' /> ",
          "</tpl>",
          "<tpl if='tickets'>",
            "<img src='resources/images/ticket.png' class='ticketIcon' /> ",
          "</tpl>",
          "{title}",
        "</h3>",
        "<tpl if='location'>",
          "<p class='eventLocation subtitle'>{[Helper.escapeHtmlEntities(values.location)]}</p>",
        "</tpl>",
        "<p class='eventTimes subtitle'>",
          "{[Helper.getDateTimeRange(values.start, values.end)]}",
          "{[this.saveText(values.saved)]}",
        "</p>",
      "</div>",
      "<a href='#view/{id}'>",
        "<div class='x-unsized x-list-disclosure x-dock-item x-docked-right' id='ext-component-8'></div>",
      "</a>",
      {
        saveText: function(saved) {
          if (saved === true) {
            return " <span class='saved'>saved</span>";
          } else {
            return '';
          }
        }
      }
    ),

    listeners: {
      itemswipe: function(list, i, t, r, e) {
        console.log(list);
        if (e.direction == 'left') {
          this.fireEvent('ShowEventView', r.get('id'));
        }
      }
    }
  }
  
});