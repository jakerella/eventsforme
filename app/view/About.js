Ext.define('Events.view.About', {
  extend: 'Ext.Panel',
  alias: 'widget.aboutview',
  requires: ['Ext.Panel', 'Ux.layout.Accordion'],

  config: {
    fullscreen : true,
    layout: {
      type: 'accordion',
      mode: 'SINGLE',
      toggleOnTitlebar: true
    },
    scrollable: 'vertical',

    items: [
      {
        xtype: 'panel',
        title: 'What is this?',
        cls: 'staticScreen',
        html: 
          "<p>EventsFor.Me is a simple event aggregator. That just means we comb the Internet to find events in your area (or any area you want to search in) and show you what you need to know! You can view events on a map and even save them for viewing later.</p>"+
          "<p>On a more geeky note, this app was built using the Sencha Touch framework, and is full of the newest HTML5 goodness. It is optimized to be viewed on mobile devices, so if you're on a desktop, well, it may not look its best.</p>"
      },
      {
        xtype: 'panel',
        title: 'Who did this?',
        cls: 'staticScreen',
        html: 
          "<p>This app was written in the Sencha Touch 2 framework for the <a href='http://www.sencha.com/html5-is-ready'>HTML5 Is Ready</a> contest sponsored by <a href='http://www.sencha.com/'>Sencha</a>. Initially the app was written in only two weeks, and by one developer (<a href='http://jordankasper.com'>me</a>!).</p>"+
          "<p>All of the source code is open and up on <a href='https://github.com/jakerella/eventsforme'>github</a>. If you want to help make the app better (by adding new event sources, adding a theme, or anything else), just fork the project and submit a pull request!</p>"+
          "<p>If you are having an issue, please <a href='https://github.com/jakerella/eventsforme/issues'>submit a ticket on github</a>!</p>"+
          "<p>If you like what you see, you could donate a bit for our hosting costs and what not. Just click the button below! And thanks!</p>"+
          "<form action='https://www.paypal.com/cgi-bin/webscr' method='post' class='donateForm'>"+
            "<input type='hidden' name='cmd' value='_s-xclick'>"+
            "<input type='hidden' name='hosted_button_id' value='Q2PJHWGPMUSZU'>"+
            "<input type='image' src='https://www.paypalobjects.com/en_US/i/btn/btn_donate_LG.gif' border='0' name='submit' alt='PayPal - The safer, easier way to pay online!'>"+
            "<img alt='' border='0' src='https://www.paypalobjects.com/en_US/i/scr/pixel.gif' width='1' height='1'>"+
          "</form>"
      },
      {
        xtype: 'panel',
        title: 'Wait... this is free?',
        cls: 'staticScreen',
        html: 
          "<p>Yep, completely free! ... mostly because I hate coding payment processes. That said, if you want to help us out you could donate a little to our hosting an beer fund!</p>"+
          "<form action='https://www.paypal.com/cgi-bin/webscr' method='post' class='donateForm'>"+
            "<input type='hidden' name='cmd' value='_s-xclick'>"+
            "<input type='hidden' name='hosted_button_id' value='Q2PJHWGPMUSZU'>"+
            "<input type='image' src='https://www.paypalobjects.com/en_US/i/btn/btn_donate_LG.gif' border='0' name='submit' alt='PayPal - The safer, easier way to pay online!'>"+
            "<img alt='' border='0' src='https://www.paypalobjects.com/en_US/i/scr/pixel.gif' width='1' height='1'>"+
          "</form>"
      }
    ]
  }
});