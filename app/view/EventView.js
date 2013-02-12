Ext.define('Events.view.EventView', {
  extend: 'Ext.Panel',
  alias: 'widget.eventview',

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
            "<img src='resources/images/ticket.png' class='ticketIcon' /> required ",
          "</tpl>",
          "<tpl if='cost'>",
            "<img src='resources/images/dollar.png' class='costIcon' /> {[this.formatCost(values.cost)]}",
          "</tpl>",
        "</p>",
        "<p class='eventTimes subtitle'>{[Events.Util.getDateTimeRange(values.start, values.end)]}</p>",
        "<tpl if='location'>",
          "<p class='eventLocation subtitle'>Location: {[Events.Util.escapeHtmlEntities(values.location)]}</p>",
        "</tpl>",
        "<tpl if='address'>",
          "<p class='eventAddress subtitle'><a href='maps:q={[Events.Util.escapeHtmlEntities(values.address)]}'>{[Events.Util.escapeHtmlEntities(values.address)]}</a></p>",
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
          cost = Number(cost);
          return (cost)?cost.toFixed(2):0;
        }
      }
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