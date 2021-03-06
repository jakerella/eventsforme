Ext.define('Events.view.EventView', {
  extend: 'Ext.Panel',
  alias: 'widget.eventview',
  requires: ['Events.util.Helper'],

  config: {
    layout: { type: 'card' },
    scrollable: true,

    tpl: new Ext.XTemplate(
      "<div class='eventView'>",
        "<h3>",
          "{title} <a href='{link}' class='eventLink x-button-icon action x-icon-mask' id='eventLink-{id}' target='_blank'></a>",
        "</h3>",
        "<p class='eventTickets'>",
          "<tpl if='tickets'>",
            "<img src='resources/images/ticket.png' class='ticketIcon' /> ",
            "<tpl if='ticket_link'>",
              "<a href='{ticket_link}' class='ticketLink' target='_blank'>required</a>",
            "<tpl else>",
              "required ",
            "</tpl>",
          "<tpl else>",
            "<tpl if='ticket_link'>",
              "<img src='resources/images/ticket.png' class='ticketIcon' /> ",
              "<a href='{ticket_link}' class='ticketLink' target='_blank'>tickets</a>",
            "</tpl>",
          "</tpl>",
          "<tpl if='cost'>",
            "<img src='resources/images/dollar.png' class='costIcon' /> {[this.formatCost(values.cost)]}",
          "</tpl>",
        "</p>",
        "<p class='eventTimes subtitle'>{[Helper.getDateTimeRange(values.start, values.end)]}</p>",
        "<tpl if='location'>",
          "<p class='eventLocation subtitle'>Location: {[Helper.escapeHtmlEntities(values.location)]}</p>",
        "</tpl>",
        "<tpl if='address'>",
          "<p class='eventAddress subtitle'><a href='maps:q={[Helper.escapeHtmlEntities(values.address)]}'>{[Helper.escapeHtmlEntities(values.address)]}</a></p>",
        "</tpl>",
        "<p class='eventMeta subtitle'>",
          "<tpl if='category'>",
            "<span class='eventCategory'>Category: {category}</span>",
          "</tpl>",
          "<tpl if='source'>",
            " <span class='eventSource'>(source: {source})</span>",
          "</tpl>",
        "</p>",
        "<div class='eventDescription'>{description}</div>",
      "</div>",
      {
        formatCost: function(cost) {
          var nCost = Number(cost);
          return (nCost)?nCost.toFixed(2):cost;
        }
      }
    ),

    listeners: {
      swipe: {
        fn: function(evt, el){
          if (evt.direction == 'right' && !Helper.getBackButton().getHidden()) {
            history.back();
          }
        },
        element: 'element'
      }
    }
  }
  
});