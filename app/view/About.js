Ext.define('Events.view.About', {
  extend: 'Ext.Panel',
  alias: 'widget.aboutview',
  requires: ['Ext.Panel', 'Ux.layout.Accordion', 'Events.store.Sources'],

  config: {
    fullscreen : true,
    layout: {
      type: 'accordion',
      mode: 'SINGLE',
      toggleOnTitlebar: true,
      store: null
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
        title: 'Help!',
        cls: 'staticScreen',
        html: 
          "<p>Having issues? Sorry to hear that. Feel free to <a href='https://github.com/jakerella/eventsforme/issues' target='_blank'>submit an issue</a> on our github page and we'll try to get to it as soon as possible!</p>"
      },
      {
        xtype: 'panel',
        title: 'Who did this?',
        cls: 'staticScreen',
        html: 
          "<p>This app was written in the Sencha Touch 2 framework for the <a href='http://www.sencha.com/html5-is-ready' target='_blank'>HTML5 Is Ready</a> contest sponsored by <a href='http://www.sencha.com/' target='_blank'>Sencha</a>. Initially the app was written in only two weeks, and by one developer (<a href='http://jordankasper.com' target='_blank'>me</a>!).</p>"+
          "<p>All of the source code is open and up on <a href='https://github.com/jakerella/eventsforme' target='_blank'>github</a>. If you want to help make the app better (by adding new event sources, adding a theme, or anything else), just fork the project and submit a pull request!</p>"+
          "<p>If you are having an issue, please <a href='https://github.com/jakerella/eventsforme/issues' target='_blank'>submit a ticket on github</a>!</p>"+
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
      },
      {
        xtype: 'panel',
        id: 'event-source-list',
        title: 'Where do you get event info?',
        cls: 'staticScreen',
        html: 
          "<p>Our event listings come from all over the web, and we're adding more soon! In the future, you may be able to add your own events as well!</p>"+
          "<p>Currently we are pulling events from:</p>"+
          "<ul id='eventSourceList'>"+
            "<li><a href='http://meetup.com' target='_blank'>Meetup.com</a></li>"+
            "<li><a href='http://eventbrite.com' target='_blank'>Eventbrite.com</a></li>"+
          "</ul>"
      },
      {
        xtype: 'panel',
        title: 'Geeky Details',
        cls: 'staticScreen',
        html: 
          "<p>EventsFor.Me is built using <a href='http://www.sencha.com/products/touch/' target='_blank'>Sencha Touch 2</a>, an advanced HTML5 mobile web application framework. (Originally it was built for Sencha's <a href='http://www.sencha.com/html5-is-ready'>HTML5 is Ready</a> contest.)</p>"+
          "<p>All of the source code for the site is on <a href='https://github.com/jakerella/eventsforme' target='_blank'>github</a> in case you are intersted in contributing a bit of code, or if you find an issue. The app makes use of the Geolocation and LocalStorage features of modern browsers, as well as advanced CSS and JavaScript features.</p>"
      }
    ]
  }

});